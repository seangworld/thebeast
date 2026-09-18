import { DashboardCard } from "@/app/components/design/DashboardPrimitives";
import { PlatformServiceHero } from "@/app/dashboard/platformServices";
import { LifePlanningHub } from "./LifePlanningHub";
import { createRouteClient } from "@/lib/supabase/server";
import { type BeastGoalDataClient, type GoalLoadResult, loadUserGoals, summarizeGoals } from "@/lib/platform/goals";
import { getContextualWorkspaceConfig, goalMatchesContext } from "@/lib/platform/contextualWorkspaces";

async function getGoalLoadResult(): Promise<GoalLoadResult> {
  try { return await loadUserGoals(createRouteClient() as unknown as BeastGoalDataClient); }
  catch { return { goals: [], status: "unavailable", message: "Your goals could not be loaded. Please refresh and try again." }; }
}

export default async function GoalsOverviewPage({ searchParams }: { searchParams?: Promise<{ module?: string }> }) {
  const params = await searchParams;
  const result = await getGoalLoadResult();
  const context = getContextualWorkspaceConfig(params?.module);
  const goals = context ? result.goals.filter(goal => goalMatchesContext(goal, context)) : result.goals;
  const summary = summarizeGoals(goals);
  return <main className="beast-page">
    <div className="beast-container space-y-6">
      <PlatformServiceHero module="goals" eyebrow="Make a plan. Take the next step." title={context?.goalsLabel || "Your goals"}
        description={context ? `Set goals for ${context.applicationName}, break them into manageable steps, and see your progress.` : "Keep what matters in sight—from your health and education to your money, home, and personal plans."} />
      {result.status === "unavailable" || result.status === "signed-out" ? <p role="alert" className="rounded-xl border border-amber-500 p-4 text-sm text-amber-100">{result.message}</p> : null}
      <section aria-label="Goals at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Goals", summary.totalGoals], ["In progress", summary.activeGoals], ["Completed", summary.completedGoals], ["Milestones finished", goals.flatMap(goal => goal.milestones).filter(item => item.status === "Completed").length]].map(([label, value]) => <DashboardCard key={label} accent="goals"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></DashboardCard>)}
      </section>
      <LifePlanningHub initialGoals={goals} context={context} />
    </div>
  </main>;
}
