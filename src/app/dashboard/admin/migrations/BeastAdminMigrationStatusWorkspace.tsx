"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  normalizeBeastAdminMigrationStatusSnapshot,
  type BeastAdminCapabilityState,
  type BeastAdminMigrationState,
  type BeastAdminMigrationStatusSnapshot,
} from "@/lib/beastAdminMigrationStatus";
import {
  auditBeastRoadmapIdentities,
  beastRoadmapPackageRegistry,
} from "@/lib/beastRoadmapIdentity";
import {
  BEAST_ADMIN_PAGE_SIZE,
  BeastAdminPagination,
} from "../BeastAdminPagination";

const roadmapIdentityAudit = auditBeastRoadmapIdentities();

const inventoryInputClassName =
  "min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15";

const migrationStateLabels: Record<BeastAdminMigrationState, string> = {
  applied: "Applied",
  pending: "Pending",
  history_drift: "Fully Present — History Drift",
  partial: "Partial",
  missing: "Missing",
  unsafe_to_replay: "Unsafe to Replay",
  applied_out_of_order: "Applied out of order",
  database_only: "Database-only",
  duplicate_version: "Duplicate version",
  invalid_filename: "Invalid filename",
  unknown: "Unknown",
};

const migrationStateClasses: Record<BeastAdminMigrationState, string> = {
  applied: "border-green-300/35 bg-green-300/10 text-green-100",
  pending: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  history_drift: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  partial: "border-orange-300/35 bg-orange-300/10 text-orange-100",
  missing: "border-red-300/35 bg-red-300/10 text-red-100",
  unsafe_to_replay: "border-red-300/50 bg-red-300/15 text-red-50",
  applied_out_of_order: "border-orange-300/35 bg-orange-300/10 text-orange-100",
  database_only: "border-violet-300/35 bg-violet-300/10 text-violet-100",
  duplicate_version: "border-red-300/35 bg-red-300/10 text-red-100",
  invalid_filename: "border-red-300/35 bg-red-300/10 text-red-100",
  unknown: "border-slate-300/30 bg-slate-300/10 text-slate-200",
};

const capabilityStateLabels: Record<BeastAdminCapabilityState, string> = {
  available: "Available",
  pending_migration: "Pending migration",
  history_schema_mismatch: "History/schema mismatch",
  permission_failure: "Permission failure",
  unknown: "Unknown",
};

const capabilityStateClasses: Record<BeastAdminCapabilityState, string> = {
  available: "border-green-300/35 bg-green-300/10 text-green-100",
  pending_migration: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  history_schema_mismatch: "border-red-300/35 bg-red-300/10 text-red-100",
  permission_failure: "border-red-300/35 bg-red-300/10 text-red-100",
  unknown: "border-slate-300/30 bg-slate-300/10 text-slate-200",
};

type MigrationStatusError = {
  message: string;
  diagnostic: {
    kind?: string;
    projectRef?: string;
    expectedObject?: string;
    requiredMigration?: string;
    actualError?: {
      code?: string | null;
      message?: string | null;
      details?: string | null;
      hint?: string | null;
    };
  } | null;
};

