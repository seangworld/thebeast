"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  GuidedEmptyState,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { createClient } from "@/lib/supabase/client";
import { sendFirstPartyTelemetry } from "@/lib/firstPartyTelemetry";

type Draft = {
  name: string;
  quantity: number;
  details: string;
  value: string;
  receiptDocumentId: string;
  keep: boolean;
};
type DocumentOption = { id: string; title: string };
type Saved = {
  id: string;
  name: string;
  quantity: number;
  details: string | null;
  estimated_value_cents: number | null;
  beast_home_inventory_rooms: { name: string } | null;
  beast_documents: { title: string } | null;
};

export function BeastHomeInventoryWorkspace() {
  const [userId, setUserId] = useState("");
  const [room, setRoom] = useState("Living room");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user?.id ?? "";
    setUserId(id);
    if (!id) return;
    const [{ data }, { data: documentRows }] = await Promise.all([
      supabase
        .from("beast_home_inventory_items")
        .select(
          "id,name,quantity,details,estimated_value_cents,beast_home_inventory_rooms(name),beast_documents!beast_home_inventory_items_receipt_owner_fk(title)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("beast_documents")
        .select("id,title")
        .eq("owner_id", id)
        .not("status", "in", '("Archived","Deleted")')
        .order("updated_at", { ascending: false }),
    ]);
    setSaved((data ?? []) as unknown as Saved[]);
    setDocuments((documentRows ?? []) as DocumentOption[]);
  }, [supabase]);
  useEffect(() => {
    void load();
    void sendFirstPartyTelemetry({ eventName: "home_inventory_opened", moduleId: "home", outcome: "completed" });
  }, [load]);

  async function detect(file?: File) {
    if (!file) return;
    if (
      file.size > 3_000_000 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setMessage("Use a JPG, PNG, or WebP image up to 3 MB.");
      return;
    }
    setBusy(true);
    setMessage("Reviewing the private photo…");
    void sendFirstPartyTelemetry({ eventName: "home_inventory_started", moduleId: "home", outcome: "started" });
    const image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const response = await fetch("/api/home/inventory/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, room }),
    });
    const body = (await response.json()) as {
      items?: Array<{ name: string; quantity: number; details: string }>;
      error?: string;
    };
    if (!response.ok) setMessage(body.error || "Photo detection failed.");
    else {
      setDrafts(
        (body.items ?? []).map((item) => ({ ...item, value: "", receiptDocumentId: "", keep: true })),
      );
      setMessage(
        "AI suggestions are not saved yet. Edit, remove, and confirm them first.",
      );
    }
    setBusy(false);
  }

  async function save() {
    const selected = drafts.filter((item) => item.keep && item.name.trim());
    if (!userId || !selected.length) return;
    setBusy(true);
    setMessage("Saving confirmed items…");
    let { data: inventory } = await supabase
      .from("beast_home_inventories")
      .select("id")
      .order("inventory_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!inventory) {
      const created = await supabase
        .from("beast_home_inventories")
        .insert({ owner_id: userId, name: "My home inventory" })
        .select("id")
        .single();
      inventory = created.data;
    }
    if (!inventory) {
      setMessage("The inventory could not be created.");
      setBusy(false);
      return;
    }
    let { data: roomRow } = await supabase
      .from("beast_home_inventory_rooms")
      .select("id")
      .eq("inventory_id", inventory.id)
      .eq("name", room.trim())
      .maybeSingle();
    if (!roomRow) {
      const created = await supabase
        .from("beast_home_inventory_rooms")
        .insert({
          owner_id: userId,
          inventory_id: inventory.id,
          name: room.trim() || "Room",
        })
        .select("id")
        .single();
      roomRow = created.data;
    }
    if (!roomRow) {
      setMessage("The room could not be created.");
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("beast_home_inventory_items")
      .insert(
        selected.map((item) => ({
          owner_id: userId,
          inventory_id: inventory!.id,
          room_id: roomRow!.id,
          name: item.name.trim(),
          quantity: item.quantity,
          details: item.details.trim() || null,
          estimated_value_cents: item.value
            ? Math.round(Number(item.value) * 100)
            : null,
          receipt_document_id: item.receiptDocumentId || null,
        })),
      );
    if (error) setMessage("Confirmed items could not be saved.");
    else {
      setDrafts([]);
      setMessage(
        `${selected.length} confirmed item${selected.length === 1 ? "" : "s"} saved.`,
      );
      void sendFirstPartyTelemetry({ eventName: "home_inventory_confirmed", moduleId: "home", outcome: "completed" });
      await load();
    }
    setBusy(false);
  }

  function exportCsv() {
    const rows = [
      ["Room", "Item", "Quantity", "Details", "Estimated value", "Receipt document"],
      ...saved.map((item) => [
        item.beast_home_inventory_rooms?.name || "",
        item.name,
        String(item.quantity),
        item.details || "",
        item.estimated_value_cents == null
          ? ""
          : (item.estimated_value_cents / 100).toFixed(2),
        item.beast_documents?.title || "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `beast-home-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    void sendFirstPartyTelemetry({ eventName: "home_inventory_exported", moduleId: "home", outcome: "completed" });
  }

  return (
    <div className="space-y-6">
      <DashboardCard accent="home">
        <SectionHeader
          eyebrow="Photo to inventory"
          title="Start with one room"
          description="Your photo is sent privately for one-time item suggestions and is not saved by this workflow. Nothing enters your inventory until you confirm it."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr]" data-tour-step="home-inventory-photo">
          <label className="text-sm font-semibold text-[#dbe3ef]">
            Room name
            <input
              className="mt-2 w-full rounded-xl border border-[#334155] bg-[#0f172a] p-3"
              value={room}
              onChange={(event) => setRoom(event.target.value.slice(0, 80))}
            />
          </label>
          <label className="text-sm font-semibold text-[#dbe3ef]">
            Room photo
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => void detect(event.target.files?.[0])}
            />
          </label>
        </div>
        {message && (
          <p
            className="mt-4 rounded-xl border border-[#334155] p-3 text-sm text-[#dbe3ef]"
            role="status"
          >
            {message}
          </p>
        )}
      </DashboardCard>
      {drafts.length > 0 && (
        <DashboardCard accent="home">
          <SectionHeader
            eyebrow="Review required"
            title="Confirm what the photo actually shows"
          description="Correct names and quantities, add optional values or a private receipt document, and uncheck anything AI got wrong."
          />
          <div className="mt-5 space-y-3" data-tour-step="home-inventory-review">
            {drafts.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="grid gap-3 rounded-xl border border-[#334155] p-4 md:grid-cols-[auto_1.1fr_80px_1.3fr_110px_1fr]"
              >
                <input
                  aria-label={`Keep ${item.name}`}
                  type="checkbox"
                  checked={item.keep}
                  onChange={(event) =>
                    setDrafts((all) =>
                      all.map((x, i) =>
                        i === index ? { ...x, keep: event.target.checked } : x,
                      ),
                    )
                  }
                />
                <select
                  aria-label="Receipt or document"
                  className="rounded-lg bg-[#0f172a] p-2"
                  value={item.receiptDocumentId}
                  onChange={(event) =>
                    setDrafts((all) =>
                      all.map((x, i) =>
                        i === index ? { ...x, receiptDocumentId: event.target.value } : x,
                      ),
                    )
                  }
                >
                  <option value="">No receipt</option>
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>{document.title}</option>
                  ))}
                </select>
                <input
                  aria-label="Item name"
                  className="rounded-lg bg-[#0f172a] p-2"
                  value={item.name}
                  onChange={(event) =>
                    setDrafts((all) =>
                      all.map((x, i) =>
                        i === index ? { ...x, name: event.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label="Quantity"
                  type="number"
                  min="1"
                  className="rounded-lg bg-[#0f172a] p-2"
                  value={item.quantity}
                  onChange={(event) =>
                    setDrafts((all) =>
                      all.map((x, i) =>
                        i === index
                          ? {
                              ...x,
                              quantity: Math.max(
                                1,
                                Number(event.target.value) || 1,
                              ),
                            }
                          : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label="Identifying details"
                  className="rounded-lg bg-[#0f172a] p-2"
                  value={item.details}
                  onChange={(event) =>
                    setDrafts((all) =>
                      all.map((x, i) =>
                        i === index ? { ...x, details: event.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label="Estimated value"
                  inputMode="decimal"
                  placeholder="$ value"
                  className="rounded-lg bg-[#0f172a] p-2"
                  value={item.value}
                  onChange={(event) =>
                    setDrafts((all) =>
                      all.map((x, i) =>
                        i === index
                          ? {
                              ...x,
                              value: event.target.value.replace(/[^0-9.]/g, ""),
                            }
                          : x,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <button
            className="beast-button-primary mt-5"
            disabled={busy}
            onClick={() => void save()}
          >
            Confirm and save selected items
          </button>
        </DashboardCard>
      )}
      <DashboardCard accent="home">
        <SectionHeader
          eyebrow="Dated inventory"
          title={`${saved.length} confirmed item${saved.length === 1 ? "" : "s"}`}
          description="Only items you confirmed appear here. Linked receipts stay in your private Beast Documents, and the dated CSV gives you an offline record."
        />
        <div data-tour-step="home-inventory-export">
        {saved.length === 0 ? (
          <div className="mt-5">
            <GuidedEmptyState
              title="No inventory items yet"
              description="Take one clear room photo to begin."
              guidance="Photograph ordinary possessions in good light; avoid people, mail, screens, or sensitive documents."
              nextAction={{ label: "Choose a room photo", href: "#" }}
            />
          </div>
        ) : (
          <>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Details</th>
                    <th>Value</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {saved.map((item) => (
                    <tr key={item.id} className="border-t border-[#334155]">
                      <td className="py-3">
                        {item.beast_home_inventory_rooms?.name}
                      </td>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.details || "—"}</td>
                      <td>
                        {item.estimated_value_cents == null
                          ? "—"
                          : `$${(item.estimated_value_cents / 100).toFixed(2)}`}
                      </td>
                      <td>{item.beast_documents?.title || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="beast-button-secondary mt-5" onClick={exportCsv}>
              Export dated CSV
            </button>
          </>
        )}
        </div>
      </DashboardCard>
    </div>
  );
}
