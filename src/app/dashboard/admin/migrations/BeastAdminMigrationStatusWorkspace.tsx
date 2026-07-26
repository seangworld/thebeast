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
        (migration) => migration.state !== "applied"
      ) || [],
    [snapshot]
  );

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
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryValue
            label="Repository migrations"
            value={String(snapshot.summary.repositoryMigrations)}
            detail={`Latest ${snapshot.summary.latestRepositoryMigration || "not available"}`}
          />
          <SummaryValue
            label="Applied"
            value={String(snapshot.summary.applied)}
            detail={`Latest ${snapshot.summary.latestAppliedMigration || "not available"}`}
          />
          <SummaryValue
            label="Pending"
            value={String(snapshot.summary.pending)}
            detail={
              snapshot.summary.pending
                ? "Apply in the exact sequence below"
                : "Repository and history contain no pending versions"
            }
          />
          <SummaryValue
            label="History issues"
            value={String(
              snapshot.summary.outOfOrder +
                snapshot.summary.databaseOnly +
                snapshot.summary.duplicateVersions +
                snapshot.summary.invalidFilenames
            )}
            detail={`${snapshot.summary.outOfOrder} out of order · ${snapshot.summary.databaseOnly} database-only`}
          />
        </div>
      </DashboardCard>

      <DashboardCard accent={snapshot.pendingSequence.length ? "yellow" : "green"}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            eyebrow="Exact pending sequence"
            title={
              snapshot.pendingSequence.length
                ? "Apply these migrations next"
                : "No pending repository migrations"
            }
            description={
              snapshot.pendingSequence.length
                ? "The order below follows repository version order. BeastAdmin does not apply or repair these migrations."
                : "Every valid repository migration is recorded in the connected database history."
            }
          />
          {snapshot.pendingSequence.length ? (
            <button
              type="button"
              className="beast-button-secondary min-h-11"
              onClick={() =>
                void copyText(
                  "pending",
                  snapshot.pendingSequence
                    .map((filename, index) => `${index + 1}. ${filename}`)
                    .join("\n")
                )
              }
            >
              {copied === "pending" ? "Copied" : "Copy ordered list"}
            </button>
          ) : null}
        </div>
        {snapshot.pendingSequence.length ? (
          <ol className="mt-5 grid gap-2">
            {snapshot.pendingSequence.map((filename) => (
              <li
                key={filename}
                className="flex min-w-0 gap-3 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-50"
              >
                <span className="font-black">
                  {snapshot.pendingSequence.indexOf(filename) + 1}.
                </span>
                <span className="min-w-0 break-all font-mono">{filename}</span>
              </li>
            ))}
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
          description="Every repository file is shown alongside its authoritative database-history state."
        />
        <div
          className="beast-table-wrap mt-5 hidden overflow-x-auto rounded-xl border border-[#2a3242] md:block"
          role="region"
          aria-label="Migration inventory table"
          tabIndex={0}
        >
          <table className="min-w-[960px] text-left text-sm">
            <thead className="bg-[#111827] text-xs uppercase tracking-wide text-[#7f8da3]">
              <tr>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Repository</th>
                <th className="px-4 py-3">Database</th>
                <th className="px-4 py-3">Applied timestamp</th>
                <th className="px-4 py-3">State</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.migrations.map((migration) => (
                <tr
                  key={`${migration.version}:${migration.filename}`}
                  className="border-t border-[#2a3242] text-[#dbe3ef]"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {migration.version || "Invalid"}
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
                  <td className="min-w-48 px-4 py-3 text-xs text-[#9aa7b8]">
                    {formatTimestamp(migration.appliedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StateBadge state={migration.state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 md:hidden">
          {snapshot.migrations.map((migration) => (
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
                  <dt className="text-[#7f8da3]">Database</dt>
                  <dd className="mt-1 font-black text-white">
                    {migration.databaseStatus === "applied"
                      ? "Applied"
                      : migration.databaseStatus === "not_applied"
                        ? "Not applied"
                        : "Unknown"}
                  </dd>
                </div>
              </dl>
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
      </DashboardCard>

      <p className="text-xs leading-5 text-[#7f8da3]">
        Migration Status is read-only. It cannot run SQL, alter migration
        history, repair schema, reset a database, or expose migration
        statements.
      </p>
    </div>
  );
}
