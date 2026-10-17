"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DirectorCapability } from "@/lib/directorAssignments";
import { readyDirectorSteps } from "../../../lib/directorPlanReadiness";
import type { DirectorReasonedPlan } from "@/lib/directorReasoning";

type Goal = { id: string; title: string; category: string };
type Assignment = { id: string; capability: DirectorCapability; status: string; blocker: string | null; attempts: number; dependencies: string[]; events: Array<{ at: string; status: string; detail: string }>; result: { asOf: string; output: unknown; limitations: string[] } | null };
const labels: Record<DirectorCapability, string> = { "money.cash-review": "Money Coach: saved cash review", "health.preparation-review": "Health Advisor: record preparation" };

/** Saved checkpoints use the existing Director workspace, not a second chat or goal system. */
export default function DirectorObjectives() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalId, setGoalId] = useState("");
  const [capabilities, setCapabilities] = useState<DirectorCapability[]>([]);
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const [evidenceOptions, setEvidenceOptions] = useState<Array<{ taskId: string; records: Array<{ id: string; label: string }> }>>([]);
  const [evidenceSelection, setEvidenceSelection] = useState<Record<string, string[]>>({});
  const [ownerMessage, setOwnerMessage] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reasoningAvailable, setReasoningAvailable] = useState(false);
  const [proposal, setProposal] = useState<{ id: string; plan: DirectorReasonedPlan } | null>(null);
  const requestVersion = useRef(0);
  const pending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/director/assignments", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Saved objectives unavailable.");
      setGoals(payload.goals || []);
      setReasoningAvailable(payload.reasoningAvailable === true);
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, []);

  const load = useCallback(async (selected: string) => {
    const version = ++requestVersion.current;
    setTasks([]); setOwnerMessage(""); setEvidenceOptions([]); setEvidenceSelection({}); setCancelled(false); setError(null); setNotice(null); setProposal(null);
    if (!selected) return;
    try {
      const response = await fetch(`/api/director/assignments?goalId=${encodeURIComponent(selected)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Saved assignments unavailable.");
      if (version === requestVersion.current) {
        setTasks(payload.assignments || []);
        setEvidenceOptions(payload.evidenceOptions || []); setCancelled(Boolean(payload.cancellation));
        if (payload.proposal?.content?.directorPlan?.plan) setProposal({ id: payload.proposal.id, plan: payload.proposal.content.directorPlan.plan });
      }
    } catch (failure) { if (version === requestVersion.current) setError(failure instanceof Error ? failure.message : "Assignments unavailable."); }
  }, []);

  async function act(action: "plan" | "resume" | "correction" | "reason" | "approve_reasoned_plan" | "supervise" | "cancel", assignmentId?: string) {
    if (pending.current || !goalId) return;
    pending.current = true; setBusy(true); setError(null); setNotice(null);
    ++requestVersion.current;
    try {
      const response = await fetch("/api/director/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, goalId, capabilities, assignmentId, ownerMessage: action === "reason" ? ownerMessage : undefined, evidenceSelection: action === "reason" ? Object.entries(evidenceSelection).filter(([, ids]) => ids.length).map(([taskId, recordIds]) => ({ taskId, recordIds })) : undefined, proposalId: action === "approve_reasoned_plan" ? assignmentId : undefined }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Assignment request failed.");
      setTasks(payload.assignments || []);
      if (payload.proposal?.content?.directorPlan?.plan) setProposal({ id: payload.proposal.id, plan: payload.proposal.content.directorPlan.plan });
      setEvidenceOptions([]); setEvidenceSelection({});
      if (action === "cancel") setCancelled(true);
      if (action === "approve_reasoned_plan") setProposal(null);
      setNotice(payload.notice || payload.outcome?.detail || payload.outcomes?.at(-1)?.detail || (action === "reason" ? "Avery proposed a plan. No work has been assigned or executed." : "Review plan saved. Resume to execute its next checkpoint."));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Assignment request failed."); }
    finally { pending.current = false; setBusy(false); }
  }

  return <details className="mb-4 rounded-xl border border-violet-300/20 bg-[#141824] p-4">
    <summary className="cursor-pointer font-bold text-white">Supervised objectives · saved-record reviews</summary>
    <p className="my-3 text-sm text-slate-300">Attach supported specialist reviews to an existing BeastGoals objective. Each resume executes one checkpoint. Reviews do not complete the life goal or authorize transactions, medical decisions, publishing, or production changes.</p>
    <label htmlFor="director-objective-goal" className="block text-sm text-slate-200">Saved objective</label>
      <select id="director-objective-goal" className="mt-1 w-full rounded border border-white/20 bg-[#111827] p-2 text-slate-200" value={goalId} disabled={busy} onChange={(event) => { setGoalId(event.target.value); setCapabilities([]); void load(event.target.value); }}>
        <option value="">Choose an objective</option>
        {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
      </select>
    <fieldset className="my-3 grid gap-2" disabled={busy || !goalId}>
      <legend className="text-sm text-slate-300">Authorize these read-only specialist reviews</legend>
      {(Object.keys(labels) as DirectorCapability[]).map((capability) => <label key={capability} className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={capabilities.includes(capability)} onChange={(event) => setCapabilities((current) => event.target.checked ? [...current, capability] : current.filter((item) => item !== capability))} />{labels[capability]}</label>)}
    </fieldset>
    <div className="my-3 rounded border border-white/10 p-3 text-sm text-slate-200">
      <label className="block">Current request or correction for Avery<textarea className="my-2 w-full rounded bg-[#111827] p-2" maxLength={2000} value={ownerMessage} disabled={busy} onChange={event => setOwnerMessage(event.target.value)} /></label>
      {evidenceOptions.length > 0 && <fieldset disabled={busy}><legend>Optional: share selected verified evidence with Avery for this objective</legend><p className="text-xs text-slate-400">Only selected income or appointment excerpts and the review summary are sent to the AI provider. Other records stay local. Selection does not authorize execution. Refresh evidence after running a review.</p>{evidenceOptions.flatMap(option => option.records.map(record => <label key={`${option.taskId}-${record.id}`} className="flex gap-2"><input type="checkbox" checked={evidenceSelection[option.taskId]?.includes(record.id) || false} onChange={event => setEvidenceSelection(current => ({ ...current, [option.taskId]: event.target.checked ? [...(current[option.taskId] || []), record.id] : (current[option.taskId] || []).filter(id => id !== record.id) }))} />{record.label}</label>))}</fieldset>}
      {cancelled && <p>Owner cancelled remaining work. Restoring permissions does not restore authorization.</p>}
      <button type="button" className="beast-button" disabled={busy || !goalId || !reasoningAvailable} onClick={() => void act("reason")}>Ask Avery to plan or review</button>
      {!reasoningAvailable && <p className="mt-2 text-xs text-amber-200">AI planning is unavailable. You can continue with saved-record reviews.</p>}
      {proposal && <div className="mt-3 grid gap-2 break-words">
        <p className="font-bold">Proposed plan · not executed</p><p>{proposal.plan.interpretation}</p>
        <ol>{proposal.plan.steps.map((step) => <li key={step.capability}>{labels[step.capability]}: {step.purpose}. Acceptance: {step.acceptance}{step.dependsOn?.length ? ` Prerequisites: ${step.dependsOn.map(capability => labels[capability]).join(", ")}.` : ""}</li>)}</ol>
        {(["alternatives", "contradictions", "missingInformation", "ownerDecisions", "unsupportedWork"] as const).map((key) => proposal.plan[key].length ? <div key={key}><p className="font-bold">{({ alternatives: "Alternatives", contradictions: "Conflicting information", missingInformation: "Missing information", ownerDecisions: "Owner decisions", unsupportedWork: "Unsupported work" })[key]}</p><ul>{proposal.plan[key].map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null)}
        {proposal.plan.requirements?.length ? <div><p className="font-bold">Requirements before affected work</p><ul>{proposal.plan.requirements.map((requirement, index) => <li key={index}>{requirement.scope === "all_new_work" ? "All new work" : labels[requirement.scope]}: {requirement.detail}</li>)}</ul></div> : null}
        {proposal.plan.planningNotes?.length ? <div><p className="font-bold">Planning notes · not execution blockers</p><ul>{proposal.plan.planningNotes.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null}
        {proposal.plan.evidenceClaims?.map((claim, index) => <p key={index}>Checkpoint {claim.taskId}: saved-record consistency only. This does not establish a real-world outcome.</p>)}
        {proposal.plan.assessments.map((assessment) => <p key={assessment.taskId}>{assessment.disposition.replaceAll("_", " ")}: {assessment.finding}</p>)}
        <button type="button" className="beast-button" disabled={busy || !readyDirectorSteps(proposal.plan, { goal: { id: goalId, title: "", updated_at: "" }, availableCapabilities: Object.keys(labels) as DirectorCapability[], checkpoints: tasks }).length} onClick={() => void act("approve_reasoned_plan", proposal.id)}>Authorize supported steps</button>
        <p className="text-xs text-slate-400">Model interpretation is unverified advice. This approval authorizes only ready listed saved-record reviews. Tasks with unresolved requirements and their dependents remain unassigned. It never authorizes unsupported work or external actions.</p>
      </div>}
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="beast-button" disabled={busy || !goalId || !capabilities.length} onClick={() => void act("plan")}>Save review plan</button>
      <button type="button" className="beast-button" disabled={busy || !goalId || !tasks.length} onClick={() => void act("resume")}>{busy ? "Checking checkpoint…" : "Resume next checkpoint"}</button>
      <button type="button" className="beast-button" disabled={busy || !goalId || !tasks.length} onClick={() => void act("supervise")}>Run approved checkpoints</button>
      <button type="button" className="beast-button" disabled={busy || !goalId || cancelled} onClick={() => void act("cancel")}>Cancel remaining reviews</button>
      <button type="button" className="beast-button" disabled={busy || !goalId} onClick={() => void load(goalId)}>Refresh evidence</button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="mt-3 text-sm text-violet-200">{notice}</p>}
    {!!tasks.length && <p className="mt-3 text-sm text-slate-300">{tasks.filter((task) => task.status === "verified").length} of {tasks.length} saved-record checkpoints verified</p>}
    <ol className="mt-3 grid gap-3">{tasks.map((task) => <li key={task.id} className="min-w-0 rounded border border-white/10 p-3 text-sm text-slate-200">
      <p className="font-bold">{labels[task.capability]} · {task.status.replaceAll("_", " ")}</p>
      <p>Attempts: {task.attempts}/3 · Dependencies: {task.dependencies.length}</p>
      {task.blocker && <p className="mt-1 text-amber-200">{task.blocker}</p>}
      {task.attempts >= 3 && ["blocked", "needs_correction"].includes(task.status) && <button type="button" className="beast-button mt-2" disabled={busy} onClick={() => void act("correction", task.id)}>Authorize another correction cycle</button>}
      {task.result && <details className="mt-2"><summary>Verified review evidence · {new Date(task.result.asOf).toLocaleString()}</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(task.result.output, null, 2)}</pre>{task.result.limitations.map((limit) => <p key={limit} className="mt-1 text-xs text-slate-400">{limit}</p>)}</details>}
      <details className="mt-2"><summary>Checkpoint history</summary><ol>{task.events.map((event, index) => <li key={index} className="mt-1 break-words text-xs">{new Date(event.at).toLocaleString()} · {event.status}: {event.detail}</li>)}</ol></details>
    </li>)}</ol>
    <p className="mt-3 text-xs text-slate-400">Other specialist capabilities, external research, and open-ended autonomous work are not supported by this review runner. Avery can discuss a plan, but conversation text is not execution evidence.</p>
  </details>;
}
