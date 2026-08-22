"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  canonicalEvidenceHref,
  canonicalStatusLabel,
} from "@/lib/beastAdminCommandCenter";
import { useBeastAdminCommandCenter } from "@/lib/useBeastAdminCommandCenter";

const inputClassName =
  "min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15";

export function BeastAdminRoadmapWorkspace() {
  const { canonical, loading, error, reload } = useBeastAdminCommandCenter();
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState("all");
  const [status, setStatus] = useState("all");

  const products = useMemo(
    () =>
      canonical
        ? Array.from(new Set(canonical.roadmap.map((item) => item.product))).sort()
        : [],
    [canonical]
  );
  const statuses = useMemo(
    () =>
      canonical
        ? Array.from(new Set(canonical.roadmap.map((item) => item.status))).sort()
        : [],
    [canonical]
  );
  const visible = useMemo(() => {
    if (!canonical) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return canonical.roadmap
      .filter((item) => product === "all" || item.product === product)
      .filter((item) => status === "all" || item.status === status)
      .filter(
        (item) =>
          !normalizedQuery ||
          [item.id, item.title, item.summary || "", item.product]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
      )
      .sort(
        (left, right) =>
          Number(left.roadmapOrder ?? 0) - Number(right.roadmapOrder ?? 0) ||
          left.id.localeCompare(right.id)
      );
  }, [canonical, product, query, status]);

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Canonical Product Roadmap"
          title="Loading governed roadmap"
          description="BeastAdmin is loading the accepted BeastFusion projection."
        />
        <div className="mt-5 h-28 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" aria-busy="true" />
      </DashboardCard>
    );
  }

  if (!canonical) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Canonical Product Roadmap"
          title="Canonical roadmap unavailable"
          description={error}
        />
        <p className="mt-4 text-sm leading-6 text-slate-300">
          BeastAdmin did not substitute legacy owner roadmap rows.
        </p>
        <button type="button" onClick={() => void reload()} className="beast-button mt-5">
          Retry canonical source
        </button>
      </DashboardCard>
    );
  }

  const counts = {
    total: canonical.roadmap.length,
    blocked: canonical.roadmap.filter((item) => item.blocked).length,
    executable: canonical.roadmap.filter((item) => item.executable).length,
    complete: canonical.roadmap.filter((item) =>
      ["complete", "released", "archived"].includes(item.status)
    ).length,
  };
  const sourceCommit = canonical.projection?.sourceCommit;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Canonical roadmap summary">
        <MetricTile label="Canonical items" value={String(counts.total)} detail="Indexed from BeastFusion" icon="◫" tone="yellow" />
        <MetricTile label="Complete / released" value={String(counts.complete)} detail="Governed terminal states" icon="✓" tone="yellow" />
        <MetricTile label="Blocked" value={String(counts.blocked)} detail="Explicit canonical blockers" icon="!" tone="yellow" />
        <MetricTile label="Executable now" value={String(counts.executable)} detail="All execution gates passed" icon="▶" tone="yellow" />
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Canonical Product Roadmap"
          title="Read-only governed delivery truth"
          description="Only the accepted BeastFusion projection can set roadmap status, dependencies, authorization, blockers, or executable state."
          action={
            <Link href="/dashboard/admin/roadmap/intake" className="beast-button">
              Candidate intake and annotations
            </Link>
          }
        />
        <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-slate-300">
          Owner ideas and BeastHunter handoffs remain editable in the separate
          non-canonical intake workspace. They do not become governed work until
          BeastFusion records explicit approval and authorization.
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <label className="text-sm font-bold text-slate-300">
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClassName} mt-2`} placeholder="Package, product, title, or summary" />
          </label>
          <label className="text-sm font-bold text-slate-300">
            Product
            <select value={product} onChange={(event) => setProduct(event.target.value)} className={`${inputClassName} mt-2`}>
              <option value="all">All products</option>
              {products.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-300">
            State
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${inputClassName} mt-2`}>
              <option value="all">All states</option>
              {statuses.map((item) => <option key={item} value={item}>{canonicalStatusLabel(item)}</option>)}
            </select>
          </label>
        </div>
      </DashboardCard>

      <section className="space-y-3" aria-label="Canonical roadmap items">
        {visible.length ? (
          visible.map((item) => {
            const sourceHref = canonicalEvidenceHref(item.sourceReference, sourceCommit);
            return (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
                <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-amber-200">{item.id}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-black text-slate-300">{item.product}</span>
                      <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[11px] font-black text-amber-100">{canonicalStatusLabel(item.status)}</span>
                      {item.blocked ? <span className="rounded-full border border-red-300/30 bg-red-300/10 px-2 py-1 text-[11px] font-black text-red-100">Blocked</span> : null}
                      {item.executable ? <span className="rounded-full border border-green-300/30 bg-green-300/10 px-2 py-1 text-[11px] font-black text-green-100">Executable</span> : null}
                    </div>
                    <h2 className="mt-3 text-lg font-black text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.summary || "No canonical summary recorded."}</p>
                  </div>
                  <dl className="grid shrink-0 grid-cols-2 gap-2 text-xs lg:w-[300px]">
                    <div className="rounded-lg border border-white/10 p-3"><dt className="text-slate-500">Owner approved</dt><dd className="mt-1 font-black text-white">{item.ownerApproved ? "Yes" : "No"}</dd></div>
                    <div className="rounded-lg border border-white/10 p-3"><dt className="text-slate-500">Execution authorized</dt><dd className="mt-1 font-black text-white">{item.executionAuthorized ? "Yes" : "No"}</dd></div>
                    <div className="rounded-lg border border-white/10 p-3"><dt className="text-slate-500">Prerequisites</dt><dd className="mt-1 font-black text-white">{item.prerequisitesComplete ? "Complete" : "Incomplete"}</dd></div>
                    <div className="rounded-lg border border-white/10 p-3"><dt className="text-slate-500">Priority</dt><dd className="mt-1 font-black text-white">{canonicalStatusLabel(item.priority)}</dd></div>
                  </dl>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400">
                    <span className="font-black text-slate-300">Dependencies:</span> {item.dependencies.join(", ") || "None"}
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400">
                    <span className="font-black text-slate-300">Blocker codes:</span> {item.blockerCodes?.join(", ") || "None"}
                  </div>
                </div>
                {item.ownerAction ? <p className="mt-4 text-sm font-bold text-amber-100">Owner action: {item.ownerAction}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  {sourceHref ? <a href={sourceHref} target="_blank" rel="noreferrer" className="font-bold text-amber-200 underline underline-offset-4">Open canonical source</a> : <span className="text-slate-500">{item.sourceReference || "Source reference unavailable"}</span>}
                  {(item.evidenceReferences || []).map((reference) => {
                    const href = canonicalEvidenceHref(reference, sourceCommit);
                    return href ? <a key={reference} href={href} target="_blank" rel="noreferrer" className="font-bold text-amber-200 underline underline-offset-4">{reference}</a> : <span key={reference} className="font-mono text-slate-500">{reference}</span>;
                  })}
                </div>
              </article>
            );
          })
        ) : (
          <DashboardCard accent="admin">
            <p className="text-sm text-slate-400">No canonical roadmap items match these filters.</p>
          </DashboardCard>
        )}
      </section>
    </div>
  );
}