function formatTimestamp(value: string | null) {
  if (!value) return "Not recorded by migration history";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function liveSchemaLabel(
  value: BeastAdminMigrationStatusSnapshot["migrations"][number]["liveSchemaStatus"]
) {
  return {
    fully_present: "Fully present",
    partial: "Partial",
    missing: "Missing",
    unknown: "Not verified",
  }[value];
}

function SummaryValue({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-black text-white">{value}</p>
      <p className="mt-1 break-words text-xs leading-5 text-[#7f8da3]">
        {detail}
      </p>
    </div>
  );
}

function StateBadge({ state }: { state: BeastAdminMigrationState }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${migrationStateClasses[state]}`}
    >
      {migrationStateLabels[state]}
    </span>
  );
}

function OwnerError({ error, onRetry }: { error: MigrationStatusError; onRetry: () => void }) {
  const technical = [
    error.diagnostic?.projectRef
      ? `Supabase project: ${error.diagnostic.projectRef}`
      : "",
    error.diagnostic?.expectedObject
      ? `Expected object: ${error.diagnostic.expectedObject}`
      : "",
    error.diagnostic?.requiredMigration
      ? `Required migration: ${error.diagnostic.requiredMigration}`
      : "",
    error.diagnostic?.actualError?.code
      ? `API code: ${error.diagnostic.actualError.code}`
      : "",
    error.diagnostic?.actualError?.message
      ? `Message: ${error.diagnostic.actualError.message}`
      : "",
    error.diagnostic?.actualError?.details
      ? `Details: ${error.diagnostic.actualError.details}`
      : "",
    error.diagnostic?.actualError?.hint
      ? `Hint: ${error.diagnostic.actualError.hint}`
      : "",
  ].filter(Boolean);

  return (
    <DashboardCard accent="red">
      <SectionHeader
        eyebrow="Migration Status"
        title="Database history is unavailable"
        description={error.message}
      />
      <div className="mt-5 rounded-xl border border-red-300/25 bg-red-300/10 p-4">
        <p className="text-sm leading-6 text-[#e6edf7]">
          Apply only the exact diagnostic migration shown below to the displayed
          project. This page never applies or repairs migrations.
        </p>
        {technical.length ? (
          <ul className="mt-4 grid gap-2 text-xs leading-5 text-red-100">
            {technical.map((detail) => (
              <li key={detail} className="break-words font-mono">
                {detail}
              </li>
            ))}
          </ul>
        ) : null}
        <button type="button" className="beast-button mt-4" onClick={onRetry}>
          Retry status
        </button>
      </div>
    </DashboardCard>
  );
}

export function BeastAdminMigrationStatusWorkspace() {
  const [snapshot, setSnapshot] =
    useState<BeastAdminMigrationStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<MigrationStatusError | null>(null);
  const [copied, setCopied] = useState("");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | BeastAdminMigrationState>("all");
  const [page, setPage] = useState(1);

  const refreshStatus = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/migration-status", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        const record =
          payload && typeof payload === "object"
            ? (payload as {
                error?: unknown;
                diagnostic?: MigrationStatusError["diagnostic"];
              })
            : {};
        throw {
          message:
            typeof record.error === "string"
              ? record.error
              : "Migration Status could not load database history.",
          diagnostic: record.diagnostic || null,
        } satisfies MigrationStatusError;
      }
      const normalized = normalizeBeastAdminMigrationStatusSnapshot(payload);
      if (!normalized) {
        throw {
          message: "Migration Status returned an invalid verification snapshot.",
          diagnostic: null,
        } satisfies MigrationStatusError;
      }
      setSnapshot(normalized);
    } catch (refreshError) {
      const nextError =
        refreshError &&
        typeof refreshError === "object" &&
        "message" in refreshError
          ? (refreshError as MigrationStatusError)
          : {
              message: "Migration Status could not load database history.",
              diagnostic: null,
            };
      setError(nextError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus(true);
  }, [refreshStatus]);

  const copyText = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  }, []);

  const issues = useMemo(
    () =>
      snapshot?.migrations.filter(
        (migration) =>
          !["applied", "history_drift"].includes(migration.state)
      ) || [],
    [snapshot]
  );
  const filteredMigrations = useMemo(() => {
    if (!snapshot) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return snapshot.migrations.filter((migration) => {
      const stateMatches = stateFilter === "all" || migration.state === stateFilter;
      const queryMatches =
        !normalizedQuery ||
        [
          migration.version,
          migration.roadmapId,
          migration.historicalRoadmapId || "",
          migration.capability,
          migration.filename,
          migration.classificationReason,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return stateMatches && queryMatches;
    });
  }, [query, snapshot, stateFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, stateFilter]);

  if (loading && !snapshot) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Migration Status"
          title="Comparing repository and database history"
          description="BeastAdmin is performing an owner-authorized, read-only migration and schema verification."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
            />
          ))}
        </div>
      </DashboardCard>
    );
  }

  if (error && !snapshot) {
    return <OwnerError error={error} onRetry={() => void refreshStatus()} />;
  }

  if (!snapshot) return null;

  const pageCount = Math.max(
    1,
    Math.ceil(filteredMigrations.length / BEAST_ADMIN_PAGE_SIZE)
  );
  const currentPage = Math.min(page, pageCount);
  const pagedMigrations = filteredMigrations.slice(
    (currentPage - 1) * BEAST_ADMIN_PAGE_SIZE,
    currentPage * BEAST_ADMIN_PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      <DashboardCard
        accent={
          snapshot.environment.matchesExpectedProject === false
            ? "red"
            : "admin"
        }
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeader
            eyebrow="Connected environment"
            title={`${snapshot.environment.name} · ${snapshot.environment.projectLabel}`}
            description="This identity comes from the deployed application and its configured public Supabase URL. No credentials are displayed."
          />
          <button
            type="button"
            className="beast-button-secondary min-h-11"
            disabled={refreshing}
            onClick={() => void refreshStatus()}
          >
            {refreshing ? "Refreshing…" : "Refresh status"}
          </button>
          <Link
            href="/dashboard/admin/migrations/explorer"
            className="beast-button-secondary inline-flex min-h-11 items-center justify-center"
          >
            Inspect migration SQL
          </Link>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Environment", snapshot.environment.name],
            ["Supabase project", snapshot.environment.projectRef],
            ["Site", snapshot.environment.siteOrigin],
            [
              "Branch / deployment",
              `${snapshot.environment.branch} · ${snapshot.environment.deploymentEnvironment}`,
            ],
            ["Database host", snapshot.environment.databaseHost],
            [
              "History source",
              `${snapshot.historySource.schema}.${snapshot.historySource.table}`,
            ],
            [
              "Live schema evidence",
              snapshot.schemaEvidence.available
                ? "Connected"
                : "Not available",
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                {label}
              </dt>
              <dd className="mt-2 break-all text-sm font-black text-white">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {snapshot.environment.matchesExpectedProject === false ? (
          <div className="mt-4 rounded-xl border border-red-300/35 bg-red-300/10 p-4 text-sm leading-6 text-red-100">
            Environment mismatch: this deployment uses{" "}
            <span className="font-mono">{snapshot.environment.projectRef}</span>,
            but its expected project is{" "}
            <span className="font-mono">
              {snapshot.environment.expectedProjectRef}
            </span>
            .
          </div>
        ) : null}
      </DashboardCard>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Migration summary"
          title="Repository compared with authoritative database history"
          description={
            snapshot.historySource.storesAppliedTimestamp
              ? "Application timestamps are shown when the history table records them."
              : "This Supabase migration-history table does not record application timestamps, so BeastAdmin does not invent them."
          }
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryValue
            label="Pending"
            value={String(snapshot.summary.pending)}
            detail="Ledger absent, live objects missing, safe to execute"
          />
          <SummaryValue
            label="Fully Present — History Drift"
            value={String(snapshot.summary.historyDrift)}
            detail="Schema complete; do not replay"
          />
          <SummaryValue
            label="Partial"
            value={String(snapshot.summary.partial)}
            detail="Manual investigation required"
          />
          <SummaryValue
            label="Missing"
            value={String(snapshot.summary.missing)}
            detail="Absent but not automatically recommended"
          />
          <SummaryValue
            label="Unsafe to Replay"
            value={String(snapshot.summary.unsafeToReplay)}
            detail="Use named forward-only reconciliation"
          />
        </div>
        <p className="mt-4 rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-6 text-[#dbe3ef]">
          {snapshot.schemaEvidence.message}
        </p>
      </DashboardCard>

      <DashboardCard
        accent={
          roadmapIdentityAudit.canonicalCollisions.length ? "red" : "yellow"
        }
      >
        <SectionHeader
          eyebrow="Roadmap identity integrity"
          title={
            roadmapIdentityAudit.canonicalCollisions.length
              ? "Canonical roadmap collisions require correction"
              : "Canonical roadmap identities are unique"
          }
          description={`${roadmapIdentityAudit.packageCount} registered packages were audited. Historical identifiers remain visible for provenance and are never sufficient migration instructions by themselves.`}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryValue
            label="Registered packages"
            value={String(roadmapIdentityAudit.packageCount)}
            detail="Canonical identity registry"
          />
          <SummaryValue
            label="Canonical collisions"
            value={String(roadmapIdentityAudit.canonicalCollisions.length)}
            detail="Must remain zero"
          />
          <SummaryValue
            label="Historical collisions"
            value={String(roadmapIdentityAudit.historicalCollisions.length)}
            detail="Preserved and disambiguated"
          />
        </div>
        {roadmapIdentityAudit.historicalCollisions.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {roadmapIdentityAudit.historicalCollisions.map((collision) => (
              <article
                key={collision.identifier}
                className="min-w-0 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4"
              >
                <p className="font-mono text-sm font-black text-amber-100">
                  {collision.identifier}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
                  {collision.capabilities.join(" · ")}
                </p>
                <p className="mt-2 break-words text-xs leading-5 text-[#9aa7b8]">
                  Canonical IDs: {collision.roadmapIds.join(" · ")}
                </p>
              </article>
            ))}
          </div>
        ) : null}
        <p className="mt-5 rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-6 text-[#dbe3ef]">
          Future packages are checked against{" "}
          <span className="font-mono">
            {beastRoadmapPackageRegistry.length} registered identities
          </span>
          . Validation warns on historical reuse and fails on canonical
          collisions.
        </p>
      </DashboardCard>

      <DashboardCard
        accent={
          snapshot.executionRecommendations.length ? "yellow" : "green"
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            eyebrow="Execution recommendations"
            title={
              snapshot.executionRecommendations.length
                ? "Verified migrations ready to execute"
                : "No migrations are ready to execute"
            }
            description={
              snapshot.executionRecommendations.length
                ? "Only ledger-pending migrations with verified-missing live objects and safe repository SQL appear here."
                : "History Drift, Partial, Missing without safety verification, and Unsafe to Replay entries are never recommended."
            }
          />
          {snapshot.executionRecommendations.length ? (
            <button
              type="button"
              className="beast-button-secondary min-h-11"
              onClick={() =>
                void copyText(
                  "pending",
                  snapshot.executionRecommendations
                    .map((filename, index) => `${index + 1}. ${filename}`)
                    .join("\n")
                )
              }
            >
              {copied === "pending" ? "Copied" : "Copy ordered list"}
            </button>
          ) : null}
        </div>
        {snapshot.executionRecommendations.length ? (
          <ol className="mt-5 grid gap-2">
            {snapshot.executionRecommendations.map((filename, index) => {
              const migration = snapshot.migrations.find(
                (row) => row.filename === filename
              );
              return (
                <li
                  key={filename}
                  className="flex min-w-0 gap-3 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-50"
                >
                  <span className="font-black">
                    {index + 1}.
                  </span>
                  <span className="min-w-0">
                    <span className="block font-black">
                      {migration?.roadmapId || "Unregistered identity"} ·{" "}
                      {migration?.capability || "Capability unavailable"}
                    </span>
                    <span className="mt-1 block break-all font-mono text-xs">
                      {filename}
                    </span>
                    <span className="mt-1 block font-mono text-xs text-amber-100/70">
                      Version {migration?.version || "invalid"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}
      </DashboardCard>

      <section aria-labelledby="capability-diagnostics-heading">
        <div id="capability-diagnostics-heading">
          <SectionHeader
            eyebrow="Capability diagnostics"
            title="Migration history compared with live database objects"
            description="A migration can be recorded as applied while its expected schema object is missing. These checks keep those states separate."
          />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {snapshot.capabilities.map((capability) => (
            <DashboardCard
              key={capability.id}
              accent={
                capability.state === "available"
                  ? "green"
                  : capability.state === "unknown"
                    ? "admin"
                    : "red"
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="beast-kicker">Capability</p>
                  <h3 className="mt-2 text-xl font-black text-white">
                    {capability.label}
                  </h3>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${capabilityStateClasses[capability.state]}`}
                >
                  {capabilityStateLabels[capability.state]}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#dbe3ef]">
                {capability.conclusion}
              </p>
              <details className="mt-4 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <summary className="cursor-pointer text-sm font-black text-amber-100">
                  Technical details
                </summary>
                <div className="mt-4 grid gap-4 text-xs leading-5 text-[#9aa7b8]">
                  <div>
                    <p className="font-black uppercase tracking-wide text-white">
                      Required migrations
                    </p>
                    {capability.requiredMigrations.map((migration, index) => (
                      <p key={migration} className="mt-1 break-all font-mono">
                        {migration} ·{" "}
                        {migrationStateLabels[
                          capability.migrationStates[index] || "unknown"
                        ]}
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-wide text-white">
                      Expected objects
                    </p>
                    {capability.objects.map((object) => (
                      <p key={object.objectId} className="mt-1 break-all font-mono">
                        {object.identity} · {object.exists ? "Present" : "Missing"}
                        {object.authenticatedExecute === false
                          ? " · EXECUTE denied"
                          : ""}
                        {object.kind === "table" && object.exists
                          ? ` · RLS ${object.rlsEnabled ? "enabled" : "disabled"} · ${object.policyCount ?? 0} policies`
                          : ""}
                      </p>
                    ))}
                  </div>
                  {capability.actualError ? (
                    <div>
                      <p className="font-black uppercase tracking-wide text-white">
                        Actual API error
                      </p>
                      <p className="mt-1 break-words font-mono">
                        {capability.actualError.code || "No code"} ·{" "}
                        {capability.actualError.message}
                      </p>
                      {capability.actualError.details ? (
                        <p className="mt-1 break-words font-mono">
                          {capability.actualError.details}
                        </p>
                      ) : null}
                      {capability.actualError.hint ? (
                        <p className="mt-1 break-words font-mono">
                          {capability.actualError.hint}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </details>
            </DashboardCard>
          ))}
        </div>
      </section>

      <DashboardCard accent={issues.length ? "yellow" : "admin"}>
        <SectionHeader
          eyebrow="Migration inventory"
          title={`${snapshot.migrations.length} repository and database records`}
          description="Repository presence, authoritative migration ledger state, and live schema evidence are shown independently. The inventory is paged so the page remains usable as the ledger grows."
        />
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_260px]">
          <label className="text-sm font-bold text-slate-300">
            Search inventory
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${inventoryInputClassName} mt-2`}
              placeholder="Version, roadmap ID, capability, or filename"
            />
          </label>
          <label className="text-sm font-bold text-slate-300">
            Classification
            <select
              value={stateFilter}
              onChange={(event) =>
                setStateFilter(event.target.value as "all" | BeastAdminMigrationState)
              }
              className={`${inventoryInputClassName} mt-2`}
            >
              <option value="all">All classifications</option>
              {Object.entries(migrationStateLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4">
          <BeastAdminPagination
            page={currentPage}
            totalItems={filteredMigrations.length}
            itemLabel="migration records"
            onPageChange={setPage}
          />
        </div>
        <div
          className="beast-table-wrap mt-5 hidden overflow-x-auto rounded-xl border border-[#2a3242] md:block"
          tabIndex={0}
          role="region"
          aria-label="Migration inventory table, horizontally scrollable"
        >
          <table className="min-w-[1460px] text-left text-sm">
            <thead className="bg-[#111827] text-xs uppercase tracking-wide text-[#7f8da3]">
              <tr>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Roadmap ID</th>
                <th className="px-4 py-3">Capability</th>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Repository</th>
                <th className="px-4 py-3">Migration ledger</th>
                <th className="px-4 py-3">Live schema</th>
                <th className="px-4 py-3">Applied timestamp</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Guidance</th>
              </tr>
            </thead>
            <tbody>
              {pagedMigrations.map((migration) => (
                <tr
                  key={`${migration.version}:${migration.filename}`}
                  className="border-t border-[#2a3242] text-[#dbe3ef]"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {migration.version || "Invalid"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-black text-amber-100">
                    {migration.roadmapId}
                    {migration.historicalRoadmapId &&
                    migration.historicalRoadmapId !== migration.roadmapId ? (
                      <span className="mt-1 block text-[10px] font-normal text-[#7f8da3]">
                        Historical {migration.historicalRoadmapId}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-56 break-words px-4 py-3 text-xs">
                    {migration.capability}
                  </td>
                  <td className="max-w-sm break-all px-4 py-3 font-mono text-xs">
                    {migration.filename}
                  </td>
                  <td className="px-4 py-3">
                    {migration.repositoryStatus === "present"
                      ? "Present"
                      : "Missing"}
                  </td>
                  <td className="px-4 py-3">
                    {migration.databaseStatus === "applied"
                      ? "Applied"
                      : migration.databaseStatus === "not_applied"
                        ? "Not applied"
                        : "Unknown"}
                  </td>
                  <td className="px-4 py-3">
                    {liveSchemaLabel(migration.liveSchemaStatus)}
                  </td>
                  <td className="min-w-48 px-4 py-3 text-xs text-[#9aa7b8]">
                    {formatTimestamp(migration.appliedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StateBadge state={migration.state} />
                  </td>
                  <td className="max-w-sm px-4 py-3 text-xs leading-5 text-[#9aa7b8]">
                    <span className="block">
                      {migration.classificationReason}
                    </span>
                    {migration.replacementMigration ? (
                      <span className="mt-2 block break-all font-mono text-red-100">
                        Forward-only: {migration.replacementMigration}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 md:hidden">
          {pagedMigrations.map((migration) => (
            <article
              key={`${migration.version}:${migration.filename}`}
              className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-mono text-xs font-black text-white">
                  {migration.version || "Invalid filename"}
                </p>
                <StateBadge state={migration.state} />
              </div>
              <p className="mt-3 break-all font-mono text-xs leading-5 text-[#c7cfdb]">
                {migration.filename}
              </p>
              <dl className="mt-3 grid gap-3 text-xs">
                <div>
                  <dt className="text-[#7f8da3]">Roadmap ID</dt>
                  <dd className="mt-1 font-mono font-black text-amber-100">
                    {migration.roadmapId}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7f8da3]">Capability</dt>
                  <dd className="mt-1 font-black text-white">
                    {migration.capability}
                  </dd>
                </div>
              </dl>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-[#7f8da3]">Repository</dt>
                  <dd className="mt-1 font-black text-white">
                    {migration.repositoryStatus === "present"
                      ? "Present"
                      : "Missing"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7f8da3]">Migration ledger</dt>
                  <dd className="mt-1 font-black text-white">
                    {migration.databaseStatus === "applied"
                      ? "Applied"
                      : migration.databaseStatus === "not_applied"
                        ? "Not applied"
                        : "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7f8da3]">Live schema</dt>
                  <dd className="mt-1 font-black text-white">
                    {liveSchemaLabel(migration.liveSchemaStatus)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-[#9aa7b8]">
                {migration.classificationReason}
              </p>
              {migration.replacementMigration ? (
                <p className="mt-2 break-all font-mono text-xs leading-5 text-red-100">
                  Forward-only: {migration.replacementMigration}
                </p>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-[#7f8da3]">
                {formatTimestamp(migration.appliedAt)}
              </p>
              <button
                type="button"
                className="beast-button-secondary mt-3 min-h-11 w-full"
                onClick={() =>
                  void copyText(migration.filename, migration.filename)
                }
              >
                {copied === migration.filename ? "Copied" : "Copy filename"}
              </button>
            </article>
          ))}
        </div>
        {!filteredMigrations.length ? (
          <p className="mt-5 rounded-xl border border-dashed border-[#344052] p-4 text-sm text-[#9aa7b8]">
            No migration records match these filters.
          </p>
        ) : null}
        {filteredMigrations.length > BEAST_ADMIN_PAGE_SIZE ? (
          <div className="mt-5">
            <BeastAdminPagination
              page={currentPage}
              totalItems={filteredMigrations.length}
              itemLabel="migration records"
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </DashboardCard>

      <p className="text-xs leading-5 text-[#7f8da3]">
        Migration Status is read-only. It cannot run SQL, alter migration
        history, repair schema, reset a database, or expose migration
        statements.
      </p>
    </div>
  );
}
