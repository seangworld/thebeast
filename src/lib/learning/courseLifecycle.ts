export const courseLifecycleStatuses = [
  "Active",
  "Paused",
  "Archived",
  "Completed",
] as const;

export type CourseLifecycleStatus = (typeof courseLifecycleStatuses)[number];

export type CourseLifecycleAction = "resume" | "pause" | "archive" | "remove";
export type CourseLifecycleState = "active" | "paused" | "archived" | "removed";

export function normalizeCourseLifecycleStatus(
  value: unknown,
  lifecycleState?: unknown
): CourseLifecycleStatus {
  const normalized = String(lifecycleState || value || "").trim().toLowerCase();
  if (normalized === "paused") return "Paused";
  if (normalized === "archived") return "Archived";
  if (normalized === "completed") return "Completed";
  return "Active";
}

export function getCourseLifecycleActions(
  status: CourseLifecycleStatus
): CourseLifecycleAction[] {
  if (status === "Archived") return ["resume", "remove"];
  if (status === "Paused") return ["resume", "archive", "remove"];
  if (status === "Completed") return ["archive", "remove"];
  return ["resume", "pause", "archive", "remove"];
}

export function canRemoveCourse(input: {
  actorId: string;
  courseOwnerId: string;
  actorRole?: string | null;
}) {
  return (
    input.actorId === input.courseOwnerId ||
    String(input.actorRole || "").toLowerCase() === "admin"
  );
}

export function getCourseLifecycleUpdate(action: Exclude<CourseLifecycleAction, "remove">) {
  const timestamp = new Date().toISOString();

  if (action === "pause") {
    return {
      status: "Paused" as const,
      lifecycle_state: "paused" as const,
      paused_at: timestamp,
      archived_at: null,
      removed_at: null,
    };
  }
  if (action === "archive") {
    return {
      status: "Archived" as const,
      lifecycle_state: "archived" as const,
      paused_at: null,
      archived_at: timestamp,
      removed_at: null,
    };
  }
  return {
    status: "Active" as const,
    lifecycle_state: "active" as const,
    paused_at: null,
    archived_at: null,
    removed_at: null,
  };
}
