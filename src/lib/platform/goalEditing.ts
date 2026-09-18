import { categoryConnection, getGoalConnections } from "./goalConnections";
import { goalCategories, goalStatuses, type Goal, type GoalMilestoneStatus } from "./goals";

export function goalDraftError(draft: { title: string; category: string; status: string; progress: string; targetDate: string; customCategory: string }) {
  if (!draft.title.trim() || draft.title.trim().length > 200) return "Use a goal title between 1 and 200 characters.";
  if (!goalCategories.includes(draft.category as Goal["category"]) || !goalStatuses.includes(draft.status as Goal["status"])) return "Choose a valid category and status.";
  if (draft.customCategory.trim().length > 100) return "Keep the custom category under 100 characters.";
  if (draft.progress.trim() && (!/^\d+$/.test(draft.progress.trim()) || Number(draft.progress) > 100)) return "Progress must be a whole number from 0 to 100, or blank for milestone-based progress.";
  if (draft.targetDate && !validGoalDate(draft.targetDate)) return "Choose a valid target date.";
  return null;
}
export function validGoalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function milestonePatch(title: string, status: GoalMilestoneStatus, date: string, now: string, priorCompletedAt?: string) {
  if (!title.trim() || title.trim().length > 200) throw new Error("Use a milestone title between 1 and 200 characters.");
  if (!["Not Started", "In Progress", "Completed", "Skipped"].includes(status)) throw new Error("Choose a valid milestone status.");
  if (date && !validGoalDate(date)) throw new Error("Choose a valid milestone date.");
  return { title: title.trim(), status, target_date: date || null, completed_at: status === "Completed" ? priorCompletedAt || now : null, updated_at: now };
}
/** Follow-up metadata failures must never invite repeating an already-saved goal. */
export async function goalFollowup(work: () => PromiseLike<{ error: unknown }>) {
  try { return !!(await work()).error; } catch { return true; }
}

export function safeGoalLink(value?: string) {
  if (!value || /[\\\s]/.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; } catch { return null; }
}

export const goalAreas = ["All goals", "School", "Career", "Weight", "Health", "Finances", "Home", "Family", "Personal", "Projects", "Other"] as const;
export type GoalArea = typeof goalAreas[number];
export const goalHorizons = ["Any time", "Next year", "Next 5 years", "Next 10 years", "Overdue", "No target date"] as const;
export type GoalHorizon = typeof goalHorizons[number];
export function goalAreaDefaults(area: GoalArea): { category: Goal["category"]; tags: string } | null {
  const categories: Record<Exclude<GoalArea, "All goals">, Goal["category"]> = { School: "Education", Career: "Career", Weight: "Health", Health: "Health", Finances: "Money", Home: "Home", Family: "Family", Personal: "Personal", Projects: "Project", Other: "Other" };
  return area === "All goals" ? null : { category: categories[area], tags: area === "Weight" ? "weight" : "" };
}
export function matchesGoalArea(goal: Goal, area: GoalArea) {
  const defaults = goalAreaDefaults(area);
  if (!defaults) return true;
  const connection = categoryConnection(defaults.category);
  if (goal.category !== defaults.category && (!connection || !getGoalConnections(goal).includes(connection))) return false;
  return area !== "Weight" || (goal.tags || []).some(tag => /^(weight|weight loss|weight gain)$/i.test(tag)) || /\bweight\b|\b(lose|gain)\s+\d+\s*(pounds|lbs|kg)\b/i.test(goal.title);
}
export function matchesGoalHorizon(goal: Goal, horizon: GoalHorizon, today = new Date()) {
  if (horizon === "Any time") return true;
  if (horizon === "No target date") return !goal.targetDate;
  if (!goal.targetDate || !validGoalDate(goal.targetDate)) return false;
  const pad = (number: number) => String(number).padStart(2, "0");
  const dateKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  if (horizon === "Overdue") return goal.targetDate < dateKey && !["Completed", "Archived"].includes(goal.status);
  const years = horizon === "Next year" ? 1 : horizon === "Next 5 years" ? 5 : 10;
  // Clamp leap day to the last day of February in the target year.
  const year = today.getFullYear() + years;
  const day = Math.min(today.getDate(), new Date(year, today.getMonth() + 1, 0).getDate());
  const end = `${year}-${pad(today.getMonth() + 1)}-${pad(day)}`;
  return goal.targetDate >= dateKey && goal.targetDate <= end;
}

/** Review every three calendar months after a goal is saved or confirmed. */
export function goalReviewDate(goal: Pick<Goal, "status" | "updatedAt" | "createdAt" | "deletedAt">) {
  if (goal.deletedAt || ["Completed", "Archived"].includes(goal.status)) return null;
  const value = goal.updatedAt || goal.createdAt;
  if (!value || !validGoalDate(value.slice(0, 10))) return null;
  const base = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  const day = base.getUTCDate();
  base.setUTCDate(1);
  base.setUTCMonth(base.getUTCMonth() + 3);
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(day, end));
  return base.toISOString().slice(0, 10);
}
export function goalReviewDue(goal: Pick<Goal, "status" | "updatedAt" | "createdAt" | "deletedAt">, today = new Date()) {
  const due = goalReviewDate(goal);
  return !!due && due <= today.toISOString().slice(0, 10);
}
