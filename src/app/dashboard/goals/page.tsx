import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { PlatformServiceHero } from "@/app/dashboard/platformServices";
import { createRouteClient } from "@/lib/supabase/server";
import {
  type BeastGoalDataClient,
  type GoalLoadResult,
  type GoalReference,
  type GoalSupportItem,
  getCurrentGoalMilestone,
  getGoalProgressPercent,
  getGoalReferencesByType,
  getGoalSupportItemsByType,
  goalDatabaseTableName,
  goalMilestoneDatabaseTableName,
  goalOwnershipRules,
  goalReferenceDatabaseTableName,
  goalSupportItemDatabaseTableName,
  loadUserGoals,
  summarizeGoals,
} from "@/lib/platform/goals";

function formatGoalDate(date?: string) {
  if (!date) return "No target date";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSupportDueDate(date?: string) {
  if (!date) return null;

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function SupportItemPill({ item }: { item: GoalSupportItem }) {
  const dueDate = formatSupportDueDate(item.nextDueDate);

  return (
    <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-black text-white">{item.title}</span>
        <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-black text-[#c7cfdb]">
          {item.status}
        </span>
      </div>
      {item.summary ? (
        <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">{item.summary}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[#7f8da3]">
        {item.cadence ? <span>{item.cadence}</span> : null}
        {dueDate ? <span>Next {dueDate}</span> : null}
      </div>
    </div>
  );
}

function GoalReferencePill({ reference }: { reference: GoalReference }) {
  return (
    <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-black text-white">{reference.title}</span>
        <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-black text-[#c7cfdb]">
          {reference.type}
        </span>
      </div>
      {reference.summary ? (
        <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">
          {reference.summary}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[#7f8da3]">
        {reference.sourceModule ? <span>{reference.sourceModule}</span> : null}
        {reference.referenceDate ? <span>{reference.referenceDate}</span> : null}
        {reference.url ? <span>Linked route</span> : null}
      </div>
    </div>
  );
}

async function getGoalLoadResult(): Promise<GoalLoadResult> {
  try {
    return await loadUserGoals(
      createRouteClient() as unknown as BeastGoalDataClient
    );
  } catch {
    return {
      goals: [],
      status: "unavailable",
      message: "Goals could not be loaded right now.",
    };
  }
}

export default async function GoalsOverviewPage() {
  const goalLoadResult = await getGoalLoadResult();
  const goals = goalLoadResult.goals;
  const summary = summarizeGoals(goals);

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="goals"
          eyebrow="BeastOS Shared Service"
          title="Goals"
          description="Goals are shared Personal Hub outcomes owned by BeastOS. Modules can contribute progress without owning the goal."
          action={<ModuleBadge module="beastos" label="BeastOS Owned" />}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total Goals", String(summary.totalGoals)],
            ["Active Goals", String(summary.activeGoals)],
            ["Completed", String(summary.completedGoals)],
            [
              "Milestone Progress",
              summary.overallProgressPercent == null
                ? "No milestones"
                : `${summary.overallProgressPercent}%`,
            ],
            ["Open Blockers", String(summary.openBlockers)],
            ["Routines", String(summary.activeRecurringActions)],
            ["Requirements", String(summary.unsatisfiedRequirements)],
            ["Linked References", String(summary.linkedReferences)],
          ].map(([label, value]) => (
            <DashboardCard key={label} accent="goals">
              <div className="text-xs font-black uppercase text-[#7f8da3]">
                {label}
              </div>
              <div className="mt-2 text-3xl font-black text-white">{value}</div>
            </DashboardCard>
          ))}
        </section>

        <DashboardCard accent="goals">
          <SectionHeader
            eyebrow="Overview"
            title="Current goals"
            description="Goals show their category, status, target date, current step, and milestone progress from BeastOS-owned records."
          />
          <div className="mt-5 grid gap-3">
            {goals.length > 0 ? (
              goals.map((goal) => (
                <div key={goal.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-white">{goal.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">
                        {goal.summary || "No summary has been added yet."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-yellow-300/40 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-100">
                        {goal.status}
                      </span>
                      <span className="rounded-full border border-[#2a3242] px-3 py-1 text-xs font-black text-[#c7cfdb]">
                        {goal.category}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                      <div className="text-xs font-black uppercase text-[#7f8da3]">
                        Target Date
                      </div>
                      <div className="mt-2 text-sm font-bold text-white">
                        {formatGoalDate(goal.targetDate)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                      <div className="text-xs font-black uppercase text-[#7f8da3]">
                        Current Step
                      </div>
                      <div className="mt-2 text-sm font-bold text-white">
                        {goal.currentStep || "No current step yet"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                      <div className="text-xs font-black uppercase text-[#7f8da3]">
                        Milestone Progress
                      </div>
                      <div className="mt-2 text-sm font-bold text-white">
                        {getGoalProgressPercent(goal) == null
                          ? "No milestones yet"
                          : `${getGoalProgressPercent(goal)}% complete`}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#c7cfdb]">
                    {goal.sourceModule ? (
                      <span className="rounded-full border border-[#2a3242] px-2.5 py-1">
                        Contributed by {goal.sourceModule}
                      </span>
                    ) : null}
                    {goal.targetDate ? (
                      <span className="rounded-full border border-[#2a3242] px-2.5 py-1">
                        Target {goal.targetDate}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                    <div className="text-xs font-black uppercase text-[#7f8da3]">
                      Current Milestone
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[#dbe3ef]">
                      {getCurrentGoalMilestone(goal)?.title ||
                        "No milestone is active yet."}
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                    <div className="text-xs font-black uppercase text-[#7f8da3]">
                      Requirements And Routines
                    </div>
                    {goal.supportItems.length > 0 ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {goal.supportItems.map((item) => (
                          <SupportItemPill key={item.id} item={item} />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm font-semibold text-[#dbe3ef]">
                        No dependencies, prerequisites, blockers, or recurring
                        actions are attached yet.
                      </div>
                    )}
                  </div>
                  <div className="mt-4 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                    <div className="text-xs font-black uppercase text-[#7f8da3]">
                      Linked References
                    </div>
                    {goal.references.length > 0 ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {goal.references.map((reference) => (
                          <GoalReferencePill
                            key={reference.id}
                            reference={reference}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm font-semibold text-[#dbe3ef]">
                        No notes, documents, events, module records, Today
                        items, or Calendar items are linked yet.
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-5">
                <h2 className="text-lg font-black text-white">No goals yet</h2>
                <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                  {goalLoadResult.message ||
                    "Your BeastOS goals will appear here after real user-owned goal records exist."}
                </p>
              </div>
            )}
          </div>
        </DashboardCard>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <DashboardCard accent="beastos">
            <SectionHeader
              eyebrow="Next Steps"
              title="Shared goal actions"
              description="Goals expose next steps from BeastOS-owned records. Modules may suggest actions, but BeastOS owns the shared outcome."
            />
            <div className="mt-5 grid gap-3">
              {summary.nextSteps.length > 0 ? (
                summary.nextSteps.map((step) => (
                  <div
                    key={step}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold text-[#dbe3ef]"
                  >
                    {step}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold text-[#dbe3ef]">
                  No shared goal actions are available yet.
                </div>
              )}
            </div>
          </DashboardCard>

          <DashboardCard accent="goals">
            <SectionHeader
              eyebrow="Database"
              title={`${goalDatabaseTableName} + ${goalMilestoneDatabaseTableName}`}
              description={`BeastOS stores user-owned goal outcomes, milestone progress, support items in ${goalSupportItemDatabaseTableName}, and references in ${goalReferenceDatabaseTableName} so modules can link records without duplicating ownership.`}
            />
            <div className="mt-5 space-y-2 text-sm text-[#c7cfdb]">
              {goalOwnershipRules.map((rule) => (
                <div key={rule} className="rounded-lg border border-[#2a3242] p-3">
                  {rule}
                </div>
              ))}
            </div>
          </DashboardCard>
        </section>

        <DashboardCard accent="goals">
          <SectionHeader
            eyebrow="BO-12"
            title="Support items and linked references"
            description="These counts come only from user-owned support and reference records attached to goals. They do not create module-owned goal copies."
          />
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Dependencies", goals.flatMap((goal) => getGoalSupportItemsByType(goal, "Dependency")).length],
              ["Prerequisites", goals.flatMap((goal) => getGoalSupportItemsByType(goal, "Prerequisite")).length],
              ["Blockers", goals.flatMap((goal) => getGoalSupportItemsByType(goal, "Blocker")).length],
              ["Recurring Actions", goals.flatMap((goal) => getGoalSupportItemsByType(goal, "Recurring Action")).length],
              ["Documents", goals.flatMap((goal) => getGoalReferencesByType(goal, "Document")).length],
              ["Events", goals.flatMap((goal) => getGoalReferencesByType(goal, "Event")).length],
              ["Today", goals.flatMap((goal) => getGoalReferencesByType(goal, "Today")).length],
              ["Calendar", goals.flatMap((goal) => getGoalReferencesByType(goal, "Calendar")).length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-black uppercase text-[#7f8da3]">
                  {label}
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
