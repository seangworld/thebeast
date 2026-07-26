"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminFeedbackStatuses,
  buildBeastAdminFeedbackCounts,
  feedbackStatusRequiresRoadmap,
  filterBeastAdminFeedbackItems,
  normalizeBeastAdminFeedbackItems,
  type BeastAdminFeedbackItem,
  type BeastAdminFeedbackStatus,
} from "@/lib/beastAdminFeedback";
import {
  beastAdminRoadmapProducts,
  normalizeBeastAdminRoadmapRow,
  type BeastAdminRoadmapItem,
  type BeastAdminRoadmapRow,
} from "@/lib/beastAdminRoadmap";
import { createClient } from "@/lib/supabase/client";

type FeedbackDraft = {
  status: BeastAdminFeedbackStatus;
  roadmapItemId: string;
  ownerResponse: string;
};

const inputClassName =
  "min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15";

const statusClasses: Record<BeastAdminFeedbackStatus, string> = {
  New: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  Acknowledged: "border-indigo-300/35 bg-indigo-300/10 text-indigo-100",
  Planned: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  "In Progress": "border-amber-300/35 bg-amber-300/10 text-amber-100",
  Released: "border-green-300/35 bg-green-300/10 text-green-100",
  Declined: "border-slate-300/30 bg-slate-300/10 text-slate-200",
};

