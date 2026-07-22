import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";
import Link from "next/link";
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
import type { SharedAIContextItem } from "@/lib/platform/sharedAI";
import {
  buildMobileSearchCards,
  buildMobileSharedAICards,
  buildMobileSharedServiceSummary,
} from "@/lib/mobileSharedServices";

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
    summary: "Resume the current Guidance Counselor-guided learning activity.",
    keywords: ["mentor", "lesson", "study", "learning"],
    href: "/dashboard/education",
    permissionScope: "Owner",
    updatedAt: "2026-07-17T11:30:00.000Z",
    actions: [
      { type: "Resume", label: "Resume education plan", href: "/dashboard/education" },
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

const sharedAIContextItems: SharedAIContextItem[] = [
  {
    id: "shared-ai-money-context",
    kind: "Module",
    source: "money",
    sourceRecordId: "cashflow-workspace",
    summary: "Money alerts and upcoming obligations are available for daily guidance.",
    permission: "Allowed",
    retention: "Session",
  },
  {
    id: "shared-ai-learning-context",
    kind: "Module",
    source: "learning",
    sourceRecordId: "mentor-next-step",
    summary: "The current Guidance Counselor step can be referenced by shared AI.",
    permission: "Allowed",
    retention: "Session",
  },
  {
    id: "shared-ai-restricted-context",
    kind: "Document",
    source: "documents",
    sourceRecordId: "restricted-upload",
    summary: "Restricted uploads require explicit owner permission.",
    permission: "Restricted",
    retention: "Session",
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
  const mobileSearchCards = buildMobileSearchCards(results, 3);
  const mobileSharedAICards = buildMobileSharedAICards(sharedAIContextItems);
  const mobileSummary = buildMobileSharedServiceSummary({
    todayCount: 0,
    notificationCount: 0,
    calendarCount: 0,
    searchCount: results.length,
  });

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="search"
          eyebrow="Shared Service"
          title="BeastOS Search"
          description="A search surface for current BeastOS, BeastMoney, and BeastEducation paths."
        />

        <section
          className="space-y-3 md:hidden"
          data-mobile-shared-service="search"
        >
          <div className="rounded-xl border border-[#38bdf8]/35 bg-[#111827] p-4">
            <div className="text-xs font-black uppercase text-[#7f8da3]">
              Quick search
            </div>
            <div className="mt-3 min-h-[48px] rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold text-[#c7cfdb]">
              Search BeastOS, Money, Learning, uploads, and alerts
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {mobileSummary.slice(2).map((item) => (
              <div
                key={item.label}
                className="min-w-0 rounded-lg border border-[#2a3242] bg-[#111827] p-3"
              >
                <div className="truncate text-[10px] font-black uppercase text-[#7f8da3]">
                  {item.label}
                </div>
                <div className="mt-1 text-xl font-black text-white">{item.value}</div>
                <div className="mt-1 truncate text-[11px] font-semibold text-[#9aa7b8]">
                  {item.detail}
                </div>
              </div>
            ))}
          </div>

          {mobileSharedAICards.map((card) => (
            <article
              key={card.id}
              id="shared-ai"
              className="min-w-0 rounded-xl border border-[#818cf8]/35 bg-[#111827] p-4"
              data-mobile-shared-ai-entry="true"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ModuleBadge module={card.source} label="Shared AI" />
                {card.metadata.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#2a3242] px-2.5 py-1 text-[11px] font-bold text-[#c7cfdb]"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <h2 className="mt-3 break-words text-lg font-black text-white">
                {card.title}
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-[#c7cfdb]">
                {card.summary}
              </p>
              <Link href={card.href} className="mt-4 flex w-full justify-center beast-button">
                {card.actionLabel}
              </Link>
            </article>
          ))}

          <div className="grid gap-3">
            {mobileSearchCards.map((card) => (
              <article
                key={card.id}
                className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ModuleBadge module={card.source} />
                  {card.metadata.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#2a3242] px-2.5 py-1 text-[11px] font-bold text-[#c7cfdb]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 break-words text-lg font-black text-white">
                  {card.title}
                </h2>
                <p className="mt-2 break-words text-sm leading-6 text-[#c7cfdb]">
                  {card.summary}
                </p>
                <Link href={card.href} className="mt-4 flex w-full justify-center beast-button">
                  {card.actionLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>

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
