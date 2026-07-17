import type { PlatformModule } from "./types";

export type SearchDomain =
  | "Personal Hub"
  | "Goals"
  | "Documents"
  | "Money"
  | "Learning"
  | "Calendar"
  | "Timeline"
  | "Notifications";

export type SearchPermissionScope = "Owner" | "Household" | "Shared";
export type SearchActionType = "Open" | "Review" | "Resume" | "Filter";

export type PlatformSearchAction = {
  type: SearchActionType;
  label: string;
  href?: string;
};

export type PlatformSearchItem = {
  id: string;
  source: PlatformModule;
  sourceRecordId: string;
  domain: SearchDomain;
  title: string;
  summary: string;
  keywords: string[];
  href: string;
  permissionScope: SearchPermissionScope;
  updatedAt: string;
  actions: PlatformSearchAction[];
};

export type SearchFilters = {
  module?: PlatformModule;
  domain?: SearchDomain;
  permissionScope?: SearchPermissionScope;
};

export type SearchResult = PlatformSearchItem & {
  score: number;
  matchedFields: string[];
};

export type SavedSearch = {
  id: string;
  label: string;
  query: string;
  filters: SearchFilters;
};

export type NaturalLanguageSearchIntent = {
  query: string;
  interpretedQuery: string;
  suggestedFilters: SearchFilters;
  actionLabel: string;
};

export type SearchActionRequest = {
  id: string;
  itemId: string;
  source: PlatformModule;
  sourceRecordId: string;
  actionType: SearchActionType;
  dispatchMode: "route-or-source-contract";
  sourceOwnershipPreserved: true;
  href?: string;
};

export const searchContractRules = [
  "BeastOS Search owns indexing, filtering, result grouping, recent searches, saved-search requests, natural-language interpretation, and action routing.",
  "Source modules own source records, domain ranking evidence, completion, edits, deletion, and business-specific actions.",
  "Search results must carry source module, source record, permission scope, result domain, action URL, and source-owned action metadata.",
  "Search actions must open a route or dispatch a source contract request instead of mutating module-owned records directly.",
];

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) throw new Error(`Search ${label} is required.`);
}

function parseSearchTimestamp(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error("Search updatedAt must be a valid timestamp.");
  return parsed;
}

function searchFields(item: PlatformSearchItem) {
  return {
    title: normalizeSearchText(item.title),
    summary: normalizeSearchText(item.summary),
    keywords: item.keywords.map(normalizeSearchText).join(" "),
    domain: normalizeSearchText(item.domain),
    source: normalizeSearchText(item.source),
  };
}

export function buildPlatformSearchItem(item: PlatformSearchItem): PlatformSearchItem {
  assertNonEmpty(item.id, "item id");
  assertNonEmpty(item.sourceRecordId, "source record id");
  assertNonEmpty(item.title, "title");
  assertNonEmpty(item.href, "href");
  parseSearchTimestamp(item.updatedAt);

  return {
    ...item,
    keywords: item.keywords.map((keyword) => keyword.trim()).filter(Boolean),
  };
}

export function buildUniversalSearchIndex(items: PlatformSearchItem[]) {
  return items
    .map(buildPlatformSearchItem)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function searchPlatformIndex({
  items,
  query,
  filters = {},
  allowedPermissionScopes = ["Owner"],
}: {
  items: PlatformSearchItem[];
  query: string;
  filters?: SearchFilters;
  allowedPermissionScopes?: SearchPermissionScope[];
}): SearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return buildUniversalSearchIndex(items)
    .filter((item) => allowedPermissionScopes.includes(item.permissionScope))
    .filter((item) => !filters.module || item.source === filters.module)
    .filter((item) => !filters.domain || item.domain === filters.domain)
    .filter((item) => !filters.permissionScope || item.permissionScope === filters.permissionScope)
    .map((item) => {
      const fields = searchFields(item);
      const matchedFields = Object.entries(fields)
        .filter(([, value]) =>
          terms.length === 0 ? true : terms.some((term) => value.includes(term))
        )
        .map(([field]) => field);
      const score =
        matchedFields.includes("title")
          ? 100
          : matchedFields.includes("keywords")
            ? 75
            : matchedFields.length > 0
              ? 50
              : 0;

      return { ...item, score, matchedFields };
    })
    .filter((item) => normalizedQuery.length === 0 || item.score > 0)
    .sort((left, right) => right.score - left.score || right.updatedAt.localeCompare(left.updatedAt));
}

export function buildRecentSearches(searches: string[], limit = 5) {
  const seen = new Set<string>();
  return searches
    .map((search) => search.trim())
    .filter(Boolean)
    .filter((search) => {
      const key = normalizeSearchText(search);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function buildSavedSearch(search: SavedSearch): SavedSearch {
  assertNonEmpty(search.id, "saved search id");
  assertNonEmpty(search.label, "saved search label");
  assertNonEmpty(search.query, "saved search query");
  return search;
}

export function interpretNaturalLanguageSearch(query: string): NaturalLanguageSearchIntent {
  const normalized = normalizeSearchText(query);

  if (normalized.includes("money") || normalized.includes("bill")) {
    return {
      query,
      interpretedQuery: "money alerts bills cashflow",
      suggestedFilters: { module: "money" },
      actionLabel: "Review Money results",
    };
  }

  if (normalized.includes("learning") || normalized.includes("study") || normalized.includes("lesson")) {
    return {
      query,
      interpretedQuery: "learning mentor lesson next step",
      suggestedFilters: { module: "learning" },
      actionLabel: "Resume Learning results",
    };
  }

  if (normalized.includes("document") || normalized.includes("uploaded")) {
    return {
      query,
      interpretedQuery: "documents uploaded files",
      suggestedFilters: { domain: "Documents" },
      actionLabel: "Open Document results",
    };
  }

  return {
    query,
    interpretedQuery: normalized || "today attention recommendations",
    suggestedFilters: {},
    actionLabel: "Search all results",
  };
}

export function buildSearchActionRequest({
  item,
  actionType,
}: {
  item: PlatformSearchItem;
  actionType: SearchActionType;
}): SearchActionRequest {
  const normalized = buildPlatformSearchItem(item);

  return {
    id: `${normalized.id}:search-action:${actionType.toLowerCase()}`,
    itemId: normalized.id,
    source: normalized.source,
    sourceRecordId: normalized.sourceRecordId,
    actionType,
    dispatchMode: "route-or-source-contract",
    sourceOwnershipPreserved: true,
    href: normalized.actions.find((action) => action.type === actionType)?.href ?? normalized.href,
  };
}