function buildDraft(item: BeastAdminFeedbackItem): FeedbackDraft {
  return {
    status: item.status,
    roadmapItemId: item.roadmapItem?.id || "",
    ownerResponse: item.ownerResponse,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function humanizeFeedbackError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (
    /get_beast_admin_beta_feedback|update_beast_admin_feedback|beast_member_notifications|roadmap_item_id|schema cache|function .* does not exist/i.test(
      message
    )
  ) {
    return "Beta feedback management is not available yet. Apply the BA-105 Supabase migration, then retry.";
  }
  if (/roadmap item is required|23514/i.test(message)) {
    return "Link a roadmap item before moving feedback into Planned, In Progress, or Released.";
  }
  if (/permission|owner access|required|42501|row-level security/i.test(message)) {
    return "Beta feedback management is restricted to the Beast owner.";
  }
  if (/no longer available|P0002/i.test(message)) {
    return "That feedback item is no longer available. Refresh the queue.";
  }

  return "BeastAdmin could not save the feedback change. Your selections are still here so you can retry.";
}

function roadmapProductName(item: BeastAdminRoadmapItem) {
  return (
    beastAdminRoadmapProducts.find(
      (product) => product.id === item.productId
    )?.name || item.productId
  );
}

export function BeastAdminFeedbackWorkspace() {
  const [items, setItems] = useState<BeastAdminFeedbackItem[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<BeastAdminRoadmapItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FeedbackDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    BeastAdminFeedbackStatus | "all"
  >("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadFeedback() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();
        const [feedbackResult, roadmapResult] = await Promise.all([
          supabase.rpc("get_beast_admin_beta_feedback"),
          supabase
            .from("beast_admin_roadmap_items")
            .select(
              "id,user_id,product_id,title,summary,status,owner_notes,created_at,updated_at"
            )
            .order("updated_at", { ascending: false }),
        ]);

        if (feedbackResult.error) throw feedbackResult.error;
        if (roadmapResult.error) throw roadmapResult.error;

        const feedback = normalizeBeastAdminFeedbackItems(feedbackResult.data);
        if (!feedback) throw new Error("Feedback data was invalid.");
        const roadmap = ((roadmapResult.data || []) as BeastAdminRoadmapRow[])
          .map(normalizeBeastAdminRoadmapRow)
          .filter((item): item is BeastAdminRoadmapItem => Boolean(item));
        if (!active) return;

        setItems(feedback);
        setRoadmapItems(roadmap);
        setDrafts(
          Object.fromEntries(feedback.map((item) => [item.id, buildDraft(item)]))
        );
      } catch (loadError) {
        if (active) setError(humanizeFeedbackError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFeedback();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const visibleItems = useMemo(
    () =>
      filterBeastAdminFeedbackItems(items, {
        status: statusFilter,
        query,
      }),
    [items, query, statusFilter]
  );
  const counts = useMemo(() => buildBeastAdminFeedbackCounts(items), [items]);

  function updateDraft(
    id: string,
    field: keyof FeedbackDraft,
    value: string
  ) {
    setError("");
    setNotice("");
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }));
  }

  async function reloadFeedback() {
    const supabase = createClient();
    const { data, error: feedbackError } = await supabase.rpc(
      "get_beast_admin_beta_feedback"
    );
    if (feedbackError) throw feedbackError;
    const feedback = normalizeBeastAdminFeedbackItems(data);
    if (!feedback) throw new Error("Feedback data was invalid.");

    setItems(feedback);
    setDrafts(
      Object.fromEntries(feedback.map((item) => [item.id, buildDraft(item)]))
    );
  }

  async function saveFeedback(item: BeastAdminFeedbackItem) {
    const draft = drafts[item.id];
    if (!draft) return;
    setError("");
    setNotice("");

    if (feedbackStatusRequiresRoadmap(draft.status) && !draft.roadmapItemId) {
      setError(
        "Link a roadmap item before moving feedback into Planned, In Progress, or Released."
      );
      return;
    }

    setSavingId(item.id);
    try {
      const supabase = createClient();
      const { data, error: saveError } = await supabase.rpc(
        "update_beast_admin_feedback",
        {
          selected_feedback_id: item.id,
          next_status: draft.status,
          selected_roadmap_item_id: draft.roadmapItemId || null,
          response: draft.ownerResponse,
        }
      );
      if (saveError) throw saveError;

      await reloadFeedback();
      const notificationCreated =
        data &&
        typeof data === "object" &&
        "notificationCreated" in data &&
        data.notificationCreated === true;
      setNotice(
        draft.status === "Released"
          ? notificationCreated
            ? `${item.memberName} was notified that this feedback was implemented.`
            : "Feedback marked Released. No authenticated member account was attached, so no notification was sent."
          : `Feedback moved to ${draft.status}.`
      );
    } catch (saveError) {
      setError(humanizeFeedbackError(saveError));
    } finally {
      setSavingId("");
    }
  }

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Beta Feedback"
          title="Loading the feedback lifecycle"
          description="BeastAdmin is retrieving authenticated member feedback and roadmap links."
        />
        <div className="mt-5 grid gap-3" aria-busy="true">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
            />
          ))}
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        aria-label="Feedback lifecycle summary"
      >
        {beastAdminFeedbackStatuses.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={statusFilter === status}
            onClick={() =>
              setStatusFilter((current) =>
                current === status ? "all" : status
              )
            }
            className={`rounded-xl border p-4 text-left transition hover:border-amber-200 ${
              statusFilter === status
                ? "border-amber-200 bg-amber-200/15"
                : "border-[#2a3242] bg-[#111827]"
            }`}
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
              {status}
            </p>
            <p className="mt-2 text-3xl font-black text-white">
              {counts[status]}
            </p>
          </button>
        ))}
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Close the Loop"
          title="Every response has a visible outcome"
          description="Acknowledgement confirms review. Delivery states require a direct roadmap link. Released feedback creates one durable member notification without exposing private owner notes."
          action={
            <Link href="/dashboard/admin/roadmap" className="beast-button">
              Manage Roadmap
            </Link>
          }
        />
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
            Search feedback
            <input
              type="search"
              className={inputClassName}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Member, feedback, category, or roadmap item"
            />
          </label>
          <button
            type="button"
            className="beast-button self-end"
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            Refresh
          </button>
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-300/35 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className="mt-4 rounded-lg border border-green-300/35 bg-green-300/10 px-4 py-3 text-sm font-bold text-green-100"
          >
            {notice}
          </p>
        ) : null}
      </DashboardCard>

      <section className="grid gap-4" aria-label="Beta feedback queue">
        {visibleItems.map((item) => {
          const draft = drafts[item.id] || buildDraft(item);
          const selectedRoadmap = roadmapItems.find(
            (roadmapItem) => roadmapItem.id === draft.roadmapItemId
          );
          const hasChanges =
            draft.status !== item.status ||
            draft.roadmapItemId !== (item.roadmapItem?.id || "") ||
            draft.ownerResponse !== item.ownerResponse;

          return (
            <DashboardCard key={item.id} accent="admin">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClasses[item.status]}`}
                    >
                      {item.status}
                    </span>
                    <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]">
                      {item.category}
                    </span>
                    <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]">
                      {item.context || "BeastEducation feedback"}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-black text-white">
                    {item.memberName}
                  </h2>
                  <p className="mt-1 text-xs text-[#7f8da3]">
                    {item.memberEmail || "No authenticated email available"} ·{" "}
                    {formatDate(item.submittedAt)}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#dbe3ef]">
                    {item.message}
                  </p>
                  {item.roadmapItem ? (
                    <div className="mt-4 rounded-xl border border-purple-300/25 bg-purple-300/10 p-3">
                      <p className="text-xs font-black uppercase text-purple-100">
                        Linked roadmap item
                      </p>
                      <p className="mt-1 font-bold text-white">
                        {item.roadmapItem.title}
                      </p>
                    </div>
                  ) : null}
                  {item.memberNotifiedAt ? (
                    <p className="mt-4 text-xs font-bold text-green-200">
                      Member notified {formatDate(item.memberNotifiedAt)}
                    </p>
                  ) : null}
                </div>

                <div className="grid w-full gap-4 xl:max-w-xl xl:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                    Lifecycle status
                    <select
                      className={inputClassName}
                      value={draft.status}
                      onChange={(event) =>
                        updateDraft(item.id, "status", event.target.value)
                      }
                    >
                      {beastAdminFeedbackStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                    Roadmap item
                    <select
                      className={inputClassName}
                      value={draft.roadmapItemId}
                      onChange={(event) =>
                        updateDraft(
                          item.id,
                          "roadmapItemId",
                          event.target.value
                        )
                      }
                    >
                      <option value="">Not linked</option>
                      {roadmapItems.map((roadmapItem) => (
                        <option key={roadmapItem.id} value={roadmapItem.id}>
                          {roadmapProductName(roadmapItem)} — {roadmapItem.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#dbe3ef] xl:col-span-2">
                    Member update
                    <textarea
                      className={`${inputClassName} min-h-24 resize-y`}
                      value={draft.ownerResponse}
                      maxLength={600}
                      onChange={(event) =>
                        updateDraft(
                          item.id,
                          "ownerResponse",
                          event.target.value
                        )
                      }
                      placeholder="Optional acknowledgement or release note visible to the member when implemented."
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-3 xl:col-span-2">
                    <p className="text-xs leading-5 text-[#9aa7b8]">
                      {feedbackStatusRequiresRoadmap(draft.status)
                        ? selectedRoadmap
                          ? `Delivery tracked through ${selectedRoadmap.title}.`
                          : "This status requires a roadmap link."
                        : "A roadmap link is optional at this stage."}
                      {draft.status === "Released"
                        ? " Saving will notify the submitting member."
                        : ""}
                    </p>
                    <button
                      type="button"
                      className="beast-button"
                      disabled={!hasChanges || savingId === item.id}
                      onClick={() => saveFeedback(item)}
                    >
                      {savingId === item.id ? "Saving…" : "Save feedback"}
                    </button>
                  </div>
                </div>
              </div>
            </DashboardCard>
          );
        })}
        {!visibleItems.length ? (
          <DashboardCard accent="admin">
            <div className="py-8 text-center">
              <p className="beast-kicker">Feedback queue</p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {items.length
                  ? "No feedback matches these filters"
                  : "No authenticated beta feedback yet"}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl leading-7 text-[#9aa7b8]">
                {items.length
                  ? "Clear the search or lifecycle filter to return to the full queue."
                  : "New member submissions will appear here without configured sample feedback."}
              </p>
            </div>
          </DashboardCard>
        ) : null}
      </section>
    </div>
  );
}
