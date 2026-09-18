"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { memberSafeMessage } from "@/lib/memberSafeError";
import {
  getGoalProgressPercent,
  goalCategories,
  goalStatuses,
  type Goal,
  type GoalCategory,
  type GoalPriority,
  type GoalStatus,
} from "@/lib/platform/goals";
import {
  filterLifePlanningGoals,
  lifePlanningCategories,
  professionalGoalAccess,
  rankGoalsForToday,
} from "@/lib/platform/lifePlanning";
import type { ContextualWorkspaceConfig } from "@/lib/platform/contextualWorkspaces";

import { goalReviewDate, goalReviewDue, goalDraftError, goalFollowup, safeGoalLink, goalAreas, goalHorizons, goalAreaDefaults, matchesGoalArea, matchesGoalHorizon, type GoalArea, type GoalHorizon } from "@/lib/platform/goalEditing";
import { GoalMilestones } from "./GoalMilestones";

import { categoryConnection, getGoalConnections, suggestGoalConnections, goalTagsWithConnections, visibleGoalTags, goalConnectionLabels, type GoalConnection } from "@/lib/platform/goalConnections";

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
    tags: visibleGoalTags(goal.tags).join(", "),
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
  const [area, setArea] = useState<GoalArea>("All goals");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [horizon, setHorizon] = useState<GoalHorizon>("Any time");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [module, setModule] = useState("All");
  const [timeline, setTimeline] = useState("All");
  const [priority, setPriority] = useState("All");
  const [professional, setProfessional] = useState("All");
  const [status, setStatus] = useState("All");
  const [editing, setEditing] = useState<Goal | null | undefined>(undefined);
  const [chosenConnections, setChosenConnections] = useState<GoalConnection[] | null>(null);
  const [draft, setDraft] = useState<GoalDraft>(emptyDraft);
  const busyRef = useRef(false);
  const newGoalId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [splitSource, setSplitSource] = useState<Goal | null>(null);

  const suggestedConnections = suggestGoalConnections(draft.title, draft.category);
  const primaryConnection = categoryConnection(draft.category);
  const connections = Array.from(new Set([...(chosenConnections ?? suggestedConnections), ...(primaryConnection ? [primaryConnection] : [])]));

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
      }).filter(goal => matchesGoalArea(goal, area) && matchesGoalHorizon(goal, horizon) && (!reviewOnly || goalReviewDue(goal))),
    [initialGoals, search, category, module, timeline, priority, professional, status, area, horizon, reviewOnly]
  );
  const todayPriorities = useMemo(
    () => rankGoalsForToday(initialGoals).slice(0, 3),
    [initialGoals]
  );

  function openEditor(goal?: Goal) {
    if (busyRef.current) return;
    newGoalId.current = goal ? null : crypto.randomUUID();
    openerRef.current = document.activeElement as HTMLElement | null;
    setSplitSource(null);
    setChosenConnections(goal ? getGoalConnections(goal) : null);
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
    if (!goal && goalAreaDefaults(area)) setDraft({ ...emptyDraft, ...goalAreaDefaults(area)! });
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
    if (busyRef.current) return;
    const validation = goalDraftError(draft);
    if (validation) {
      setMessage(validation);
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage("");
    let saved = false;
    let followupFailed = false;
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
        progress: draft.progress.trim() === "" ? null : Number(draft.progress),
        current_step: draft.currentStep.trim() || null,
        linked_professional: draft.linkedProfessional || null,
        notes: draft.notes.trim() || null,
        tags: goalTagsWithConnections(draft.tags, connections),
        ...(!editing ? { source_type: "member", source_label: "Member" } : {}),
        ...(!editing && context ? { source_module: context.module } : {}),
        archived_at: draft.status === "Archived" ? now : null,
        updated_at: now,
      };
      let goalId = editing?.id;
      if (editing) {
        const { data: updated, error } = await client
          .from("beast_goals")
          .update(payload)
          .eq("id", editing.id)
          .eq("owner_id", memberId)
          .eq("updated_at", editing.updatedAt).select("id");
        if (error) throw error;
        if (updated?.length !== 1) throw new Error("This goal changed in another window. Refresh before saving.");
        saved = true;
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
        if (lifecycleError) followupFailed = true;
      } else {
        const { data, error } = await client
          .from("beast_goals")
          .insert({ ...payload, id: newGoalId.current })
          .select("id")
          .single();
        if (error || !data) {
          const existing = await client.from("beast_goals").select("id").eq("id", newGoalId.current).eq("owner_id", memberId).maybeSingle();
          if (!existing.data || existing.error) throw error || new Error("Goal was not created.");
          saved = true;
          closeEditor(); router.refresh();
          setMessage("Your goal is already saved. Review it before making further changes.");
          return;
        } else goalId = data.id;
        saved = true;
        followupFailed = await goalFollowup(() => client.from("beast_goal_lifecycle_events").insert({
          owner_id: memberId,
          goal_id: goalId,
          event_type: "Created",
          title: "Goal created",
          next_status: draft.status,
          occurred_at: now,
        }));
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
          if (splitError) followupFailed = true;
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
          tags: payload.tags.join(","),
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
              tags: (editing?.tags || []).join(","),
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
          if (error) followupFailed = true;
        }
      }
      setMessage(followupFailed ? "Your goal is saved, but some history details could not be updated. You do not need to save it again." : "Goal saved.");
      closeEditor();
      router.refresh();
    } catch (error) {
      if (saved) {
        closeEditor(); router.refresh();
        setMessage("Your goal is saved, but its history could not be updated. You do not need to save it again.");
      } else setMessage(error instanceof Error && error.message.includes("another window") ? error.message : memberSafeMessage(error, "create"));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function transitionGoal(
    goal: Goal,
    nextStatus: GoalStatus,
    eventType: "Completed" | "Paused" | "Resumed" | "Archived" | "Deleted" | "Revised"
  ) {
    if (
      (eventType === "Archived" || eventType === "Deleted") &&
      !window.confirm(`${eventType} “${goal.title}”? Goal history will be preserved.`)
    ) {
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const { client, ownerId: memberId } = await ownerId();
      const now = new Date().toISOString();
      const { data: updated, error } = await client
        .from("beast_goals")
        .update({
          status: nextStatus,
          updated_at: now,
          archived_at: nextStatus === "Archived" ? now : null,
          deleted_at: eventType === "Deleted" ? now : null,
        })
        .eq("id", goal.id)
        .eq("owner_id", memberId)
        .eq("updated_at", goal.updatedAt).select("id");
      if (error) throw error;
      if (updated?.length !== 1) throw new Error("This goal changed in another window. Refresh before saving.");
      const historyFailed = await goalFollowup(() => client.from("beast_goal_lifecycle_events").insert({
        owner_id: memberId,
        goal_id: goal.id,
        event_type: eventType,
        title: eventType === "Revised" ? "Goal reviewed — still current" : `Goal ${eventType.toLowerCase()}`,
        previous_status: goal.status,
        next_status: nextStatus,
        occurred_at: now,
      }));
      setMessage(historyFailed ? "Goal updated. Its history entry could not be recorded." : eventType === "Revised" ? "Goal confirmed. We’ll remind you to review it again in three months." : "Goal updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error && error.message.includes("another window") ? error.message : memberSafeMessage(error, "update"));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function mergeGoal(goal: Goal) {
    const targetId = mergeTargets[goal.id];
    if (!targetId) return;
    const target = initialGoals.find((item) => item.id === targetId);
    if (!target || !window.confirm(`Link “${goal.title}” to “${target.title}” and archive the original? Milestones and notes stay with the original goal; they are not transferred.`)) return;
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const { client, ownerId: memberId } = await ownerId();
      const now = new Date().toISOString();
      const { data: updated, error } = await client
        .from("beast_goals")
        .update({ status: "Archived", archived_at: now, updated_at: now })
        .eq("id", goal.id)
        .eq("owner_id", memberId)
        .eq("updated_at", goal.updatedAt).select("id");
      if (error) throw error;
      if (updated?.length !== 1) throw new Error("This goal changed in another window. Refresh before saving.");
      const historyFailed = await goalFollowup(() => client.from("beast_goal_lifecycle_events").insert({
        owner_id: memberId,
        goal_id: goal.id,
        event_type: "Merged",
        title: `Merged into ${target.title}`,
        previous_status: goal.status,
        next_status: "Archived",
        superseded_by_goal_id: target.id,
        occurred_at: now,
      }));
      setMessage(historyFailed ? "Goal updated. Its history entry could not be recorded." : "Goal updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error && error.message.includes("another window") ? error.message : memberSafeMessage(error, "update"));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }


  return (
    <section className="space-y-5" aria-labelledby="life-planning-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="life-planning-title" className="mt-2 text-2xl font-black text-white">Make it happen</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#c7cfdb]">
            Choose a goal, decide your next step, and track the small wins along the way.
          </p>
        </div>
        <button type="button" className="beast-button" onClick={() => openEditor()}>
          Add goal
        </button>
      </div>

      <section aria-label="Quarterly goal review" className="rounded-xl border border-sky-300/25 bg-sky-300/5 p-4">
        <h3 className="font-bold text-white">Room for your goals to change</h3>
        <p className="mt-2 text-sm text-slate-300">Check in every three months: keep a goal, adjust it, or archive it if it no longer fits. Saving changes or confirming it is still current starts the next three-month period.</p>
        {initialGoals.some(goal => goalReviewDue(goal)) ? <button type="button" className="beast-button-secondary mt-3" aria-pressed={reviewOnly} onClick={() => { setReviewOnly(!reviewOnly); setArea("All goals"); setHorizon("Any time"); setSearch(""); setCategory("All"); setModule("All"); setTimeline("All"); setPriority("All"); setProfessional("All"); setStatus("All"); }}>Review due ({initialGoals.filter(goal => goalReviewDue(goal)).length})</button> : <p className="mt-2 text-sm text-sky-200">No reviews due right now.</p>}
      </section>
      <nav aria-label="Goal categories" className="flex flex-wrap gap-2">
        {goalAreas.filter(item => !context || item === "All goals" || (context.key === "education" ? ["School", "Career"].includes(item) : context.key === "health" ? ["Weight", "Health"].includes(item) : context.key === "money" ? item === "Finances" : context.key === "home" ? item === "Home" : true)).map(item => <button key={item} type="button" aria-pressed={area === item} onClick={() => { setArea(item); setCategory("All"); }} className={`rounded-full border px-4 py-2 text-sm font-semibold ${area === item ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-slate-600 text-slate-300"}`}>{item}</button>)}
      </nav>
      <div aria-label="Planning timeframe" className="flex flex-wrap gap-2">
        {goalHorizons.map(item => <button key={item} type="button" aria-pressed={horizon === item} onClick={() => setHorizon(item)} className={`rounded-lg border px-3 py-2 text-sm ${horizon === item ? "border-sky-300 text-sky-200" : "border-slate-700 text-slate-400"}`}>{item}</button>)}
      </div>
      {horizon !== "Any time" && <p className="text-xs text-slate-400">Timeframes use your goal’s target date. “Next 5 years” and “Next 10 years” include nearer goals too.</p>}
      {todayPriorities.length > 0 ? (
        <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-4">
          <h3 className="text-sm font-black text-amber-100">Focus for today</h3>
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
          ["Advisor", professional, setProfessional, ["All", ...professionals.map(([id]) => id)]],
          ["Status", status, setStatus, ["All", ...goalStatuses]],
        ].map(([label, value, setter, options]) => (
          <label key={String(label)} className="min-w-0 text-xs font-black uppercase text-[#9aa7b8]">
            {String(label)}
            <select value={String(value)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-2 py-2 text-sm normal-case text-white">
              {(options as string[]).map((option) => <option key={option} value={option}>{professionalGoalAccess[option as keyof typeof professionalGoalAccess]?.label || option}</option>)}
            </select>
          </label>
        ))}
        <label className="min-w-0 text-xs font-black uppercase text-[#9aa7b8]">
          Area
          <select value={module} onChange={(event) => setModule(event.target.value)} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-2 py-2 text-sm normal-case text-white">
            {Object.entries({ All: "All areas", beastos: "Personal", learning: "Education", money: "Money", health: "Health", home: "Home", family: "Family", projects: "Projects" }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {message ? <p role="status" className="rounded-lg border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{message}</p> : null}
      <p className="text-sm text-[#9aa7b8]" aria-live="polite">Showing {filteredGoals.length} of {initialGoals.length} goals</p>

      {filteredGoals.length === 0 && <p className="rounded-xl border border-slate-700 p-5 text-sm text-slate-300">{initialGoals.length ? "No goals match these filters. Try a different search or clear the filters." : "What would you like to work toward? Add your first goal to get started."}</p>}
      <button type="button" className="beast-button-secondary" onClick={() => { setReviewOnly(false); setArea("All goals"); setHorizon("Any time"); setSearch(""); setCategory("All"); setModule("All"); setTimeline("All"); setPriority("All"); setProfessional("All"); setStatus("All"); }}>Clear filters</button>
      <div className="grid gap-4 lg:grid-cols-2">
        {filteredGoals.map((goal) => (
          <article key={goal.id} aria-label={goal.title} className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-lg font-black text-white">{goal.title}</h3>
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
              <div><dt className="text-xs font-black uppercase text-[#7f8da3]">Progress</dt><dd className="mt-1 text-white">{getGoalProgressPercent(goal) == null ? "Not set" : `${getGoalProgressPercent(goal)}%`}{goal.status !== "Completed" ? (goal.progress == null ? " · milestones" : " · manual") : ""}</dd></div>
            </dl>
            {visibleGoalTags(goal.tags).length ? <div className="mt-3 flex flex-wrap gap-2">{visibleGoalTags(goal.tags).map((tag) => <span key={tag} className="rounded-full bg-[#202938] px-2.5 py-1 text-xs text-[#c7cfdb]">#{tag}</span>)}</div> : null}
            {getGoalConnections(goal).length > 0 && <p className="mt-3 text-xs text-sky-200">Considered by: {getGoalConnections(goal).map(key => goalConnectionLabels[key]).join(" · ")}</p>}
            {goalReviewDate(goal) && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-sky-200"><span>{goalReviewDue(goal) ? "Time to review this goal" : `Next review: ${formatDate(goalReviewDate(goal)!)}`}</span><button type="button" disabled={busy} className="beast-button-secondary" onClick={() => transitionGoal(goal, goal.status, "Revised")}>Still current</button></div>}
            <div className="mt-4 border-t border-[#2a3242] pt-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => openEditor(goal)} className="beast-button-secondary">Edit</button>
                {["Paused", "Completed", "Archived"].includes(goal.status) ? <button type="button" disabled={busy} onClick={() => transitionGoal(goal, "Active", "Resumed")} className="beast-button-secondary">{goal.status === "Paused" ? "Resume" : "Reopen"}</button> : <button type="button" disabled={busy} onClick={() => transitionGoal(goal, "Paused", "Paused")} className="beast-button-secondary">Pause</button>}
                <button type="button" disabled={busy || goal.status === "Completed" || goal.status === "Archived"} onClick={() => transitionGoal(goal, "Completed", "Completed")} className="beast-button-secondary">Complete</button>
                <button type="button" disabled={busy || goal.status === "Archived"} onClick={() => transitionGoal(goal, "Archived", "Archived")} className="beast-button-secondary">Archive</button>
                <button type="button" disabled={busy} onClick={() => transitionGoal(goal, "Archived", "Deleted")} className="rounded-lg border border-red-300/40 px-3 py-2 text-sm font-black text-red-100">Delete</button>
                <button type="button" disabled={busy} onClick={() => { openEditor(); setSplitSource(goal); setDraft({ ...draftFromGoal(goal), title: `${goal.title} — next part`, status: "Proposed", progress: "" }); }} className="beast-button-secondary">Split</button>
              </div>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                <label className="sr-only" htmlFor={`merge-${goal.id}`}>Merge {goal.title} into another goal</label>
                <select id={`merge-${goal.id}`} value={mergeTargets[goal.id] || ""} onChange={(event) => setMergeTargets((current) => ({ ...current, [goal.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-sm text-white">
                  <option value="">Link to goal…</option>
                  {initialGoals.filter((item) => item.id !== goal.id && !item.deletedAt).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
                <button type="button" disabled={busy || !mergeTargets[goal.id]} onClick={() => mergeGoal(goal)} className="beast-button-secondary">Link &amp; archive</button>
              </div>
              <GoalMilestones goal={goal} disabled={busy} />
              {goal.currentStep && <p className="mt-4 text-sm text-slate-300"><strong>Next step:</strong> {goal.currentStep}</p>}
              {(goal.notes || goal.references.length || goal.supportItems.length || goal.recommendations.length || goal.contributions.length || goal.lifecycleEvents.length) ? <details className="mt-4 text-sm text-slate-300">
                <summary className="cursor-pointer font-semibold">Notes, resources, and history</summary>
                {goal.notes && <p className="mt-3 whitespace-pre-wrap break-words">{goal.notes}</p>}
                {goal.supportItems.map(item => <p key={item.id} className="mt-2">{item.title} · {item.status}{item.nextDueDate ? ` · ${item.nextDueDate}` : ""}{item.summary ? ` — ${item.summary}` : ""}</p>)}
                {goal.references.map(item => <p key={item.id} className="mt-2">{safeGoalLink(item.url) ? <a href={safeGoalLink(item.url)!} className="text-sky-300 underline" target="_blank" rel="noopener noreferrer">{item.title}</a> : item.title}{item.summary ? ` — ${item.summary}` : ""}</p>)}
                {goal.recommendations.filter(item => item.status === "Suggested" || item.status === "Accepted").map(item => <p key={item.id} className="mt-2">{item.title}: {item.reason}</p>)}
                {goal.contributions.map(item => <p key={item.id} className="mt-2">{item.title}: {item.summary}</p>)}
                {goal.lifecycleEvents.map(item => <p key={item.id} className="mt-2">{item.title} · {new Date(item.occurredAt).toLocaleDateString()}{item.reason ? ` — ${item.reason}` : ""}</p>)}
              </details> : null}
            </div>
          </article>
        ))}
      </div>

      {editing !== undefined ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) closeEditor(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="goal-editor-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-[#364153] bg-[#111827] p-5 shadow-2xl sm:rounded-2xl" onKeyDown={(event) => { if (event.key === "Escape" && !busy) closeEditor(); }}>
            <div className="flex items-center justify-between gap-3">
              <h3 id="goal-editor-title" className="text-xl font-black text-white">{editing ? "Edit goal" : "Add goal"}</h3>
              <button type="button" aria-label="Close goal editor" disabled={busy} onClick={closeEditor} className="rounded-lg px-3 py-2 text-[#c7cfdb] hover:bg-white/10">Close</button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm font-bold text-[#c7cfdb]">Title<input disabled={busy} ref={titleRef} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Category<select disabled={busy} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as GoalCategory })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white">{goalCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
              {draft.category === "Other" ? <label className="text-sm font-bold text-[#c7cfdb]">Custom category<input disabled={busy} value={draft.customCategory} onChange={(event) => setDraft({ ...draft, customCategory: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label> : null}
              <label className="text-sm font-bold text-[#c7cfdb]">Status<select disabled={busy} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as GoalStatus })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white">{goalStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Priority<select disabled={busy} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as GoalPriority })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white">{priorities.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Timeline<select disabled={busy} value={draft.timeline} onChange={(event) => setDraft({ ...draft, timeline: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white">{timelines.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Target date<input disabled={busy} type="date" value={draft.targetDate} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Progress (blank = milestones)<input disabled={busy} type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="text-sm font-bold text-[#c7cfdb]">Advisor<select disabled={busy} value={draft.linkedProfessional} onChange={(event) => setDraft({ ...draft, linkedProfessional: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white"><option value="">None</option>{professionals.map(([id, config]) => <option key={id} value={id}>{config.label}</option>)}</select></label>
              <label className="sm:col-span-2 text-sm font-bold text-[#c7cfdb]">Description<textarea disabled={busy} rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="sm:col-span-2 text-sm font-bold text-[#c7cfdb]">Current step<input disabled={busy} value={draft.currentStep} onChange={(event) => setDraft({ ...draft, currentStep: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="sm:col-span-2 text-sm font-bold text-[#c7cfdb]">Tags, comma separated<input disabled={busy} value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
              <label className="sm:col-span-2 text-sm font-bold text-[#c7cfdb]">Notes<textarea disabled={busy} rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-2 w-full rounded-lg border border-[#364153] bg-[#0f1419] px-3 py-2 text-white" /></label>
            </div>
            <fieldset disabled={busy} className="mt-4 rounded-lg border border-slate-600 p-3">
              <legend className="px-2 text-sm font-bold text-white">Where this goal matters</legend>
              <p className="mb-3 text-xs text-slate-300">These advisors can consider this goal when helping you. This does not change your income, budget, health records, or education profile.</p>
              <div className="flex flex-wrap gap-4">{(Object.keys(goalConnectionLabels) as GoalConnection[]).map(key => <label key={key} className="flex gap-2 text-sm text-slate-200"><input type="checkbox" checked={connections.includes(key)} disabled={busy || key === primaryConnection} onChange={event => setChosenConnections(event.target.checked ? [...connections, key] : connections.filter(item => item !== key))} />{goalConnectionLabels[key]}</label>)}</div>
              <p className="mt-2 text-xs text-slate-400">Your category stays connected. Other connections are suggested from your title and can be changed.</p>
            </fieldset>
            {message ? <p role="alert" className="mt-4 text-sm text-red-200">{message}</p> : null}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={closeEditor} className="beast-button-secondary">Cancel</button>
              <button type="button" disabled={busy} onClick={saveGoal} className="beast-button">{busy ? "Saving…" : "Save goal"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
