"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  normalizeBeastAdminMigrationSqlExplorerSnapshot,
  type BeastAdminMigrationSafetyLevel,
  type BeastAdminMigrationSqlExplorerSnapshot,
} from "@/lib/beastAdminMigrationSqlExplorer";
import type { BeastAdminMigrationState } from "@/lib/beastAdminMigrationStatus";

const migrationStateLabels: Record<BeastAdminMigrationState, string> = {
  applied: "Applied",
  pending: "Pending",
  applied_out_of_order: "Applied out of order",
  database_only: "Database-only",
  duplicate_version: "Duplicate version",
  invalid_filename: "Invalid filename",
  unknown: "Unknown",
};

const migrationStateClasses: Record<BeastAdminMigrationState, string> = {
  applied: "border-green-300/35 bg-green-300/10 text-green-100",
  pending: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  applied_out_of_order: "border-orange-300/35 bg-orange-300/10 text-orange-100",
  database_only: "border-violet-300/35 bg-violet-300/10 text-violet-100",
  duplicate_version: "border-red-300/35 bg-red-300/10 text-red-100",
  invalid_filename: "border-red-300/35 bg-red-300/10 text-red-100",
  unknown: "border-slate-300/30 bg-slate-300/10 text-slate-200",
};

const safetyLabels: Record<BeastAdminMigrationSafetyLevel, string> = {
  safe: "Safe",
  configuration: "Configuration",
  data_migration: "Data migration",
  destructive: "Destructive",
};

const safetyClasses: Record<BeastAdminMigrationSafetyLevel, string> = {
  safe: "border-green-300/35 bg-green-300/10 text-green-100",
  configuration: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  data_migration: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  destructive: "border-red-300/35 bg-red-300/10 text-red-100",
};

const sqlKeywordPattern =
  /(--.*$|'(?:''|[^'])*'|\b(?:alter|as|begin|by|case|check|column|constraint|create|default|delete|do|drop|else|enable|end|execute|exists|for|foreign|from|function|grant|if|index|insert|into|language|not|null|on|or|policy|primary|references|replace|returns|revoke|row|schema|security|select|set|table|then|to|trigger|type|unique|update|using|values|view|when|where|with)\b|\b\d+(?:\.\d+)?\b)/gi;
const sqlKeywords = new Set([
  "alter",
  "as",
  "begin",
  "by",
  "case",
  "check",
  "column",
  "constraint",
  "create",
  "default",
  "delete",
  "do",
  "drop",
  "else",
  "enable",
  "end",
  "execute",
  "exists",
  "for",
  "foreign",
  "from",
  "function",
  "grant",
  "if",
  "index",
  "insert",
  "into",
  "language",
  "not",
  "null",
  "on",
  "or",
  "policy",
  "primary",
  "references",
  "replace",
  "returns",
  "revoke",
  "row",
  "schema",
  "security",
  "select",
  "set",
  "table",
  "then",
  "to",
  "trigger",
  "type",
  "unique",
  "update",
  "using",
  "values",
  "view",
  "when",
  "where",
  "with",
]);

function sqlTokenClass(token: string) {
  if (token.startsWith("--")) return "text-[#6f8098]";
  if (token.startsWith("'")) return "text-emerald-300";
  if (/^\d/.test(token)) return "text-sky-300";
  return "font-bold text-amber-200";
}

function isHighlightedSqlToken(token: string) {
  return (
    token.startsWith("--") ||
    token.startsWith("'") ||
    /^\d+(?:\.\d+)?$/.test(token) ||
    sqlKeywords.has(token.toLocaleLowerCase())
  );
}

function HighlightedSql({ sql }: { sql: string }) {
  return (
    <pre className="min-w-max p-4 text-xs leading-6 text-[#dbe3ef]">
      <code>
        {sql.split("\n").map((line, lineIndex) => (
          <span key={lineIndex} className="block">
            <span
              aria-hidden="true"
              className="mr-5 inline-block w-10 select-none text-right text-[#526077]"
            >
              {lineIndex + 1}
            </span>
            {line.split(sqlKeywordPattern).map((token, tokenIndex) =>
              isHighlightedSqlToken(token) ? (
                <span
                  key={`${lineIndex}:${tokenIndex}`}
                  className={sqlTokenClass(token)}
                >
                  {token}
                </span>
              ) : (
                token
              )
            )}
          </span>
        ))}
      </code>
    </pre>
  );
}

