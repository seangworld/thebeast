"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LearningGoal } from "@/lib/learning/types";

function statusLabel(status: LearningGoal["status"]) {
  if (status === "Paused") return "Archived";
  return status;
}

export default function LearningGoalsManager({
  initialGoals,
}: {
  initialGoals: LearningGoal[];
}) {
  const router = useRouter();
  const [goals, setGoals] = useState(initialGoals);
  const [busyGoalId, setBusyGoalId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function updateGoalStatus(
    goalId: string,
    status: LearningGoal["status"],
    priority: LearningGoal["priority"] = "Medium"
  ) {
    const supabase = createClient();
    const result = await supabase
      .from("learning_goals")
      .update({ status, priority })
      .eq("id", goalId);

    if (result.error) throw result.error;
  }

  async function archiveGoal(goal: LearningGoal) {
    setBusyGoalId(goal.id);
    setMessage("");

    try {
      await updateGoalStatus(goal.id, "Paused", "Low");
      setGoals((current) =>
        current.map((item) =>
          item.id === goal.id ? { ...item, status: "Paused", priority: "Low" } : item
        )
      );
      setMessage(`${goal.title} is archived. Progress stays saved.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to archive this goal.");
    } finally {
      setBusyGoalId(null);
    }
  }

  async function resumeGoal(goal: LearningGoal) {
    setBusyGoalId(goal.id);
    setMessage("");

    try {
      await updateGoalStatus(goal.id, "Planned", "Medium");
      setGoals((current) =>
        current.map((item) =>
          item.id === goal.id ? { ...item, status: "Planned", priority: "Medium" } : item
        )
      );
      setMessage(`${goal.title} is available again. Switch to it when you want it to lead.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to resume this goal.");
    } finally {
      setBusyGoalId(null);
    }
  }

  async function switchActiveGoal(goal: LearningGoal) {
    setBusyGoalId(goal.id);
    setMessage("");

    try {
      const currentlyActive = goals.filter(
        (item) => item.status === "Active" && item.id !== goal.id
      );

      await Promise.all([
        ...currentlyActive.map((item) => updateGoalStatus(item.id, "Planned", "Medium")),
        updateGoalStatus(goal.id, "Active", "High"),
      ]);

      setGoals((current) =>
        current.map((item) => {
          if (item.id === goal.id) return { ...item, status: "Active", priority: "High" };
          if (item.status === "Active") return { ...item, status: "Planned", priority: "Medium" };
          return item;
        })
      );
      setMessage(`${goal.title} is now your active Learning Goal.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to switch goals.");
    } finally {
      setBusyGoalId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {message ? (
        <div className="rounded-2xl border border-indigo-300/30 bg-indigo-300/10 p-4 text-sm font-bold text-indigo-50 shadow-[0_12px_32px_rgba(0,0,0,0.16)]" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}

      {goals.length > 0 ? (
        goals.map((goal) => (
          <article
            key={goal.id}
            className="rounded-2xl border border-[#2a3242] bg-gradient-to-br from-[#111827] to-[#0e141e] p-4 transition duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-indigo-300/25 motion-safe:hover:shadow-[0_18px_48px_rgba(0,0,0,0.2)] motion-reduce:transition-none sm:p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-indigo-300/30 bg-indigo-300/10 px-3 py-1 text-xs font-black text-indigo-100">
                    {statusLabel(goal.status)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-[#dbe3ef]">
                    {goal.category}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-black text-white">{goal.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">{goal.target}</p>
                <div
                  className="mt-5 h-2.5 max-w-md overflow-hidden rounded-full bg-[#0f1419]"
                  role="progressbar"
                  aria-label={`${goal.title} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(Math.max(goal.progress, 0), 100)}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300 transition-[width] duration-700 motion-reduce:transition-none"
                    style={{ width: `${Math.min(Math.max(goal.progress, 0), 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-bold uppercase text-[#7f8da3]">
                  {goal.progress}% progress preserved
                </p>
              </div>

              <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap lg:max-w-xs lg:justify-end">
                <Link href="/dashboard/education#mentor-session" className="beast-button w-full justify-center sm:w-auto">
                  Resume Goal
                </Link>
                <button
                  type="button"
                  onClick={() => switchActiveGoal(goal)}
                  disabled={busyGoalId === goal.id || goal.status === "Active"}
                  className="beast-button-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  Switch Active Goal
                </button>
                {goal.status === "Paused" ? (
                  <button
                    type="button"
                    onClick={() => resumeGoal(goal)}
                    disabled={busyGoalId === goal.id}
                    className="beast-button-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    Restore Goal
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => archiveGoal(goal)}
                    disabled={busyGoalId === goal.id}
                    className="beast-button-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    Archive Goal
                  </button>
                )}
              </div>
            </div>
          </article>
        ))
      ) : (
        <div className="rounded-3xl border border-dashed border-[#343e50] bg-gradient-to-br from-[#111827] to-[#0e141e] p-6 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-300/25 bg-indigo-300/10 font-black text-indigo-100" aria-hidden="true">G</div>
          <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">No Learning Goals yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#c7cfdb]">
            Add a Learning Goal and your Guidance Counselor will create the first plan.
          </p>
        </div>
      )}
    </div>
  );
}
