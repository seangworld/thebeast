import {
  DashboardCard,
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
            <SectionHeader
              title="Coming Soon"
              description="This workspace is part of the BeastOS platform shell. Engines, persistence, and automation will be added in a future sprint."
            />
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
        </DashboardCard>
      </div>
    </main>
  );
}
