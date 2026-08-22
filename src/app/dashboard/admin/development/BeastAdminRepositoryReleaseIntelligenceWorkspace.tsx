"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  normalizeBeastAdminRepositoryReleaseSnapshot,
  type BeastAdminEvidenceSourceState,
  type BeastAdminRepositoryReleaseSnapshot,
  type BeastAdminReleaseEvidenceState,
} from "@/lib/beastAdminRepositoryReleaseIntelligence";

const providerClasses: Record<BeastAdminEvidenceSourceState, string> = {
  connected: "border-green-300/35 bg-green-300/10 text-green-100",
  partial: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  not_configured: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  unavailable: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  stale: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  error: "border-red-300/35 bg-red-300/10 text-red-100",
};

const evidenceClasses: Record<BeastAdminReleaseEvidenceState, string> = {
  verified_current: "border-green-300/35 bg-green-300/10 text-green-100",
  verified_deployed: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  drift_detected: "border-red-300/35 bg-red-300/10 text-red-100",
  provider_observed: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  declared_only: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  canonical_only: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  stale: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  provider_error: "border-red-300/35 bg-red-300/10 text-red-100",
  unavailable: "border-slate-300/30 bg-slate-300/10 text-slate-200",
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function shortCommit(value: string | null) {
  return value ? value.slice(0, 10) : "Unavailable";
}

function timestamp(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusPill({
  value,
  className,
}: {
  value: string;
  className: string;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-black capitalize ${className}`}
    >
      {label(value)}
    </span>
  );
}

function humanizeError(status: number) {
  if (status === 401) return "Sign in again to load repository intelligence.";
  if (status === 403) return "Repository intelligence is owner-only.";
  return "Verified repository intelligence is unavailable. Canonical truth was not replaced with legacy data.";
}

export function BeastAdminRepositoryReleaseIntelligenceWorkspace() {
  const [snapshot, setSnapshot] =
    useState<BeastAdminRepositoryReleaseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const response = await fetch(
        "/api/admin/repository-release-intelligence",
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      if (!response.ok) throw new Error(humanizeError(response.status));
      const normalized = normalizeBeastAdminRepositoryReleaseSnapshot(
        (await response.json()) as unknown
      );
      if (!normalized) throw new Error("Repository intelligence returned an invalid snapshot.");
      setSnapshot(normalized);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Repository intelligence could not load.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            eyebrow="BA-CMD-001B"
            title="Canonical repository and release intelligence"
            description="BeastFusion supplies governance truth. Read-only provider evidence verifies repository heads and served commits without making release or deployment changes."
          />
          <button
            type="button"
            onClick={() => void load(false)}
            disabled={loading || refreshing}
            className="min-h-10 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh evidence"}
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        {loading && !snapshot ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]" />
            ))}
          </div>
        ) : null}

        {snapshot ? (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">BeastFusion canonical</p>
                <div className="mt-2">
                  <StatusPill value={snapshot.canonicalProvider.status} className={providerClasses[snapshot.canonicalProvider.status === "drift_detected" ? "error" : snapshot.canonicalProvider.status === "no_snapshot" ? "unavailable" : snapshot.canonicalProvider.status]} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#9aa7b8]">{snapshot.canonicalProvider.detail}</p>
              </article>
              {(["github", "vercel"] as const).map((provider) => (
                <article key={provider} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">{provider}</p>
                  <div className="mt-2">
                    <StatusPill value={snapshot.providers[provider].status} className={providerClasses[snapshot.providers[provider].status]} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#9aa7b8]">{snapshot.providers[provider].detail}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {snapshot.repositories.map((repository) => (
                <article key={repository.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">{repository.repository}</p>
                      <h3 className="mt-1 text-lg font-black text-white">{repository.label}</h3>
                    </div>
                    <StatusPill value={repository.sourceState} className={providerClasses[repository.sourceState]} />
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-[#7f8da3]">Default head</dt><dd className="mt-1 font-mono font-bold text-white">{shortCommit(repository.headCommit)}</dd></div>
                    <div><dt className="text-[#7f8da3]">Local worktree</dt><dd className="mt-1 font-bold capitalize text-[#c7cfdb]">{repository.worktree}</dd></div>
                    <div><dt className="text-[#7f8da3]">Preview served</dt><dd className="mt-1 font-mono font-bold text-white">{shortCommit(repository.preview.servedCommit)}</dd></div>
                    <div><dt className="text-[#7f8da3]">Production served</dt><dd className="mt-1 font-mono font-bold text-white">{shortCommit(repository.production.servedCommit)}</dd></div>
                  </dl>
                  <p className="mt-4 text-sm leading-6 text-[#9aa7b8]">Production vs repository: <strong className="capitalize text-white">{label(repository.productionComparison)}</strong>. Observed {timestamp(repository.observedAt)}.</p>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </DashboardCard>

      {snapshot ? (
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Release truth table"
            title="Canonical releases compared with provider evidence"
            description="A BeastAdmin note can supplement this evidence, but it cannot override a BeastFusion release record."
          />
          <div className="mt-5 overflow-x-auto rounded-xl border border-[#2a3242]">
            <table className="min-w-full divide-y divide-[#2a3242] text-left text-sm">
              <thead className="bg-[#111827] text-xs uppercase tracking-wide text-[#7f8da3]">
                <tr><th className="px-4 py-3">Canonical release</th><th className="px-4 py-3">Declared</th><th className="px-4 py-3">Repository</th><th className="px-4 py-3">Production</th><th className="px-4 py-3">Evidence</th></tr>
              </thead>
              <tbody className="divide-y divide-[#2a3242] bg-[#0f1623]">
                {snapshot.releases.map((release) => (
                  <tr key={release.id}>
                    <td className="px-4 py-3"><p className="font-black text-white">{release.id}</p><p className="mt-1 text-xs text-[#7f8da3]">{release.product} · {release.version || "No version"}</p></td>
                    <td className="px-4 py-3 font-mono text-[#c7cfdb]">{shortCommit(release.declaredCommit)}</td>
                    <td className="px-4 py-3 font-mono text-[#c7cfdb]">{shortCommit(release.repositoryHead)}</td>
                    <td className="px-4 py-3 font-mono text-[#c7cfdb]">{shortCommit(release.productionServedCommit)}</td>
                    <td className="max-w-sm px-4 py-3"><StatusPill value={release.evidenceState} className={evidenceClasses[release.evidenceState]} /><p className="mt-2 text-xs leading-5 text-[#9aa7b8]">{release.evidenceDetail}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-black text-white">BeastAdmin operational notes</h3>
            <p className="mt-1 text-sm text-[#9aa7b8]">Preserved owner annotations and legacy evidence. These are not canonical release truth.</p>
            {snapshot.operationalNotes.length ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {snapshot.operationalNotes.map((note) => (
                  <article key={note.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-white">{note.title}</p><span className="text-xs font-black uppercase text-amber-100">{note.classification}</span></div>
                    <p className="mt-2 text-sm text-[#9aa7b8]">{note.product} · {note.version} · updated {timestamp(note.updatedAt)}</p>
                  </article>
                ))}
              </div>
            ) : <p className="mt-3 rounded-xl border border-dashed border-[#2a3242] p-4 text-sm text-[#9aa7b8]">No supplemental operational notes are available.</p>}
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}
