"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  goalCategories,
  goalStatuses,
  type Goal,
  type GoalCategory,
  type GoalPriority,
  type GoalStatus,
} from "@/lib/platform/goals";
import {
  filterLifePlanningGoals,
  getGoalProvenanceLabel,
  lifePlanningCategories,
  professionalGoalAccess,
  rankGoalsForToday,
} from "@/lib/platform/lifePlanning";
import type { ContextualWorkspaceConfig } from "@/lib/platform/contextualWorkspaces";

const priorities: GoalPriority[] = ["Critical", "High", "Medium", "Low"];
const timelines = ["Now", "Next", "Later", "Someday"];
const professionals = Object.entries(professionalGoalAccess);

type GoalDraft = {
  title: string;
  category: GoalCategory;
  customCategory: string;
  description: string;
  status: GoalStatus;
  priority: GoalPriority;
  timeline: string;
  targetDate: string;
  progress: string;
  currentStep: string;
  linkedProfessional: string;
  notes: string;
  tags: string;
};

const emptyDraft: GoalDraft = {
  title: "",
  category: "Personal",
  customCategory: "",
  description: "",
  status: "Proposed",
  priority: "Medium",
  timeline: "Now",
  targetDate: "",
  progress: "",
  currentStep: "",
  linkedProfessional: "",
  notes: "",
  tags: "",
};

function draftFromGoal(goal: Goal): GoalDraft {
  return {
    title: goal.title,
    category: goal.category,
    customCategory: goal.customCategory || "",
    description: goal.description || goal.summary || "",
    status: goal.status,
    priority: goal.priority || "Medium",
    timeline: goal.timeline || "Now",
    targetDate: goal.targetDate || "",
    progress: goal.progress == null ? "" : String(goal.progress),
    currentStep: goal.currentStep || "",
    linkedProfessional: goal.linkedProfessional || "",
    notes: goal.notes || "",
    tags: (goal.tags || []).join(", "),
  };
}