function MetadataList({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <h3 className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
        {title}
      </h3>
      {values.length ? (
        <ul className="mt-3 grid gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="break-words font-mono text-xs leading-5 text-[#dbe3ef]"
            >
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs leading-5 text-[#7f8da3]">
          None declared in this migration.
        </p>
      )}
    </div>
  );
}

export function BeastAdminMigrationSqlExplorerWorkspace() {
  const [snapshot, setSnapshot] =
    useState<BeastAdminMigrationSqlExplorerSnapshot | null>(null);
  const [selectedFilename, setSelectedFilename] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const loadMigration = useCallback(
    async (filename?: string, initial = false) => {
      if (initial) setLoading(true);
      else setLoadingSelection(true);
      setError("");
      try {
        const parameters = filename
          ? `?filename=${encodeURIComponent(filename)}`
          : "";
        const response = await fetch(
          `/api/admin/migration-sql-explorer${parameters}`,
          {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }
        );
        const payload = (await response.json()) as unknown;
        if (!response.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Migration SQL Explorer could not load repository source.";
          throw new Error(message);
        }
        const normalized =
          normalizeBeastAdminMigrationSqlExplorerSnapshot(payload);
        if (!normalized) {
          throw new Error(
            "Migration SQL Explorer returned an invalid source snapshot."
          );
        }
        setSnapshot(normalized);
        setSelectedFilename(normalized.selectedMigration.filename);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Migration SQL Explorer could not load repository source."
        );
      } finally {
        setLoading(false);
        setLoadingSelection(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadMigration(undefined, true);
  }, [loadMigration]);

  const filteredMigrations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return snapshot?.migrations || [];
    return (snapshot?.migrations || []).filter((migration) =>
      [
        migration.filename,
        migration.roadmapId,
        migration.purpose,
        migration.capability,
      ].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery)
      )
    );
  }, [query, snapshot?.migrations]);

  const copyValue = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  }, []);

  if (loading && !snapshot) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Migration SQL Explorer"
          title="Inspecting repository migrations"
          description="Loading owner-authorized SQL source and read-only environment status."
        />
        <div
          className="mt-5 grid gap-3 sm:grid-cols-2"
          aria-busy="true"
        >
          <div className="h-72 animate-pulse rounded-xl bg-[#111827]" />
          <div className="h-72 animate-pulse rounded-xl bg-[#111827]" />
        </div>
      </DashboardCard>
    );
  }

  if (!snapshot) {
    return (
      <DashboardCard accent="red">
        <SectionHeader
          eyebrow="Migration SQL Explorer"
          title="Repository migration source is unavailable"
          description={error || "No migration source snapshot was returned."}
        />
        <button
          type="button"
          className="beast-button mt-5"
          onClick={() => void loadMigration(undefined, true)}
        >
          Retry
        </button>
      </DashboardCard>
    );
  }

  const selected = snapshot.selectedMigration;

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeader
            eyebrow="Read-only repository source"
            title={`${snapshot.environment.name} · ${snapshot.environment.projectLabel}`}
            description="Inspect migration intent and complete SQL without executing it or modifying database history."
          />
          <Link
            href="/dashboard/admin/migrations"
            className="beast-button-secondary inline-flex min-h-11 items-center justify-center"
          >
            Open Migration Status
          </Link>
        </div>
        <div
          className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${
            snapshot.environmentStatusAvailable
              ? "border-green-300/25 bg-green-300/10 text-green-100"
              : "border-amber-300/25 bg-amber-300/10 text-amber-100"
          }`}
        >
          <span className="font-black">
            {snapshot.environmentStatusAvailable
              ? "Environment status connected."
              : "Environment status unavailable."}
          </span>{" "}
          {snapshot.environmentStatusMessage}
        </div>
      </DashboardCard>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <DashboardCard accent="admin">
          <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
            Search migrations
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filename, roadmap ID, capability…"
              className="min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15"
            />
          </label>
          <label className="mt-4 grid gap-2 text-sm font-bold text-[#dbe3ef] md:hidden">
            Select migration
            <select
              value={selectedFilename}
              onChange={(event) =>
                void loadMigration(event.target.value)
              }
              className="min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white"
            >
              {filteredMigrations.map((migration) => (
                <option key={migration.filename} value={migration.filename}>
                  {migration.roadmapId} · {migration.filename}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-4 text-xs leading-5 text-[#7f8da3]">
            {filteredMigrations.length} of {snapshot.migrations.length}{" "}
            repository migrations
          </p>
          <div className="mt-3 hidden max-h-[58rem] gap-2 overflow-y-auto pr-1 md:grid">
            {filteredMigrations.map((migration) => {
              const selectedRow =
                migration.filename === selectedFilename;
              return (
                <button
                  key={migration.filename}
                  type="button"
                  aria-pressed={selectedRow}
                  onClick={() =>
                    void loadMigration(migration.filename)
                  }
                  className={`min-w-0 rounded-xl border p-3 text-left transition ${
                    selectedRow
                      ? "border-amber-200 bg-amber-200/15"
                      : "border-[#2a3242] bg-[#111827] hover:border-amber-200/50"
                  }`}
                >
                  <span className="block text-xs font-black text-amber-100">
                    {migration.roadmapId}
                  </span>
                  <span className="mt-1 block break-all font-mono text-[11px] leading-5 text-white">
                    {migration.filename}
                  </span>
                  <span className="mt-2 block text-[11px] text-[#7f8da3]">
                    {migrationStateLabels[migration.environmentState]}
                  </span>
                </button>
              );
            })}
          </div>
          {!filteredMigrations.length ? (
            <p className="mt-4 rounded-xl border border-dashed border-[#344052] p-4 text-sm text-[#9aa7b8]">
              No repository migrations match this search.
            </p>
          ) : null}
        </DashboardCard>

        <div className="min-w-0 space-y-6" aria-busy={loadingSelection}>
          {error ? (
            <div className="rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <DashboardCard accent="admin">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="beast-kicker">{selected.roadmapId}</p>
                <h2 className="mt-2 break-all text-xl font-black text-white">
                  {selected.filename}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#dbe3ef]">
                  {selected.purpose}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${migrationStateClasses[selected.environmentState]}`}
                >
                  {migrationStateLabels[selected.environmentState]}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${safetyClasses[selected.safety.level]}`}
                >
                  {safetyLabels[selected.safety.level]}
                </span>
                {selected.safety.irreversible ? (
                  <span className="rounded-full border border-red-300/35 bg-red-300/10 px-3 py-1 text-xs font-black text-red-100">
                    Irreversible
                  </span>
                ) : null}
              </div>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Roadmap ID", selected.roadmapId],
                ["Version", selected.version],
                ["Capability", selected.capability],
                [
                  "Environment status",
                  migrationStateLabels[selected.environmentState],
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                    {label}
                  </dt>
                  <dd className="mt-2 break-words text-sm font-black text-white">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ["sql", "Copy SQL", selected.sql],
                ["filename", "Copy filename", selected.filename],
                ["roadmap", "Copy roadmap ID", selected.roadmapId],
              ].map(([label, buttonLabel, value]) => (
                <button
                  key={label}
                  type="button"
                  className="beast-button-secondary min-h-11"
                  onClick={() => void copyValue(label, value)}
                >
                  {copied === label ? "Copied" : buttonLabel}
                </button>
              ))}
              <a
                href={selected.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="beast-button-secondary inline-flex min-h-11 items-center"
              >
                Open migration source
              </a>
            </div>
          </DashboardCard>

          <DashboardCard
            accent={
              selected.safety.level === "destructive" ? "red" : "admin"
            }
          >
            <SectionHeader
              eyebrow="Safety assessment"
              title={safetyLabels[selected.safety.level]}
              description={selected.safety.summary}
            />
            <ul className="mt-4 grid gap-2 text-sm leading-5 text-[#dbe3ef]">
              {selected.safety.signals.map((signal) => (
                <li key={signal} className="flex gap-2">
                  <span aria-hidden="true" className="text-amber-200">
                    •
                  </span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
              Assessment is static guidance, not approval to execute. The owner
              must review dependencies, target environment, backups, and
              rollback requirements manually.
            </p>
          </DashboardCard>

          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <MetadataList
              title="Expected objects"
              values={selected.expectedObjects}
            />
            <MetadataList
              title="Created objects"
              values={selected.createdObjects}
            />
            <MetadataList title="Tables" values={selected.tables} />
            <MetadataList title="RPCs and functions" values={selected.rpcs} />
            <MetadataList title="Policies" values={selected.policies} />
            <MetadataList title="Grants and revocations" values={selected.grants} />
            <MetadataList title="Triggers" values={selected.triggers} />
          </div>

          <DashboardCard accent="admin">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeader
                eyebrow="Complete SQL"
                title={selected.filename}
                description="Syntax-highlighted repository source. This viewer has no execution controls."
              />
              <button
                type="button"
                className="beast-button-secondary min-h-11"
                onClick={() => void copyValue("viewer-sql", selected.sql)}
              >
                {copied === "viewer-sql" ? "Copied" : "Copy SQL"}
              </button>
            </div>
            <div
              className="beast-table-wrap mt-5 max-h-[52rem] overflow-auto rounded-xl border border-[#2a3242] bg-[#080d15]"
              role="region"
              aria-label={`Complete SQL for ${selected.filename}`}
              tabIndex={0}
            >
              <HighlightedSql sql={selected.sql} />
            </div>
          </DashboardCard>

          <p className="text-xs leading-5 text-[#7f8da3]">
            Migration SQL Explorer is read-only. It cannot execute SQL, modify
            migration history, alter database objects, or change the connected
            environment.
          </p>
        </div>
      </div>
    </div>
  );
}
