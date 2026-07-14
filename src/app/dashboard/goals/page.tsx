import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { PlatformServiceHero } from "@/app/dashboard/platformServices";
import {
  goalDatabaseTableName,
  goalOwnershipRules,
  mockGoals,
  summarizeGoals,
} from "@/lib/platform/goals";

export default function GoalsOverviewPage() {
  const summary = summarizeGoals(mockGoals);

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
            ["Blocked", String(summary.blockedGoals)],
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
            description="This foundation is intentionally light: goals can be viewed now, while deeper create/edit workflows remain future BeastOS-owned work."
          />
          <div className="mt-5 grid gap-3">
            {mockGoals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white">{goal.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">
                      {goal.summary}
                    </p>
                  </div>
                  <span className="rounded-full border border-yellow-300/40 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-100">
                    {goal.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#c7cfdb]">
                  <span className="rounded-full border border-[#2a3242] px-2.5 py-1">
                    {goal.category}
                  </span>
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
              </div>
            ))}
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
              {summary.nextSteps.map((step) => (
                <div
                  key={step}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold text-[#dbe3ef]"
                >
                  {step}
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard accent="goals">
            <SectionHeader
              eyebrow="Database"
              title={goalDatabaseTableName}
              description="The foundation database table stores user-owned BeastOS goals with minimal CRUD-ready fields."
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
      </div>
    </main>
  );
}