function formatDate(value?: string) {
  if (!value) return "No target date";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function LifePlanningHub({
  initialGoals,
  context,
}: {
  initialGoals: Goal[];
  context?: ContextualWorkspaceConfig;
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [module, setModule] = useState("All");
  const [timeline, setTimeline] = useState("All");
  const [priority, setPriority] = useState("All");
  const [professional, setProfessional] = useState("All");
  const [status, setStatus] = useState("All");
  const [editing, setEditing] = useState<Goal | null | undefined>(undefined);
  const [draft, setDraft] = useState<GoalDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [milestoneTitles, setMilestoneTitles] = useState<Record<string, string>>({});
  const [splitSource, setSplitSource] = useState<Goal | null>(null);

  const filteredGoals = useMemo(
    () =>
      filterLifePlanningGoals(initialGoals, {
        search,
        category: category as Parameters<typeof filterLifePlanningGoals>[1]["category"],
        module: module as Parameters<typeof filterLifePlanningGoals>[1]["module"],
        timeline,
        priority: priority as GoalPriority | "All",
        professional,
        status: status as GoalStatus | "All",
      }),
    [initialGoals, search, category, module, timeline, priority, professional, status]
  );
  const todayPriorities = useMemo(
    () => rankGoalsForToday(initialGoals).slice(0, 3),
    [initialGoals]
  );

  function openEditor(goal?: Goal) {
    openerRef.current = document.activeElement as HTMLElement | null;
    setSplitSource(null);
    setEditing(goal || null);
    setDraft(
      goal
        ? draftFromGoal(goal)
        : context
          ? {
              ...emptyDraft,
              category: context.defaultGoalCategory,
              tags: context.tags[0],
            }
          : emptyDraft
    );
    setMessage("");
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  function closeEditor() {
    setEditing(undefined);
    setSplitSource(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  }

  async function ownerId() {
    const client = createClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error("Sign in to manage goals.");
    return { client, ownerId: data.user.id };
  }

  async function saveGoal() {
    if (!draft.title.trim()) {
      setMessage("Add a goal title before saving.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { client, ownerId: memberId } = await ownerId();
      const now = new Date().toISOString();
      const payload = {
        owner_id: memberId,
        title: draft.title.trim(),
        category: draft.category,
        custom_category:
          draft.category === "Other" ? draft.customCategory.trim() || null : null,
        summary: draft.description.trim() || null,
        description: draft.description.trim() || null,
        status: draft.status,
        priority: draft.priority,
        timeline: draft.timeline || null,
        target_date: draft.targetDate || null,
        progress: draft.progress === "" ? null : Number(draft.progress),
        current_step: draft.currentStep.trim() || null,
        linked_professional: draft.linkedProfessional || null,
        notes: draft.notes.trim() || null,
        tags: draft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        source_type: "member",
        source_label: "Member",
        ...(!editing && context ? { source_module: context.module } : {}),
        updated_at: now,
      };
      let goalId = editing?.id;
      if (editing) {
        const { error } = await client
          .from("beast_goals")
          .update(payload)
          .eq("id", editing.id)
          .eq("owner_id", memberId);
        if (error) throw error;
        const { error: lifecycleError } = await client
          .from("beast_goal_lifecycle_events")
          .insert({
            owner_id: memberId,
            goal_id: editing.id,
            event_type: "Revised",
            title: "Goal details revised",
            previous_status: editing.status,
            next_status: draft.status,
            occurred_at: now,
          });
        if (lifecycleError) throw lifecycleError;
      } else {
        const { data, error } = await client
          .from("beast_goals")
          .insert(payload)
          .select("id")
          .single();
        if (error || !data) throw error || new Error("Goal was not created.");
        goalId = data.id;
        await client.from("beast_goal_lifecycle_events").insert({
          owner_id: memberId,
          goal_id: goalId,
          event_type: "Created",
          title: "Goal created",
          next_status: draft.status,
          occurred_at: now,
        });
        if (splitSource) {
          const { error: splitError } = await client
            .from("beast_goal_lifecycle_events")
            .insert({
              owner_id: memberId,
              goal_id: splitSource.id,
              event_type: "Split",
              title: `Split into ${draft.title.trim()}`,
              previous_status: splitSource.status,
              next_status: splitSource.status,
              superseded_by_goal_id: goalId,
              occurred_at: now,
            });
          if (splitError) throw splitError;
        }
      }

      if (goalId) {
        const trackedFields = [
          "title",
          "category",
          "description",
          "status",
          "priority",
          "timeline",
          "target_date",
          "progress",
          "current_step",
          "notes",
          "tags",
          "linked_professional",
        ];
        const currentValues: Record<string, string> = {
          title: draft.title.trim(),
          category: draft.category,
          description: draft.description.trim(),
          status: draft.status,
          priority: draft.priority,
          timeline: draft.timeline,
          target_date: draft.targetDate,
          progress: draft.progress,
          current_step: draft.currentStep.trim(),
          notes: draft.notes.trim(),
          tags: draft.tags,
          linked_professional: draft.linkedProfessional,
        };
        const prior = editing ? draftFromGoal(editing) : null;
        const priorValues: Record<string, string> = prior
          ? {
              title: prior.title.trim(),
              category: prior.category,
              description: prior.description.trim(),
              status: prior.status,
              priority: prior.priority,
              timeline: prior.timeline,
              target_date: prior.targetDate,
              progress: prior.progress,
              current_step: prior.currentStep.trim(),
              notes: prior.notes.trim(),
              tags: prior.tags,
              linked_professional: prior.linkedProfessional,
            }
          : {};
        const changedFields = trackedFields.filter(
          (fieldName) => !editing || currentValues[fieldName] !== priorValues[fieldName]
        );
        if (changedFields.length > 0) {
          const { error } = await client.from("beast_goal_field_sources").upsert(
            changedFields.map((fieldName) => ({
              owner_id: memberId,
              goal_id: goalId,
              field_name: fieldName,
              source_type: "member",
              source_label: "Member",
              evidence: { interaction: editing ? "goal_edit" : "goal_create" },
            })),
            { onConflict: "owner_id,goal_id,field_name" }
          );
          if (error) throw error;
        }
      }
      closeEditor();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Goal could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function transitionGoal(
    goal: Goal,
    nextStatus: GoalStatus,
    eventType: "Completed" | "Paused" | "Resumed" | "Archived" | "Deleted"
  ) {
    if (
      (eventType === "Archived" || eventType === "Deleted") &&
      !window.confirm(`${eventType} “${goal.title}”? Goal history will be preserved.`)
    ) {
      return;
    }
    setBusy(true);
    try {
      const { client, ownerId: memberId } = await ownerId();
      const now = new Date().toISOString();
      const { error } = await client
        .from("beast_goals")
        .update({
          status: nextStatus,
          archived_at: nextStatus === "Archived" ? now : null,
          deleted_at: eventType === "Deleted" ? now : null,
        })
        .eq("id", goal.id)
        .eq("owner_id", memberId);
      if (error) throw error;
      await client.from("beast_goal_lifecycle_events").insert({
        owner_id: memberId,
        goal_id: goal.id,
        event_type: eventType,
        title: `Goal ${eventType.toLowerCase()}`,
        previous_status: goal.status,
        next_status: nextStatus,
        occurred_at: now,
      });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Goal could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function mergeGoal(goal: Goal) {
    const targetId = mergeTargets[goal.id];
    if (!targetId) return;
    const target = initialGoals.find((item) => item.id === targetId);
    if (!target || !window.confirm(`Merge “${goal.title}” into “${target.title}”?`)) return;
    setBusy(true);
    try {
      const { client, ownerId: memberId } = await ownerId();
      const now = new Date().toISOString();
      const { error } = await client
        .from("beast_goals")
        .update({ status: "Archived", archived_at: now })
        .eq("id", goal.id)
        .eq("owner_id", memberId);
      if (error) throw error;
      await client.from("beast_goal_lifecycle_events").insert({
        owner_id: memberId,
        goal_id: goal.id,
        event_type: "Merged",
        title: `Merged into ${target.title}`,
        previous_status: goal.status,
        next_status: "Archived",
        superseded_by_goal_id: target.id,
        occurred_at: now,
      });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Goals could not be merged.");
    } finally {
      setBusy(false);
    }
  }

  async function addMilestone(goal: Goal) {
    const title = milestoneTitles[goal.id]?.trim();
    if (!title) return;
    setBusy(true);
    try {
      const { client, ownerId: memberId } = await ownerId();
      const { error } = await client.from("beast_goal_milestones").insert({
        owner_id: memberId,
        goal_id: goal.id,
        title,
        status: "Not Started",
        sort_order: goal.milestones.length + 1,
      });
      if (error) throw error;
      setMilestoneTitles((current) => ({ ...current, [goal.id]: "" }));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Milestone could not be added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="life-planning-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">BO-501</p>
          <h2 id="life-planning-title" className="mt-2 text-2xl font-black text-white">Life Planning Hub</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#c7cfdb]">
            Plan once, then let every BeastOS module and Digital Professional work from the same owner-controlled goal.
          </p>
        </div>
        <button type="button" className="beast-button" onClick={() => openEditor()}>
          Add goal
        </button>
      </div>

      {todayPriorities.length > 0 ? (
        <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-4">
          <h3 className="text-sm font-black text-amber-100">Today’s planning priorities</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {todayPriorities.map(({ goal, overdueMilestones }) => (
              <div key={goal.id} className="min-w-0 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                <div className="truncate font-black text-white">{goal.title}</div>
                <div className="mt-1 text-xs text-[#9aa7b8]">
                  {goal.priority || "Medium"} priority
                  {overdueMilestones ? ` · ${overdueMilestones} overdue milestone${overdueMilestones === 1 ? "" : "s"}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4 sm:grid-cols-2 xl:grid-cols-7">
        <label className="sm:col-span-2 xl:col-span-2 text-xs font-black uppercase text-[#9aa7b8]">
          Search goals and tags
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-sm normal-case text-white" type="search" />
        </label>
        {[
          ["Category", category, setCategory, ["All", ...lifePlanningCategories]],
          ["Timeline", timeline, setTimeline, ["All", ...timelines]],
          ["Priority", priority, setPriority, ["All", ...priorities]],
          ["Professional", professional, setProfessional, ["All", ...professionals.map(([id]) => id)]],
          ["Status", status, setStatus, ["All", ...goalStatuses]],
        ].map(([label, value, setter, options]) => (
          <label key={String(label)} className="min-w-0 text-xs font-black uppercase text-[#9aa7b8]">
            {String(label)}
            <select value={String(value)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-2 py-2 text-sm normal-case text-white">
              {(options as string[]).map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        ))}
        <label className="min-w-0 text-xs font-black uppercase text-[#9aa7b8]">
          Module
          <select value={module} onChange={(event) => setModule(event.target.value)} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-2 py-2 text-sm normal-case text-white">
            {["All", "beastos", "learning", "money", "health", "home", "family", "projects"].map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>

      {message ? <p role="status" className="rounded-lg border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{message}</p> : null}
      <p className="text-sm text-[#9aa7b8]" aria-live="polite">Showing {filteredGoals.length} of {initialGoals.length} goals</p>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredGoals.map((goal) => (
          <article key={goal.id} className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-lg font-black text-white">{goal.title}</h3>
                <p className="mt-1 text-xs text-[#7f8da3]">Title source: {getGoalProvenanceLabel(goal, "title")}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full border border-amber-300/30 px-2.5 py-1 text-amber-100">{goal.priority || "Medium"}</span>
                <span className="rounded-full border border-[#364153] px-2.5 py-1 text-[#c7cfdb]">{goal.status}</span>
              </div>
            </div>
            <p className="mt-3 break-words text-sm leading-6 text-[#c7cfdb]">{goal.description || goal.summary || "No description yet."}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs font-black uppercase text-[#7f8da3]">Category</dt><dd className="mt-1 text-white">{goal.customCategory || goal.category}</dd></div>
              <div><dt className="text-xs font-black uppercase text-[#7f8da3]">Timeline</dt><dd className="mt-1 text-white">{goal.timeline || "Not set"}</dd></div>
              <div><dt className="text-xs font-black uppercase text-[#7f8da3]">Target</dt><dd className="mt-1 text-white">{formatDate(goal.targetDate)}</dd></div>
              <div><dt className="text-xs font-black uppercase text-[#7f8da3]">Progress</dt><dd className="mt-1 text-white">{goal.progress == null ? "Not set" : `${goal.progress}%`}</dd></div>
            </dl>
            {goal.tags?.length ? <div className="mt-3 flex flex-wrap gap-2">{goal.tags.map((tag) => <span key={tag} className="rounded-full bg-[#202938] px-2.5 py-1 text-xs text-[#c7cfdb]">#{tag}</span>)}</div> : null}
            <div className="mt-4 border-t border-[#2a3242] pt-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openEditor(goal)} className="beast-button-secondary">Edit</button>
                {goal.status === "Paused" ? <button type="button" disabled={busy} onClick={() => transitionGoal(goal, "Active", "Resumed")} className="beast-button-secondary">Resume</button> : <button type="button" disabled={busy} onClick={() => transitionGoal(goal, "Paused", "Paused")} className="beast-button-secondary">Pause</button>}
                <button type="button" disabled={busy} onClick={() => transitionGoal(goal, "Completed", "Completed")} className="beast-button-secondary">Complete</button>
                <button type="button" disabled={busy} onClick={() => transitionGoal(goal, "Archived", "Archived")} className="beast-button-secondary">Archive</button>
                <button type="button" disabled={busy} onClick={() => transitionGoal(goal, "Archived", "Deleted")} className="rounded-lg border border-red-300/40 px-3 py-2 text-sm font-black text-red-100">Delete</button>
                <button type="button" onClick={() => { openEditor(); setSplitSource(goal); setDraft({ ...draftFromGoal(goal), title: `${goal.title} — next part`, status: "Proposed", progress: "" }); }} className="beast-button-secondary">Split</button>
              </div>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                <label className="sr-only" htmlFor={`merge-${goal.id}`}>Merge {goal.title} into another goal</label>
                <select id={`merge-${goal.id}`} value={mergeTargets[goal.id] || ""} onChange={(event) => setMergeTargets((current) => ({ ...current, [goal.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-sm text-white">
                  <option value="">Merge into…</option>
                  {initialGoals.filter((item) => item.id !== goal.id && !item.deletedAt).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
                <button type="button" disabled={busy || !mergeTargets[goal.id]} onClick={() => mergeGoal(goal)} className="beast-button-secondary">Merge</button>
              </div>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                <label className="sr-only" htmlFor={`milestone-${goal.id}`}>New milestone for {goal.title}</label>
                <input id={`milestone-${goal.id}`} value={milestoneTitles[goal.id] || ""} onChange={(event) => setMilestoneTitles((current) => ({ ...current, [goal.id]: event.target.value }))} placeholder="Add milestone" className="min-w-0 flex-1 rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-sm text-white" />
                <button type="button" disabled={busy || !milestoneTitles[goal.id]?.trim()} onClick={() => addMilestone(goal)} className="beast-button-secondary">Add</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing !== undefined ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="goal-editor-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-[#364153] bg-[#111827] p-5 shadow-2xl sm:rounded-2xl" onKeyDown={(event) => { if (event.key === "Escape") closeEditor(); }}>
            <div className="flex items-center justify-between gap-3">
              <h3 id="goal-editor-title" className="text-xl font-black text-white">{editing ? "Edit goal" : "Add goal"}</h3>
              <button type="button" aria-label="Close goal editor" onClick={closeEditor} className="rounded-lg px-3 py-2 text-[#c7cfdb] hover:bg-white/10">Close</button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm font-bold text-[#c7cfdb]">Title<input ref={titleRef} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as GoalCategory })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white">{goalCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
              {draft.category === "Other" ? <label className="text-sm font-bold text-[#c7cfdb]">Custom category<input value={draft.customCategory} onChange={(event) => setDraft({ ...draft, customCategory: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label> : null}
              <label className="text-sm font-bold text-[#c7cfdb]">Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as GoalStatus })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white">{goalStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as GoalPriority })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white">{priorities.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Timeline<select value={draft.timeline} onChange={(event) => setDraft({ ...draft, timeline: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white">{timelines.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Target date<input type="date" value={draft.targetDate} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Progress<input type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Linked professional<select value={draft.linkedProfessional} onChange={(event) => setDraft({ ...draft, linkedProfessional: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white"><option value="">None</option>{professionals.map(([id, config]) => <option key={id} value={id}>{config.label}</option>)}</select></label>
              <label className="sm:col-span-2 text-sm font-bold text-[#c7cfdb]">Description<textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="sm:col-span-2 text-sm font-bold text-[#c7cfdb]">Current step<input value={draft.currentStep} onChange={(event) => setDraft({ ...draft, currentStep: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="sm:col-span-2 text-sm font-bold text-[#c7cfdb]">Tags, comma separated<input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="sm:col-span-2 text-sm font-bold text-[#c7cfdb]">Notes<textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
            </div>
            {message ? <p role="alert" className="mt-4 text-sm text-red-200">{message}</p> : null}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={closeEditor} className="beast-button-secondary">Cancel</button>
              <button type="button" disabled={busy} onClick={saveGoal} className="beast-button">{busy ? "Saving…" : "Save goal"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
