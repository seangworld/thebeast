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
import {
  buildRecentSearches,
  buildSavedSearch,
  buildSearchActionRequest,
  buildUniversalSearchIndex,
  interpretNaturalLanguageSearch,
  searchContractRules,
  searchPlatformIndex,
  type PlatformSearchItem,
} from "@/lib/platform/search";

const rawRecentSearches = [
  "upcoming bills",
  "cashflow buffer",
  "debt payoff plan",
  "uploaded tax documents",
  "cashflow buffer",
];

const suggestedSearches = [
  "What needs attention today?",
  "Show all Money alerts",
  "Find my next learning step",
  "Review upcoming bills",
];

const searchItems: PlatformSearchItem[] = [
  {
    id: "search-personal-hub-profile",
    source: "beastos",
    sourceRecordId: "personal-hub-profile",
    domain: "Personal Hub",
    title: "Personal Hub profile",
    summary: "Identity, preferences, AI context, and notification settings.",
    keywords: ["profile", "settings", "preferences", "ai context"],
    href: "/dashboard/profile",
    permissionScope: "Owner",
    updatedAt: "2026-07-17T12:00:00.000Z",
    actions: [{ type: "Open", label: "Open profile", href: "/dashboard/profile" }],
  },
  {
    id: "search-money-cashflow",
    source: "money",
    sourceRecordId: "cashflow-workspace",
    domain: "Money",
    title: "Cashflow buffer",
    summary: "Review bills, income timing, and current operating cash posture.",
    keywords: ["upcoming bills", "cashflow", "buffer", "money alerts"],
    href: "/dashboard/money/cashflow",
    permissionScope: "Owner",
    updatedAt: "2026-07-17T13:00:00.000Z",
    actions: [
      { type: "Open", label: "Open Cashflow", href: "/dashboard/money/cashflow" },
      { type: "Review", label: "Review Money alerts", href: "/dashboard/money" },
    ],
  },
  {
    id: "search-learning-next-step",
    source: "learning",
    sourceRecordId: "mentor-next-step",
    domain: "Learning",
    title: "Next learning step",
    summary: "Resume the current Mentor-guided learning activity.",
    keywords: ["mentor", "lesson", "study", "learning"],
    href: "/dashboard/learning",
    permissionScope: "Owner",
    updatedAt: "2026-07-17T11:30:00.000Z",
    actions: [
      { type: "Resume", label: "Resume learning", href: "/dashboard/learning" },
    ],
  },
  {
    id: "search-documents-tax",
    source: "documents",
    sourceRecordId: "uploaded-tax-documents",
    domain: "Documents",
    title: "Uploaded tax documents",
    summary: "Find uploaded document references through the BeastOS-owned index.",
    keywords: ["uploaded", "tax", "documents", "files"],
    href: "/dashboard/uploads",
    permissionScope: "Owner",
    updatedAt: "2026-07-17T10:00:00.000Z",
    actions: [{ type: "Open", label: "Open Uploads", href: "/dashboard/uploads" }],
  },
];

export default function SearchPage() {
  const recentSearches = buildRecentSearches(rawRecentSearches);
  const savedSearches = [
    buildSavedSearch({
      id: "saved-money-alerts",
      label: "Money alerts",
      query: "money alerts",
      filters: { module: "money" },
    }),
    buildSavedSearch({
      id: "saved-uploaded-documents",
      label: "Uploaded documents",
      query: "uploaded documents",
      filters: { domain: "Documents" },
    }),
  ];
  const naturalLanguageIntent = interpretNaturalLanguageSearch("Show all Money alerts");
  const index = buildUniversalSearchIndex(searchItems);
  const results = searchPlatformIndex({
    items: index,
    query: naturalLanguageIntent.interpretedQuery,
    filters: naturalLanguageIntent.suggestedFilters,
    allowedPermissionScopes: ["Owner"],
  });
  const actionPreview = buildSearchActionRequest({
    item: results[0] ?? index[0],
    actionType: "Open",
  });

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="search"
          eyebrow="Shared Service"
          title="BeastOS Search"
          description="A search surface for current BeastOS, BeastMoney, and BeastLearning paths."
        />

        <DashboardCard accent="search">
          <SectionHeader
            eyebrow="Search"
            title="Global command search"
            description="Use this as a focused starting point for active Money and Learning work."
          />
          <div className="mt-5 rounded-2xl border border-[#2a3242] bg-[#0f1419] p-4">
            <div className="flex min-h-14 items-center rounded-xl border border-[#38bdf8]/35 bg-[#111827] px-4 text-lg font-semibold text-[#7f8da3]">
              Search BeastOS, Money, and Learning
            </div>
            <div className="mt-4">
              <ModuleFilterRail />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ["Indexed", index.length],
                ["Owner-visible", results.length],
                ["Recent", recentSearches.length],
                ["Saved", savedSearches.length],
              ].map(([label, count]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-3"
                >
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    {label}
                  </div>
                  <div className="mt-1 text-xl font-black text-white">{count}</div>
                </div>
              ))}
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
            <SectionHeader title="Saved and suggested searches" />
            <div className="mt-5 grid gap-3">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold text-[#dbe3ef]"
                >
                  {search.label}: {search.query}
                </div>
              ))}
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
            title="Permissioned results"
            description="Search results are grouped by source and permission scope so global search can scale without becoming noisy."
            action={<ModuleBadge module="money" label="Money Ready" />}
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((result) => {
              const accent = moduleAccents[result.source as ModuleKey];

              return (
                <div
                  key={result.id}
                  className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-white">
                        {result.title}
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">
                        {result.summary}
                      </p>
                    </div>
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ background: accent.color }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[result.domain, result.permissionScope, ...result.matchedFields].map((example) => (
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

        <DashboardCard accent="search">
          <SectionHeader
            eyebrow="Actions"
            title="Natural-language search and action routing"
            description="Natural-language searches become filters and route requests while source modules keep their business logic."
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Interpreted query
              </div>
              <div className="mt-2 text-sm font-bold text-white">
                {naturalLanguageIntent.interpretedQuery}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Action request
              </div>
              <div className="mt-2 text-sm font-bold text-white">
                {actionPreview.dispatchMode}
              </div>
              <div className="mt-1 text-xs font-semibold text-[#9aa6b6]">
                Source: {actionPreview.source}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Ownership
              </div>
              <div className="mt-2 text-sm font-bold text-white">
                Source preserved: {String(actionPreview.sourceOwnershipPreserved)}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {searchContractRules.map((rule) => (
              <div
                key={rule}
                className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4 text-sm font-semibold text-[#d8dee8]"
              >
                {rule}
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
