import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";
import {
  ModuleFilterRail,
  PlatformServiceHero,
} from "@/app/dashboard/platformServices";

const recentSearches = [
  "upcoming bills",
  "cashflow buffer",
  "debt payoff plan",
  "uploaded tax documents",
];

const suggestedSearches = [
  "What needs attention today?",
  "Show all Money alerts",
  "Find future health reminders",
  "Search project blockers",
  "Find uploaded files",
];

const resultSections: {
  label: string;
  module: ModuleKey;
  description: string;
  examples: string[];
}[] = [
  {
    label: "Global",
    module: "search",
    description: "Search across every connected BeastOS module.",
    examples: ["Timeline entries", "Notifications", "Uploads", "Records"],
  },
  {
    label: "Money",
    module: "money",
    description: "Find bills, debts, income records, and financial workspaces.",
    examples: ["Bills", "Debts", "Cashflow", "Velocity"],
  },
  {
    label: "Learning",
    module: "beastos",
    description: "Future search for courses, notes, study sessions, and goals.",
    examples: ["Courses", "Notes", "Reading", "Study blocks"],
  },
  {
    label: "Health",
    module: "health",
    description: "Future search for routines, appointments, and health entries.",
    examples: ["Habits", "Appointments", "Check-ins", "Vitals"],
  },
  {
    label: "Projects",
    module: "projects",
    description: "Future search for tasks, milestones, decisions, and blockers.",
    examples: ["Tasks", "Milestones", "Decisions", "Blockers"],
  },
  {
    label: "Documents",
    module: "documents",
    description: "Future search across uploads, records, and extracted metadata.",
    examples: ["Files", "Receipts", "Policies", "Statements"],
  },
];

export default function SearchPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="search"
          eyebrow="Shared Service"
          title="BeastOS Search"
          description="A production-ready search surface for global queries, module results, uploads, and future knowledge retrieval."
        />

        <DashboardCard accent="search">
          <SectionHeader
            eyebrow="Search"
            title="Global command search"
            description="The backend search engine arrives later. This layout establishes the shared result model and module filters now."
          />
          <div className="mt-5 rounded-2xl border border-[#2a3242] bg-[#0f1419] p-4">
            <div className="flex min-h-14 items-center rounded-xl border border-[#38bdf8]/35 bg-[#111827] px-4 text-lg font-semibold text-[#7f8da3]">
              Search BeastOS, Money, uploads, projects, health, and documents
            </div>
            <div className="mt-4">
              <ModuleFilterRail />
            </div>
          </div>
        </DashboardCard>

        <section className="grid gap-4 lg:grid-cols-2">
          <DashboardCard accent="blue">
            <SectionHeader title="Recent searches" />
            <div className="mt-5 grid gap-3">
              {recentSearches.map((search) => (
                <div
                  key={search}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold text-[#dbe3ef]"
                >
                  {search}
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard accent="purple">
            <SectionHeader title="Suggested searches" />
            <div className="mt-5 grid gap-3">
              {suggestedSearches.map((search) => (
                <div
                  key={search}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold text-[#dbe3ef]"
                >
                  {search}
                </div>
              ))}
            </div>
          </DashboardCard>
        </section>

        <DashboardCard accent="search">
          <SectionHeader
            eyebrow="Results"
            title="Result layout"
            description="Search results are grouped by module so global search can scale without becoming noisy."
            action={<ModuleBadge module="money" label="Money Ready" />}
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resultSections.map((section) => {
              const accent = moduleAccents[section.module];

              return (
                <div
                  key={section.label}
                  className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-white">
                        {section.label}
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">
                        {section.description}
                      </p>
                    </div>
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ background: accent.color }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {section.examples.map((example) => (
                      <span
                        key={example}
                        className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
