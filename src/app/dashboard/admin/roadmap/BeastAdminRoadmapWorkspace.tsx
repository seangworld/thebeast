"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminRoadmapProducts,
  beastAdminRoadmapStatusLabels,
  beastAdminRoadmapStatuses,
  buildBeastAdminRoadmapCounts,
  filterBeastAdminRoadmapItems,
  getBeastAdminRoadmapLifecyclePosition,
  getBeastAdminRoadmapProduct,
  normalizeBeastAdminRoadmapRow,
  type BeastAdminRoadmapItem,
  type BeastAdminRoadmapProductId,
  type BeastAdminRoadmapRow,
  type BeastAdminRoadmapStatus,
} from "@/lib/beastAdminRoadmap";
import { createClient } from "@/lib/supabase/client";

const inputClassName =
  "min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15";

const statusClasses: Record<BeastAdminRoadmapStatus, string> = {
  planned: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  in_progress: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  testing: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  released: "border-green-300/35 bg-green-300/10 text-green-100",
  archived: "border-slate-300/25 bg-slate-300/10 text-slate-200",
};

type NewRoadmapItem = {
  productId: BeastAdminRoadmapProductId;
  title: string;
  summary: string;
  status: BeastAdminRoadmapStatus;
  ownerNotes: string;
};

const emptyNewItem: NewRoadmapItem = {
  productId: "beastos",
  title: "",
  summary: "",
  status: "planned",
  ownerNotes: "",
};

function humanizeRoadmapError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (
    /beast_admin_roadmap_items|schema cache|relation .* does not exist/i.test(
      message
    )
  ) {
    return "Roadmap storage is not available yet. Verify BA-RDM-101 using 20260726000000_add_beast_admin_product_roadmap.sql, then retry.";
  }

  if (/row-level security|permission|policy/i.test(message)) {
    return "BeastAdmin could not save this roadmap item with the current owner permissions.";
  }

  return "BeastAdmin could not save the roadmap change. Your edits are still here so you can retry.";
}

