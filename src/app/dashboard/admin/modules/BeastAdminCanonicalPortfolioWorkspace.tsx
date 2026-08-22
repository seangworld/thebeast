"use client";

import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { canonicalStatusLabel } from "@/lib/beastAdminCommandCenter";
import { useBeastAdminCommandCenter } from "@/lib/useBeastAdminCommandCenter";

export function BeastAdminCanonicalPortfolioWorkspace() {
  const { canonical, loading, error, reload } = useBeastAdminCommandCenter();

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="Canonical portfolio" title="Loading governed products" description="BeastAdmin is loading the accepted BeastFusion product projection." />
        <div className="mt-5 h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
      </DashboardCard>
    );
  }
  if (!canonical) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="Canonical portfolio" title="Governed product portfolio unavailable" description={error} />
        <button type="button" onClick={() => void reload()} className="beast-button mt-5">Retry canonical source</button>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard accent="admin">
      <SectionHeader
        eyebrow="Canonical portfolio"
        title="Governed ecosystem products"
        description={`Projection ${canonical.projection?.projectionId || "unavailable"} · source ${canonical.projection?.sourceCommit || "unavailable"} · last confirmed ${canonical.projection?.lastConfirmedAt || "unavailable"}`}
      />
      <div className="mt-5 overflow-x-auto" tabIndex={0} aria-label="Canonical ecosystem portfolio, horizontally scrollable">
        <table className="min-w-[64rem] w-full text-left text-sm">
          <thead className="text-slate-400"><tr><th className="p-3">Product</th><th className="p-3">Version</th><th className="p-3">Lifecycle</th><th className="p-3">Channel</th><th className="p-3">Declared deployment</th><th className="p-3">Repository</th></tr></thead>
          <tbody>
            {canonical.products.map((entry) => (
              <tr key={entry.id} className="border-t border-white/10 text-slate-200">
                <td className="p-3"><span className="font-bold text-white">{entry.name}</span><p className="mt-1 font-mono text-xs text-slate-500">{entry.id}</p></td>
                <td className="p-3">{entry.version || "Not recorded"}</td>
                <td className="p-3">{canonicalStatusLabel(entry.lifecycle)}</td>
                <td className="p-3">{entry.channel ? canonicalStatusLabel(entry.channel) : "Not recorded"}</td>
                <td className="p-3">{canonicalStatusLabel(entry.declaredDeployment)}</td>
                <td className="p-3 text-slate-400">{entry.ownerRepository || "Not recorded"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
