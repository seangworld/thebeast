"use client";

import { useMemo, useState } from "react";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type {
  StudySessionCommand,
  StudySessionCommandStatus,
} from "@/lib/learning/types";

function getStatusLabel(status: StudySessionCommandStatus) {
  if (status === "completed") return "Complete";
  if (status === "started") return "Started";
  return "Ready";
}

export default function StudySessionCommandCard({
  session,
}: {
  session: StudySessionCommand;
}) {
  const [status, setStatus] = useState<StudySessionCommandStatus>("idle");
  const [completedCount, setCompletedCount] = useState(0);
  const progressPercent = useMemo(() => {
    if (status === "completed") return 100;
    if (status === "started") return 50;
    return 0;
  }, [status]);

  function startSession() {
    setStatus("started");
  }

  function completeSession() {
    setStatus("completed");
    setCompletedCount((current) => current + 1);
  }

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Today"
        title="Today's Study Session"
        description="A focused command card for starting, completing, and reflecting on the next learning block."
        action={<ModuleBadge module="learning" label={getStatusLabel(status)} />}
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-xl border border-indigo-300/45 bg-indigo-300/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Current focus
              </div>
              <h3 className="mt-2 text-2xl font-black text-white">
                {session.currentFocus}
              </h3>
            </div>
            <span className="rounded-full border border-[#2a3242] bg-[#0f1419] px-3 py-1 text-sm font-black text-indigo-100">
              {session.estimatedTime}
            </span>
          </div>

          <div className="mt-5 h-2 rounded-full bg-[#0f1419]">
            <div
              className="h-full rounded-full bg-[#818cf8] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 text-xs font-bold uppercase text-[#7f8da3]">
            {progressPercent}% session progress
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startSession}
              disabled={status !== "idle"}
              className="rounded-xl border border-indigo-300/45 bg-indigo-300/15 px-4 py-3 text-sm font-black text-indigo-100 transition hover:bg-indigo-300/20 disabled:cursor-not-allowed disabled:border-[#2a3242] disabled:bg-[#111827] disabled:text-[#7f8da3]"
            >
              Mark Started
            </button>
            <button
              type="button"
              onClick={completeSession}
              disabled={status !== "started"}
              className="rounded-xl border border-green-400/40 bg-green-400/15 px-4 py-3 text-sm font-black text-green-100 transition hover:bg-green-400/20 disabled:cursor-not-allowed disabled:border-[#2a3242] disabled:bg-[#111827] disabled:text-[#7f8da3]"
            >
              Mark Complete
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Warm-up prompt
            </div>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {session.warmUpPrompt}
            </p>
          </div>
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Guided practice
            </div>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {session.guidedPracticeStep}
            </p>
          </div>
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Reflection checkpoint
            </div>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {session.reflectionCheckpoint}
            </p>
          </div>

          {status === "completed" ? (
            <div className="rounded-xl border border-green-400/35 bg-green-400/10 p-4">
              <div className="text-xs font-bold uppercase text-green-100">
                Progress feedback
              </div>
              <p className="mt-2 text-sm font-semibold leading-5 text-green-100">
                {session.progressFeedback}
              </p>
              <div className="mt-3 text-xs font-bold uppercase text-[#7f8da3]">
                Local completions this visit: {completedCount}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardCard>
  );
}