function StatusProgress({ status }: { status: BeastAdminRoadmapStatus }) {
  const position = getBeastAdminRoadmapLifecyclePosition(status);

  return (
    <div aria-label={`Progress: ${position.label}`}>
      <div className="grid grid-cols-4 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((stage) => (
          <span
            key={stage}
            className={`h-1.5 rounded-full ${
              status !== "archived" && stage <= position.current
                ? "bg-amber-300"
                : "bg-[#2a3242]"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-[#7f8da3]">{position.label}</p>
    </div>
  );
}

export function BeastAdminRoadmapWorkspace() {
  const [items, setItems] = useState<BeastAdminRoadmapItem[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, BeastAdminRoadmapItem>
  >({});
  const [ownerId, setOwnerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState("");
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<NewRoadmapItem>(emptyNewItem);
  const [productFilter, setProductFilter] = useState<
    BeastAdminRoadmapProductId | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    BeastAdminRoadmapStatus | "all"
  >("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRoadmap() {
      setLoading(true);
      setLoadError("");

      try {
        const supabase = createClient();
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError) throw userError;
        const userId = userData.user?.id;
        if (!userId) throw new Error("Owner session is not available.");
        if (active) setOwnerId(userId);

        const { data, error } = await supabase
          .from("beast_admin_roadmap_items")
          .select(
            "id,user_id,product_id,title,summary,status,owner_notes,created_at,updated_at"
          )
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });
        if (error) throw error;

        const normalized = ((data || []) as BeastAdminRoadmapRow[])
          .map(normalizeBeastAdminRoadmapRow)
          .filter((item): item is BeastAdminRoadmapItem => Boolean(item));

        if (!active) return;
        setItems(normalized);
        setDrafts(
          Object.fromEntries(normalized.map((item) => [item.id, item]))
        );
      } catch (error) {
        if (active) setLoadError(humanizeRoadmapError(error));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRoadmap();

    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(
    () =>
      filterBeastAdminRoadmapItems(Object.values(drafts), {
        productId: productFilter,
        status: statusFilter,
        query,
      }).sort(
        (left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) ||
          left.title.localeCompare(right.title)
      ),
    [drafts, productFilter, query, statusFilter]
  );
  const counts = useMemo(
    () => buildBeastAdminRoadmapCounts(items),
    [items]
  );

  function updateDraft(
    id: string,
    field: "title" | "summary" | "status" | "ownerNotes",
    value: string
  ) {
    setNotice("");
    setDrafts((current) => {
      const item = current[id];
      if (!item) return current;
      return {
        ...current,
        [id]: {
          ...item,
          [field]: value,
        },
      };
    });
  }

  async function addRoadmapItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setLoadError("");

    if (!newItem.title.trim()) {
      setLoadError("Enter a feature name before adding it to the roadmap.");
      return;
    }
    if (!ownerId) {
      setLoadError("The owner session is not ready. Refresh and try again.");
      return;
    }

    setAdding(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("beast_admin_roadmap_items")
        .insert({
          user_id: ownerId,
          product_id: newItem.productId,
          title: newItem.title.trim(),
          summary: newItem.summary.trim(),
          status: newItem.status,
          owner_notes: newItem.ownerNotes.trim(),
        })
        .select(
          "id,user_id,product_id,title,summary,status,owner_notes,created_at,updated_at"
        )
        .single();
      if (error) throw error;

      const saved = normalizeBeastAdminRoadmapRow(
        data as BeastAdminRoadmapRow
      );
      if (!saved) throw new Error("Saved roadmap data was invalid.");

      setItems((current) => [saved, ...current]);
      setDrafts((current) => ({ ...current, [saved.id]: saved }));
      setNewItem(emptyNewItem);
      setNotice(`Added “${saved.title}” to the ${getBeastAdminRoadmapProduct(saved.productId)?.name} roadmap.`);
    } catch (error) {
      setLoadError(humanizeRoadmapError(error));
    } finally {
      setAdding(false);
    }
  }

  async function saveRoadmapItem(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setNotice("");
    setLoadError("");

    if (!draft.title.trim()) {
      setLoadError("A roadmap feature must have a name.");
      return;
    }

    setSavingId(id);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("beast_admin_roadmap_items")
        .update({
          title: draft.title.trim(),
          summary: draft.summary.trim(),
          status: draft.status,
          owner_notes: draft.ownerNotes.trim(),
        })
        .eq("id", id)
        .eq("user_id", ownerId)
        .select(
          "id,user_id,product_id,title,summary,status,owner_notes,created_at,updated_at"
        )
        .single();
      if (error) throw error;

      const saved = normalizeBeastAdminRoadmapRow(
        data as BeastAdminRoadmapRow
      );
      if (!saved) throw new Error("Saved roadmap data was invalid.");

      setItems((current) =>
        current.map((item) => (item.id === id ? saved : item))
      );
      setDrafts((current) => ({ ...current, [id]: saved }));
      setNotice(`Saved “${saved.title}”.`);
    } catch (error) {
      setLoadError(humanizeRoadmapError(error));
    } finally {
      setSavingId("");
    }
  }

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Product Roadmap"
          title="Loading owner roadmap"
          description="BeastAdmin is retrieving the durable feature plan and private owner notes."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-busy="true">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
            />
          ))}
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Roadmap status summary">
        {beastAdminRoadmapStatuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() =>
              setStatusFilter((current) => (current === status ? "all" : status))
            }
            aria-pressed={statusFilter === status}
            className={`rounded-xl border p-4 text-left transition hover:border-amber-200 ${
              statusFilter === status
                ? "border-amber-200 bg-amber-200/15"
                : "border-[#2a3242] bg-[#111827]"
            }`}
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
              {beastAdminRoadmapStatusLabels[status]}
            </p>
            <p className="mt-2 text-3xl font-black text-white">{counts[status]}</p>
          </button>
        ))}
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Delivery Portfolio"
          title="Every product has one place"
          description="Canonical versions are shown where Beast has them. Feature plans and owner notes remain owner-managed; BeastAdmin does not invent missing product status."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {beastAdminRoadmapProducts.map((product) => {
            const productItems = items.filter(
              (item) => item.productId === product.id
            );
            const activeCount = productItems.filter(
              (item) => item.status !== "archived"
            ).length;

            return (
              <button
                key={product.id}
                type="button"
                onClick={() =>
                  setProductFilter((current) =>
                    current === product.id ? "all" : product.id
                  )
                }
                aria-pressed={productFilter === product.id}
                className={`rounded-xl border p-4 text-left transition hover:border-amber-200 ${
                  productFilter === product.id
                    ? "border-amber-200 bg-amber-200/15"
                    : "border-[#2a3242] bg-[#111827]"
                }`}
              >
                <p className="font-black text-white">{product.name}</p>
                <p className="mt-1 text-xs text-[#7f8da3]">
                  {product.currentVersion || "Version not registered"}
                </p>
                <p className="mt-3 text-sm font-bold text-[#dbe3ef]">
                  {activeCount} active · {productItems.length} total
                </p>
              </button>
            );
          })}
        </div>
      </DashboardCard>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Add Feature"
          title="Capture the next piece of work"
          description="Add only confirmed work. Lifecycle progress is stage-based and never presented as an unsupported completion estimate."
        />
        <form onSubmit={addRoadmapItem} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              Product
              <select
                className={inputClassName}
                value={newItem.productId}
                onChange={(event) =>
                  setNewItem((current) => ({
                    ...current,
                    productId: event.target
                      .value as BeastAdminRoadmapProductId,
                  }))
                }
              >
                {beastAdminRoadmapProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef] md:col-span-1 xl:col-span-2">
              Feature
              <input
                className={inputClassName}
                value={newItem.title}
                maxLength={160}
                placeholder="Example: Cross-product release view"
                onChange={(event) =>
                  setNewItem((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              Status
              <select
                className={inputClassName}
                value={newItem.status}
                onChange={(event) =>
                  setNewItem((current) => ({
                    ...current,
                    status: event.target.value as BeastAdminRoadmapStatus,
                  }))
                }
              >
                {beastAdminRoadmapStatuses.map((status) => (
                  <option key={status} value={status}>
                    {beastAdminRoadmapStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              Outcome
              <textarea
                className={inputClassName}
                value={newItem.summary}
                rows={3}
                maxLength={800}
                placeholder="What will be true when this feature is complete?"
                onChange={(event) =>
                  setNewItem((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              Owner notes
              <textarea
                className={inputClassName}
                value={newItem.ownerNotes}
                rows={3}
                maxLength={2000}
                placeholder="Private decisions, dependencies, or release context"
                onChange={(event) =>
                  setNewItem((current) => ({
                    ...current,
                    ownerNotes: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div>
            <button
              type="submit"
              disabled={adding}
              className="beast-button disabled:cursor-not-allowed disabled:opacity-60"
            >
              {adding ? "Adding…" : "Add to roadmap"}
            </button>
          </div>
        </form>
      </DashboardCard>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Roadmap"
          title="Filter, review, and move work forward"
          description={`${visibleItems.length} of ${items.length} feature${items.length === 1 ? "" : "s"} shown.`}
        />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
            Product
            <select
              className={inputClassName}
              value={productFilter}
              onChange={(event) =>
                setProductFilter(
                  event.target.value as BeastAdminRoadmapProductId | "all"
                )
              }
            >
              <option value="all">All products</option>
              {beastAdminRoadmapProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
            Status
            <select
              className={inputClassName}
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as BeastAdminRoadmapStatus | "all"
                )
              }
            >
              <option value="all">All statuses</option>
              {beastAdminRoadmapStatuses.map((status) => (
                <option key={status} value={status}>
                  {beastAdminRoadmapStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
            Search
            <input
              type="search"
              className={inputClassName}
              value={query}
              placeholder="Feature, outcome, or owner note"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div aria-live="polite" className="mt-4">
          {loadError ? (
            <div className="rounded-xl border border-red-400/35 bg-red-400/10 p-4 text-sm font-bold text-red-100">
              {loadError}
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-xl border border-green-400/35 bg-green-400/10 p-4 text-sm font-bold text-green-100">
              {notice}
            </div>
          ) : null}
        </div>

        {visibleItems.length ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {visibleItems.map((item) => {
              const product = getBeastAdminRoadmapProduct(item.productId);
              const savedItem = items.find((saved) => saved.id === item.id);
              const dirty =
                savedItem && JSON.stringify(savedItem) !== JSON.stringify(item);

              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-amber-100">
                        {product?.name || item.productId}
                      </p>
                      <p className="mt-1 text-xs text-[#7f8da3]">
                        Updated{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(item.updatedAt))}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClasses[item.status]}`}
                    >
                      {beastAdminRoadmapStatusLabels[item.status]}
                    </span>
                  </div>
                  <div className="mt-4">
                    <StatusProgress status={item.status} />
                  </div>
                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                      Feature
                      <input
                        className={inputClassName}
                        value={item.title}
                        maxLength={160}
                        onChange={(event) =>
                          updateDraft(
                            item.id,
                            "title",
                            event.target.value
                          )
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                      Status
                      <select
                        className={inputClassName}
                        value={item.status}
                        onChange={(event) =>
                          updateDraft(
                            item.id,
                            "status",
                            event.target.value
                          )
                        }
                      >
                        {beastAdminRoadmapStatuses.map((status) => (
                          <option key={status} value={status}>
                            {beastAdminRoadmapStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                      Outcome
                      <textarea
                        className={inputClassName}
                        value={item.summary}
                        rows={3}
                        maxLength={800}
                        onChange={(event) =>
                          updateDraft(
                            item.id,
                            "summary",
                            event.target.value
                          )
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                      Owner notes
                      <textarea
                        className={inputClassName}
                        value={item.ownerNotes}
                        rows={4}
                        maxLength={2000}
                        onChange={(event) =>
                          updateDraft(
                            item.id,
                            "ownerNotes",
                            event.target.value
                          )
                        }
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={!dirty || savingId === item.id}
                      onClick={() => saveRoadmapItem(item.id)}
                      className="beast-button disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingId === item.id ? "Saving…" : "Save changes"}
                    </button>
                    <p className="text-xs font-bold text-[#9aa7b8]">
                      {dirty ? "Unsaved changes" : "Saved"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-[#3b4659] bg-[#111827] p-8 text-center">
            <h3 className="text-xl font-black text-white">
              {items.length
                ? "No roadmap features match these filters"
                : "The owner roadmap is ready for its first feature"}
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#9aa7b8]">
              {items.length
                ? "Change or clear the product, status, and search filters to review other work."
                : "Add confirmed work above. BeastAdmin starts empty rather than inventing feature status or owner decisions."}
            </p>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
