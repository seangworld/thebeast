"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildRecentSearches,
  buildSearchActionRequest,
  buildUniversalSearchIndex,
  groupSearchResults,
  searchPlatformIndex,
  type PlatformSearchItem,
  type SearchResult,
} from "@/lib/platform/search";
import type { PlatformModule } from "@/lib/platform/types";

type UnifiedSearchWorkspaceProps = {
  items: PlatformSearchItem[];
  allowedModules: PlatformModule[];
  ownerStorageKey: string;
  loadState: "ready" | "signed-out" | "unavailable";
};

function readRecentSearches(storageKey: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return buildRecentSearches(Array.isArray(stored) ? stored.map(String) : []);
  } catch {
    return [];
  }
}

export default function UnifiedSearchWorkspace({
  items,
  allowedModules,
  ownerStorageKey,
  loadState,
}: UnifiedSearchWorkspaceProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const index = useMemo(() => buildUniversalSearchIndex(items), [items]);
  const results = useMemo(
    () =>
      query.trim()
        ? searchPlatformIndex({
            items: index,
            query,
            allowedPermissionScopes: ["Owner"],
            allowedModules,
          })
        : [],
    [allowedModules, index, query]
  );
  const groups = useMemo(() => groupSearchResults(results), [results]);
  const orderedResults = useMemo(
    () => groups.flatMap((group) => group.results),
    [groups]
  );

  useEffect(() => {
    setRecentSearches(readRecentSearches(ownerStorageKey));
  }, [ownerStorageKey]);

  useEffect(() => {
    setActiveResultIndex(orderedResults.length ? 0 : -1);
  }, [orderedResults.length, query]);

  function rememberSearch(value: string) {
    const next = buildRecentSearches([value, ...recentSearches]);
    setRecentSearches(next);
    try {
      window.localStorage.setItem(ownerStorageKey, JSON.stringify(next));
    } catch {
      // Recent-search persistence is optional; search results remain available.
    }
  }

  function openResult(result: SearchResult) {
    rememberSearch(query);
    const actionType = result.actions[0]?.type || "Open";
    const request = buildSearchActionRequest({ item: result, actionType });
    router.push(request.href || result.href);
  }

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (!orderedResults.length) {
      if (event.key === "Enter" && query.trim()) rememberSearch(query);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResultIndex(
        (current) => (current + 1) % orderedResults.length
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResultIndex(
        (current) =>
          current <= 0 ? orderedResults.length - 1 : current - 1
      );
      return;
    }
    if (event.key === "Enter" && activeResultIndex >= 0) {
      event.preventDefault();
      openResult(orderedResults[activeResultIndex]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      setActiveResultIndex(-1);
    }
  }

  function selectRecentSearch(value: string) {
    setQuery(value);
    inputRef.current?.focus();
  }

  let resultOffset = 0;

  return (
    <section
      className="min-w-0 space-y-6"
      data-mobile-shared-service="search"
      aria-label="Unified Beast search"
    >
      <DashboardCard accent="search">
        <SectionHeader
          eyebrow="Personal Knowledge Base"
          title="What are you looking for?"
          description="Search only returns records and modules you are permitted to access."
        />
        <form
          className="mt-5"
          role="search"
          data-analytics-event="search_performed"
          data-analytics-action="unified_search"
          data-analytics-result={
            query.trim()
              ? orderedResults.length
                ? "success"
                : "no_results"
              : undefined
          }
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim()) rememberSearch(query);
          }}
        >
          <label htmlFor="beast-unified-search" className="sr-only">
            Search Beast
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#7f8da3]"
            >
              ⌕
            </span>
            <input
              ref={inputRef}
              id="beast-unified-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search conversations, goals, documents, accounts, lessons…"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={Boolean(orderedResults.length)}
              aria-controls="beast-search-results"
              aria-activedescendant={
                activeResultIndex >= 0
                  ? `beast-search-result-${activeResultIndex}`
                  : undefined
              }
              className="min-h-14 w-full rounded-xl border border-[#38bdf8]/40 bg-[#0f1419] py-3 pl-12 pr-4 text-base font-semibold text-white outline-none transition placeholder:text-[#6f7d90] focus:border-[#91cbff] focus:ring-2 focus:ring-[#38bdf8]/20"
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-[#7f8da3]">
            Use ↑ and ↓ to move through results, Enter to open, and Escape to
            clear.
          </p>
        </form>

        {!query.trim() && recentSearches.length ? (
          <div className="mt-5">
            <div className="text-xs font-black uppercase tracking-wide text-[#8f9caf]">
              Recent searches
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentSearches.map((recent) => (
                <button
                  key={recent.toLowerCase()}
                  type="button"
                  onClick={() => selectRecentSearch(recent)}
                  className="rounded-full border border-[#2a3242] bg-[#111827] px-3.5 py-2 text-sm font-bold text-[#c7cfdb] transition hover:border-[#53627a] hover:text-white"
                >
                  {recent}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </DashboardCard>

      {loadState !== "ready" ? (
        <DashboardCard accent="search">
          <div className="py-8 text-center">
            <h2 className="text-lg font-black text-white">
              {loadState === "signed-out"
                ? "Sign in to search Beast"
                : "Search is unavailable right now"}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#9aa7b8]">
              {loadState === "signed-out"
                ? "Your personal knowledge base is available after authentication."
                : "Your records were not searched. Please try again."}
            </p>
          </div>
        </DashboardCard>
      ) : null}

      {loadState === "ready" && query.trim() ? (
        <div
          id="beast-search-results"
          role="listbox"
          aria-label="Search results"
          className="space-y-6"
        >
          {groups.length ? (
            groups.map((group) => {
              const groupStartIndex = resultOffset;
              resultOffset += group.results.length;

              return (
                <section
                  key={group.domain}
                  aria-labelledby={`search-group-${group.domain
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2
                      id={`search-group-${group.domain
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                      className="text-sm font-black uppercase tracking-[0.12em] text-[#8f9caf]"
                    >
                      {group.domain}
                    </h2>
                    <span className="text-xs font-bold text-[#6f7d90]">
                      {group.results.length}
                    </span>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {group.results.map((result, indexInGroup) => {
                      const resultIndex = groupStartIndex + indexInGroup;
                      const active = resultIndex === activeResultIndex;

                      return (
                        <article
                          key={result.id}
                          id={`beast-search-result-${resultIndex}`}
                          role="option"
                          aria-selected={active}
                          className={`min-w-0 rounded-2xl border bg-[#111827] p-4 transition sm:p-5 ${
                            active
                              ? "border-[#91cbff] ring-2 ring-[#38bdf8]/15"
                              : "border-[#2a3242]"
                          }`}
                          onMouseEnter={() =>
                            setActiveResultIndex(resultIndex)
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <ModuleBadge module={result.source} />
                            <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-[0.68rem] font-black text-[#aeb9c8]">
                              {result.permissionScope}
                            </span>
                          </div>
                          <h3 className="mt-3 break-words text-lg font-black text-white">
                            {result.title}
                          </h3>
                          <p className="mt-2 break-words text-sm leading-6 text-[#aeb9c8]">
                            {result.summary}
                          </p>
                          <Link
                            href={result.href}
                            onClick={() => rememberSearch(query)}
                            className="beast-button mt-4 inline-flex min-h-[42px] items-center justify-center"
                          >
                            {result.actions[0]?.label || "Open"}
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })
          ) : (
            <DashboardCard accent="search">
              <div className="py-8 text-center">
                <h2 className="text-lg font-black text-white">
                  No matching records
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#9aa7b8]">
                  Try a person, goal, account, course, document name, or broader
                  term.
                </p>
              </div>
            </DashboardCard>
          )}
        </div>
      ) : null}

      {loadState === "ready" && !query.trim() && !recentSearches.length ? (
        <DashboardCard accent="search">
          <div className="py-8 text-center">
            <h2 className="text-lg font-black text-white">
              Search across your Beast history
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#9aa7b8]">
              Start with a conversation, goal, document, account, debt, lesson,
              roadmap, health record, or family member.
            </p>
          </div>
        </DashboardCard>
      ) : null}
    </section>
  );
}
