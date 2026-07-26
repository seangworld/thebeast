"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminPlatformHealthStatusLabels,
  beastAdminPlatformServiceLabels,
  getBeastAdminPlatformHealthCounts,
  normalizeBeastAdminPlatformHealthSnapshot,
  type BeastAdminPlatformHealthSnapshot,
  type BeastAdminPlatformHealthSource,
  type BeastAdminPlatformHealthStatus,
} from "@/lib/beastAdminPlatformHealth";

const statusClasses: Record<BeastAdminPlatformHealthStatus, string> = {
  operational: "border-green-300/35 bg-green-300/10 text-green-100",
  warning: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  critical: "border-red-300/35 bg-red-300/10 text-red-100",
  unknown: "border-slate-300/30 bg-slate-300/10 text-slate-200",
};

const sourceLabels: Record<BeastAdminPlatformHealthSource, string> = {
  live_probe: "Live probe",
  configuration: "Configuration",
  request_sample: "Request sample",
  not_connected: "Monitor not connected",
};

function humanizeHealthError(status: number, payload: unknown) {
  const message =
    payload && typeof payload === "object" && "error" in payload
      ? String((payload as { error: unknown }).error)
      : "";
  if (status === 401) return "Sign in again to refresh Platform Health.";
  if (status === 403) return "Platform Health is restricted to the Beast owner.";
  if (/database probe failed/i.test(message)) {
    return "The database probe failed, so BeastAdmin could not safely verify owner access.";
  }
  return (
    message ||
    "Platform Health could not complete its live probes. Retry in a moment."
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function BeastAdminPlatformHealthWorkspace() {
  const [snapshot, setSnapshot] =
    useState<BeastAdminPlatformHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refreshHealth = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const response = await fetch("/api/admin/platform-health", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        throw new Error(humanizeHealthError(response.status, payload));
      }
      const normalized = normalizeBeastAdminPlatformHealthSnapshot(payload);
      if (!normalized) {
        throw new Error("Platform Health returned an invalid service snapshot.");
      }
      setSnapshot(normalized);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Platform Health could not complete its live probes."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth(true);
    const interval = window.setInterval(() => {
      void refreshHealth();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [refreshHealth]);

  const counts = useMemo(
    () => (snapshot ? getBeastAdminPlatformHealthCounts(snapshot) : null),
    [snapshot]
  );

  if (loading && !snapshot) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Platform Health"
          title="Checking platform services"
          description="BeastAdmin is running owner-authorized, read-only probes without exposing credentials or member data."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
            />
          ))}
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCard
        accent={
          snapshot?.overallStatus === "critical"
            ? "red"
            : snapshot?.overallStatus === "operational"
              ? "green"
              : "yellow"
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="beast-kicker">Current operational readout</p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {snapshot
                ? beastAdminPlatformHealthStatusLabels[
                    snapshot.overallStatus
                  ]
                : "Health unavailable"}
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-[#dbe3ef]">
              {snapshot?.overallStatus === "critical"
                ? "At least one verified platform service failed its latest probe."
                : snapshot?.overallStatus === "warning"
                  ? "No verified outage is hidden, but one or more services need attention or lack monitoring."
                  : snapshot
                    ? "Every monitored service passed its latest evidence-backed check."
                    : error}
            </p>
            {snapshot ? (
              <p className="mt-3 text-sm text-[#9aa7b8]">
                Last refreshed {formatTimestamp(snapshot.generatedAt)} ·
                Automatically checks every 60 seconds
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="beast-button min-w-32"
            onClick={() => void refreshHealth()}
            disabled={refreshing}
          >
            {refreshing ? "Checking…" : "Refresh now"}
          </button>
        </div>
      </DashboardCard>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300/35 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100"
        >
          {error} {snapshot ? "The last successful snapshot remains visible." : ""}
        </p>
      ) : null}

      {snapshot && counts ? (
        <>
          <section
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Platform health status counts"
          >
            {(
              [
                ["Operational", counts.operational],
                ["Warnings", snapshot.warnings.length],
                ["Errors", snapshot.errors.length],
                ["Unknown", counts.unknown],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <p className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-black text-white">{value}</p>
              </div>
            ))}
          </section>

          <section
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
            aria-label="Monitored platform services"
          >
            {snapshot.services.map((service) => (
              <article
                key={service.id}
                className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-black text-white">
                    {beastAdminPlatformServiceLabels[service.id]}
                  </h3>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClasses[service.status]}`}
                  >
                    {beastAdminPlatformHealthStatusLabels[service.status]}
                  </span>
                </div>
                <p className="mt-4 text-sm font-bold leading-6 text-[#dbe3ef]">
                  {service.summary}
                </p>
                <p className="mt-3 text-xs leading-5 text-[#9aa7b8]">
                  {service.evidence}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#2a3242] pt-4 text-xs">
                  <div>
                    <dt className="font-black uppercase tracking-wide text-[#68768b]">
                      Source
                    </dt>
                    <dd className="mt-1 text-[#c7cfdb]">
                      {sourceLabels[service.source]}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-black uppercase tracking-wide text-[#68768b]">
                      Latency
                    </dt>
                    <dd className="mt-1 text-[#c7cfdb]">
                      {service.latencyMs === null
                        ? "Not measured"
                        : `${service.latencyMs} ms`}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <DashboardCard accent={snapshot.errors.length ? "red" : "green"}>
              <SectionHeader
                eyebrow="Errors"
                title={
                  snapshot.errors.length
                    ? `${snapshot.errors.length} verified service errors`
                    : "No verified service errors"
                }
                description="Errors appear only when a live probe confirms a current service failure."
              />
              <div className="mt-5 grid gap-3">
                {snapshot.errors.map((issue) => (
                  <div
                    key={issue.serviceId}
                    className="rounded-xl border border-red-300/35 bg-red-300/10 p-4"
                  >
                    <p className="font-black text-red-100">
                      {issue.serviceLabel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
                      {issue.message}
                    </p>
                  </div>
                ))}
                {!snapshot.errors.length ? (
                  <p className="rounded-xl border border-green-300/25 bg-green-300/10 p-4 text-sm leading-6 text-green-100">
                    No live probe reported a current failure. This does not
                    replace a centralized historical error feed.
                  </p>
                ) : null}
              </div>
            </DashboardCard>

            <DashboardCard
              accent={snapshot.warnings.length ? "yellow" : "green"}
            >
              <SectionHeader
                eyebrow="Warnings"
                title={
                  snapshot.warnings.length
                    ? `${snapshot.warnings.length} warnings or unknowns`
                    : "No current warnings"
                }
                description="Warnings include degraded configuration and services that cannot yet be verified."
              />
              <div className="mt-5 grid gap-3">
                {snapshot.warnings.map((issue) => (
                  <div
                    key={issue.serviceId}
                    className="rounded-xl border border-amber-300/35 bg-amber-300/10 p-4"
                  >
                    <p className="font-black text-amber-100">
                      {issue.serviceLabel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
                      {issue.message}
                    </p>
                  </div>
                ))}
                {!snapshot.warnings.length ? (
                  <p className="rounded-xl border border-green-300/25 bg-green-300/10 p-4 text-sm leading-6 text-green-100">
                    Every monitored service has evidence for its current state.
                  </p>
                ) : null}
              </div>
            </DashboardCard>
          </section>
        </>
      ) : (
        <DashboardCard accent="red">
          <SectionHeader
            eyebrow="Platform Health"
            title="No health snapshot is available"
            description={
              error ||
              "BeastAdmin could not retrieve an evidence-backed platform snapshot."
            }
          />
        </DashboardCard>
      )}

      <p className="text-xs leading-5 text-[#7f8da3]">
        Platform Health is owner-only and read-only. It never exposes
        credentials, sends test email, performs paid AI inference, reads
        document contents, or claims uptime from missing telemetry.
      </p>
    </div>
  );
}
