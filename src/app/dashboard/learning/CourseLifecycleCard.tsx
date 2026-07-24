"use client";

import { useState } from "react";
import { DashboardCard } from "@/app/components/design/DashboardPrimitives";
import {
  type CourseLifecycleAction,
  type CourseLifecycleStatus,
} from "@/lib/learning/courseLifecycle";
import { CourseLifecycleManager } from "./CourseLifecycleManager";

type CourseLifecycleCardProps = {
  courseId: string;
  courseTitle: string;
  detail: string;
  progress: number;
  status: CourseLifecycleStatus;
  canRemove: boolean;
};

export function CourseLifecycleCard({
  courseId,
  courseTitle,
  detail,
  progress,
  status: initialStatus,
  canRemove,
}: CourseLifecycleCardProps) {
  const [status, setStatus] = useState<CourseLifecycleStatus>(initialStatus);
  const [completionMessage, setCompletionMessage] = useState("");

  function handleChanged(
    action: CourseLifecycleAction,
    nextStatus: CourseLifecycleStatus | "Removed"
  ) {
    if (action === "archive" || action === "remove" || nextStatus === "Removed") {
      setCompletionMessage(
        action === "archive"
          ? `${courseTitle} was archived.`
          : `${courseTitle} was removed. Historical learning records were preserved.`
      );
      return;
    }
    setStatus(nextStatus);
  }

  if (completionMessage) {
    return (
      <DashboardCard accent="learning" className="min-w-0">
        <div className="flex min-h-[190px] items-center justify-center text-center" role="status">
          <div>
            <p className="text-lg font-black text-emerald-100">{completionMessage}</p>
            <p className="mt-2 text-sm text-[#aeb8c7]">
              Your active course list is now up to date.
            </p>
          </div>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      accent="learning"
      className="min-w-0 transition duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_18px_48px_rgba(0,0,0,0.2)] motion-reduce:transition-none"
    >
      <div className="flex h-full min-h-[190px] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full border border-indigo-300/30 bg-indigo-300/10 px-2.5 py-1 text-xs font-black text-indigo-100">
            {status}
          </span>
        </div>
        <h2 className="mt-4 break-words text-xl font-black text-white">
          {courseTitle}
        </h2>
        <p className="mt-2 break-words text-sm leading-6 text-[#aeb8c7]">
          {detail}
        </p>
        <div className="mt-4">
          <div
            className="h-2.5 overflow-hidden rounded-full bg-[#0b1018]"
            role="progressbar"
            aria-label={`${courseTitle} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.max(0, Math.min(100, progress))}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300 transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold text-[#8f9cad]">
            {progress}% complete
          </p>
        </div>
        <CourseLifecycleManager
          courseId={courseId}
          courseTitle={courseTitle}
          status={status}
          canRemove={canRemove}
          onChanged={handleChanged}
        />
      </div>
    </DashboardCard>
  );
}
