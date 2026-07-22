import {
  DashboardCard,
  GuidedEmptyState,
  ModuleBadge,
  SectionHeader,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";

type PlatformPlaceholderPageProps = {
  title: string;
  description: string;
  examples: string[];
  module?: ModuleKey;
};

export function PlatformPlaceholderPage({
  title,
  description,
  examples,
  module = "beastos",
}: PlatformPlaceholderPageProps) {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="space-y-4">
            <p className="beast-kicker">BeastOS Shell</p>
            <h1 className="beast-title">{title}</h1>
            <p className="beast-subtitle">{description}</p>
          </div>
        </section>

        <DashboardCard accent={module}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <SectionHeader title="Guided foundation" description="Use the suggested next step now; deeper engines and persistence remain future work." />
            <ModuleBadge module={module} label="Shell Ready" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {examples.map((example) => (
              <div
                key={example}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm text-[#c7cfdb]"
              >
                {example}
              </div>
            ))}
          </div>
          <div className="mt-5"><GuidedEmptyState title={`${title} is ready for discovery`} description="This foundation is intentionally limited, but it is not a dead end." guidance="Start in Today so BeastOS can guide the next available source-owned action." nextAction={{ label: "Open Today", href: "/dashboard/today" }} secondaryAction={{ label: "Return to dashboard", href: "/dashboard" }} /></div>
        </DashboardCard>
      </div>
    </main>
  );
}
