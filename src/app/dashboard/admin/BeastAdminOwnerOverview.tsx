"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DashboardCard, MetricTile, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { buildBeastAdminCEOModeSnapshot, normalizeBeastAdminCEOSourceSnapshot, type BeastAdminCEOModeSnapshot } from "@/lib/beastAdminCEOMode";
import { normalizeBeastAdminPlatformHealthSnapshot } from "@/lib/beastAdminPlatformHealth";

export function BeastAdminOwnerOverview() {
  const [snapshot, setSnapshot] = useState<BeastAdminCEOModeSnapshot | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [sourceResponse, healthResponse] = await Promise.all([
        fetch("/api/admin/ceo-mode", { cache: "no-store" }),
        fetch("/api/admin/platform-health", { cache: "no-store" }),
      ]);
      if (!sourceResponse.ok) throw new Error("Owner status could not be loaded.");
      const source = normalizeBeastAdminCEOSourceSnapshot(await sourceResponse.json());
      if (!source) throw new Error("Owner status returned invalid evidence.");
      const health = healthResponse.ok ? normalizeBeastAdminPlatformHealthSnapshot(await healthResponse.json()) : null;
      setSnapshot(buildBeastAdminCEOModeSnapshot({ source, platformHealth: health, platformHealthAvailable: Boolean(health), now: new Date(source.generatedAt) }));
    } catch (reason) {
      setSnapshot(null);
      setError(reason instanceof Error ? reason.message : "Owner status could not be loaded.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!snapshot) return <DashboardCard accent={error ? "red" : "admin"}><SectionHeader eyebrow="Owner status" title={error || "Checking the platform"} description={error ? "BeastAdmin did not substitute missing evidence." : "Reading current health, governance, member, and work evidence."} /></DashboardCard>;

  const attention = [...snapshot.operationalErrors, ...snapshot.needsAttention];
  const critical = attention.filter((item) => item.priority === "critical").length;
  const warnings = attention.length - critical;
  const status = critical ? "CRITICAL ATTENTION" : warnings ? "ATTENTION NEEDED" : "ALL SYSTEMS NORMAL";
  const accent = critical ? "red" : warnings ? "yellow" : "green";

  return <div className="space-y-6">
    <DashboardCard accent={accent}>
      <SectionHeader eyebrow="Owner status" title={status} description={attention.length ? "Only verified operational issues, blockers, governance findings, and owner decisions appear here." : "No verified operational issue currently requires your attention."} />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Critical" value={String(critical)} detail="Verified urgent issues" icon="!" tone="yellow" />
        <MetricTile label="Warnings" value={String(warnings)} detail="Needs review" icon="△" tone="yellow" />
        <MetricTile label="Members" value={snapshot.summaries.members.total === null ? "—" : String(snapshot.summaries.members.total)} detail="Authoritative accounts" icon="◎" tone="yellow" />
        <MetricTile label="Active work" value={snapshot.summaries.development.openPrompts === null ? "—" : String(snapshot.summaries.development.openPrompts)} detail="Governed current work" icon="▶" tone="yellow" />
      </div>
      {attention.length ? <div className="mt-5 space-y-2">{attention.slice(0, 5).map((item) => <Link key={item.id} href={item.href} className="block rounded-xl border border-white/10 bg-white/[0.03] p-4"><span className="text-xs font-black uppercase tracking-wide text-amber-200">{item.priority} · {item.area}</span><p className="mt-1 font-black text-white">{item.title}</p><p className="mt-1 text-sm text-slate-300">{item.why}</p></Link>)}</div> : null}
    </DashboardCard>
    <div className="grid gap-4 md:grid-cols-3">
      <Link href="/dashboard/admin/staff" className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"><p className="text-xs font-black uppercase tracking-wide text-amber-200">Staff</p><p className="mt-2 text-lg font-black text-white">Manage development staff</p><p className="mt-2 text-sm text-slate-400">Capabilities, limitations, assignments and authority.</p></Link>
      <Link href="/dashboard/admin/members" className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"><p className="text-xs font-black uppercase tracking-wide text-amber-200">Members</p><p className="mt-2 text-lg font-black text-white">{snapshot.summaries.members.total === null ? "Member status" : snapshot.summaries.members.total + " total accounts"}</p><p className="mt-2 text-sm text-slate-400">Directory, activity and access.</p></Link>
      <Link href="/dashboard/operations/analytics" className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"><p className="text-xs font-black uppercase tracking-wide text-amber-200">Analytics</p><p className="mt-2 text-lg font-black text-white">Open SEANGWORLD HQ analytics</p><p className="mt-2 text-sm text-slate-400">Company-level audience and operating intelligence.</p></Link>
    </div>
  </div>;
}
