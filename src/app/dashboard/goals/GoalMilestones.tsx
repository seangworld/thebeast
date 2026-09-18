"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { milestonePatch } from "@/lib/platform/goalEditing";
import type { Goal, GoalMilestone, GoalMilestoneStatus } from "@/lib/platform/goals";

const field = "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white";
export function GoalMilestones({ goal, disabled }: { goal: Goal; disabled: boolean }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const operationId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<GoalMilestone | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<GoalMilestoneStatus>("Not Started");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const locked = disabled || busy || pending || ["Archived", "Completed"].includes(goal.status);
  function reset() { setEditing(null); setTitle(""); setStatus("Not Started"); setDate(""); operationId.current = null; }
  async function save() {
    if (inFlight.current || locked) return;
    inFlight.current = true; setBusy(true); setMessage("");
    try {
      const patch = milestonePatch(title, status, date, new Date().toISOString(), editing?.completedAt);
      const client = createClient();
      const user = await client.auth.getUser();
      if (user.error || !user.data.user) throw new Error("Sign in to update milestones.");
      const owner = user.data.user.id;
      const current = await client.from("beast_goals").select("id,status,deleted_at").eq("owner_id", owner).eq("id", goal.id).single();
      if (current.error || !current.data) throw new Error("This goal is unavailable for your account.");
      if (current.data.deleted_at || ["Archived", "Completed"].includes(current.data.status)) throw new Error("Reopen this goal before editing milestones.");
      if (editing) {
        const result = await client.from("beast_goal_milestones").update(patch).eq("id", editing.id).eq("owner_id", owner).eq("goal_id", goal.id).eq("updated_at", editing.updatedAt).select("id");
        if (result.error) throw new Error("Could not save this milestone. Please try again.");
        if (result.data?.length !== 1) throw new Error("This milestone changed in another window. Reload before saving.");
      } else {
        operationId.current ||= crypto.randomUUID();
        const result = await client.from("beast_goal_milestones").insert({ ...patch, id: operationId.current, owner_id: owner, goal_id: goal.id, sort_order: Math.max(0, ...goal.milestones.map(item => item.sortOrder)) + 1 });
        if (result.error) {
          const existing = await client.from("beast_goal_milestones").select("id").eq("id", operationId.current).eq("owner_id", owner).eq("goal_id", goal.id).maybeSingle();
          if (existing.error || !existing.data) throw new Error("Could not save this milestone. Your entries are preserved; try again.");
        }
      }
      reset(); setMessage("Milestone saved."); startTransition(() => router.refresh());
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this milestone."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section className="mt-4 space-y-3" aria-label={`Milestones for ${goal.title}`}>
    <h4 className="text-sm font-bold text-white">Milestones</h4>
    {goal.milestones.length === 0 && <p className="text-xs text-slate-400">Break this goal into smaller steps.</p>}
    {goal.milestones.map(item => <div key={item.id} className="rounded-lg border border-slate-700 p-3">
      <p className="break-words text-sm text-white">{item.title}</p>
      <p className="mt-1 text-xs text-slate-400">{item.status}{item.targetDate ? ` · Due ${item.targetDate}` : ""}</p>
      <button type="button" disabled={locked} className="mt-2 text-sm text-sky-300 underline disabled:opacity-50" onClick={() => { setEditing(item); setTitle(item.title); setStatus(item.status); setDate(item.targetDate || ""); setMessage(""); }}>Edit milestone</button>
    </div>)}
    {["Archived", "Completed"].includes(goal.status) ? <p className="text-xs text-slate-400">Reopen this goal to change its milestones.</p> : <form onSubmit={event => { event.preventDefault(); save(); }} className="space-y-2">
      <label className="block text-xs text-slate-300">{editing ? "Milestone title" : "Add milestone"}<input required maxLength={200} className={field} disabled={locked} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-300">Milestone status<select className={field} disabled={locked} value={status} onChange={event => setStatus(event.target.value as GoalMilestoneStatus)}>{["Not Started", "In Progress", "Completed", "Skipped"].map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs text-slate-300">Milestone due date<input className={field} type="date" disabled={locked} value={date} onChange={event => setDate(event.target.value)} /></label>
      </div>
      <button type="submit" disabled={locked || !title.trim()} className="beast-button-secondary">{busy ? "Saving…" : editing ? "Save milestone" : "Add milestone"}</button>{" "}
      {editing && <button type="button" disabled={locked} className="beast-button-secondary" onClick={reset}>Cancel milestone edit</button>}
    </form>}
    {message && <p role="status" className="text-sm text-sky-200">{message}</p>}
  </section>;
}
