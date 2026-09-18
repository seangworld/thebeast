import type { GoalCategory } from "./goals";
export const goalConnectionLabels = { money: "Money", learning: "Education & Career", health: "Health & Fitness", home: "Home" } as const;
export type GoalConnection = keyof typeof goalConnectionLabels;
const prefix = "goal-connection:";
export function categoryConnection(category: GoalCategory): GoalConnection | undefined {
  return category === "Money" ? "money" : category === "Education" || category === "Career" ? "learning" : category === "Health" ? "health" : category === "Home" ? "home" : undefined;
}
export function getGoalConnections(goal: { category: GoalCategory; tags?: string[] }) {
  const result = new Set<GoalConnection>();
  const primary = categoryConnection(goal.category); if (primary) result.add(primary);
  for (const key of Object.keys(goalConnectionLabels) as GoalConnection[]) if ((goal.tags || []).includes(prefix + key)) result.add(key);
  return Array.from(result);
}
export function suggestGoalConnections(title: string, category: GoalCategory) {
  const result = new Set(getGoalConnections({ category }));
  if (/\b(salary|income|pay raise|higher pay|earn|make)\b/i.test(title) && /\b(salary|income|pay|year|annually)\b|\$|\d/i.test(title)) { result.add("money"); result.add("learning"); }
  if (/\b(debt|budget|savings|save money|mortgage|retire|retirement)\b/i.test(title)) result.add("money");
  if (/\b(school|college|degree|certification|career|promotion|job|study)\b/i.test(title)) result.add("learning");
  if (/\b(weight|fitness|exercise|workout|health|sleep|walk|running)\b/i.test(title) || /\b(lose|gain)\s+\d+\s*(pounds|lbs|kg)\b/i.test(title)) result.add("health");
  return Array.from(result);
}
export function goalTagsWithConnections(tags: string, connections: GoalConnection[]) {
  return Array.from(new Set([...tags.split(",").map(tag => tag.trim()).filter(tag => tag && !tag.startsWith(prefix)), ...connections.map(key => prefix + key)]));
}
export function visibleGoalTags(tags: string[] = []) { return tags.filter(tag => !tag.startsWith(prefix)); }
/** Static filters only: goals are aspirations, never actual income/health profile records. */
export const advisorGoalFilters: Record<GoalConnection, string> = {
  money: 'category.eq.Money,tags.cs.{goal-connection:money}',
  learning: 'category.in.(Education,Career),tags.cs.{goal-connection:learning}',
  health: 'category.eq.Health,tags.cs.{goal-connection:health}',
  home: 'category.eq.Home,tags.cs.{goal-connection:home}',
};
export const advisorGoalColumns = "id,title,category,status,target_date,progress,current_step,summary,updated_at";
