"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getCourseLifecycleActions,
  getCourseLifecycleUpdate,
  type CourseLifecycleAction,
  type CourseLifecycleStatus,
} from "@/lib/learning/courseLifecycle";

type CourseLifecycleManagerProps = {
  courseId: string;
  courseTitle: string;
  status: CourseLifecycleStatus;
  canRemove: boolean;
  onChanged?: (
    action: CourseLifecycleAction,
    status: CourseLifecycleStatus | "Removed"
  ) => void;
};

const actionLabels: Record<CourseLifecycleAction, string> = {
  resume: "Resume",
  pause: "Pause",
  archive: "Archive",
  remove: "Remove",
};

export function CourseLifecycleManager({
  courseId,
  courseTitle,
  status,
  canRemove,
  onChanged,
}: CourseLifecycleManagerProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] =
    useState<CourseLifecycleAction | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const actions = getCourseLifecycleActions(status);

  function lifecycleError(message: string) {
    const normalized = message.toLowerCase();
    if (normalized.includes("not permitted") || normalized.includes("permission")) {
      return "You do not have permission to update this course.";
    }
    if (normalized.includes("schema cache") || normalized.includes("column")) {
      return "Course management is temporarily unavailable. Please try again after the database update.";
    }
    return "We couldn’t update this course. Your current course state was preserved.";
  }

  async function runAction(action: CourseLifecycleAction) {
    if (action === "remove") {
      setConfirmingRemoval(true);
      return;
    }

    setPendingAction(action);
    setError("");
    setSuccess("");
    const supabase = createClient();
    const update = getCourseLifecycleUpdate(action);
    const result = await supabase
      .from("learning_courses")
      .update(update)
      .eq("id", courseId)
      .select("id")
      .maybeSingle();

    if (result.error) {
      setError(lifecycleError(result.error.message));
      setPendingAction(null);
      return;
    }
    if (!result.data) {
      setError("You do not have permission to update this course.");
      setPendingAction(null);
      return;
    }

    setPendingAction(null);
    const nextStatus = action === "pause" ? "Paused" : action === "archive" ? "Archived" : "Active";
    setSuccess(
      action === "pause"
        ? "Course paused."
        : action === "archive"
          ? "Course archived and removed from your active list."
          : "Course resumed."
    );
    onChanged?.(action, nextStatus);
    router.refresh();
  }

  async function removeCourse() {
    setPendingAction("remove");
    setError("");
    setSuccess("");
    const supabase = createClient();
    const result = await supabase.rpc("remove_learning_course", {
      p_course_id: courseId,
    });

    if (result.error) {
      setError(lifecycleError(result.error.message));
      setPendingAction(null);
      return;
    }

    setConfirmingRemoval(false);
    setPendingAction(null);
    setSuccess("Course removed. Your learning history remains available.");
    onChanged?.("remove", "Removed");
    router.refresh();
  }

  return (
    <>
      <div className="mt-auto flex flex-wrap gap-2 pt-5" aria-label={`${courseTitle} actions`}>
        {actions.map((action) => {
          if (action === "remove" && !canRemove) return null;
          const isPending = pendingAction === action;
          return (
            <button
              key={action}
              type="button"
              className={
                action === "remove"
                  ? "rounded-lg border border-red-300/30 px-3 py-2 text-sm font-black text-red-200 transition hover:border-red-200 hover:text-white disabled:opacity-60"
                  : action === "resume"
                    ? "beast-button px-3 py-2 text-sm"
                    : "beast-button-secondary px-3 py-2 text-sm"
              }
              disabled={pendingAction !== null}
              onClick={() => void runAction(action)}
            >
              {isPending ? `${actionLabels[action]}…` : actionLabels[action]}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-3 text-sm font-bold text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 text-sm font-bold text-emerald-200" role="status">
          {success}
        </p>
      ) : null}
      {confirmingRemoval ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !pendingAction) {
              setConfirmingRemoval(false);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`remove-course-${courseId}`}
            aria-describedby={`remove-course-impact-${courseId}`}
            className="w-full max-w-lg rounded-2xl border border-red-300/25 bg-[#111722] p-6 shadow-2xl"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-200">
              Confirm removal
            </p>
            <h2
              id={`remove-course-${courseId}`}
              className="mt-2 text-2xl font-black text-white"
            >
              Remove {courseTitle}?
            </h2>
            <p
              id={`remove-course-impact-${courseId}`}
              className="mt-3 text-sm leading-6 text-[#c7cfdb]"
            >
              This removes the course from your workspace. Earned achievements,
              certificates, completed history, and other historical records are
              preserved. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="beast-button-secondary justify-center"
                disabled={pendingAction !== null}
                onClick={() => setConfirmingRemoval(false)}
              >
                Keep course
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-60"
                disabled={pendingAction !== null}
                onClick={() => void removeCourse()}
              >
                {pendingAction === "remove" ? "Removing…" : "Remove course"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
