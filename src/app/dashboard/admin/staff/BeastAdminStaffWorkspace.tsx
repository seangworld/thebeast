"use client";

import { useEffect, useState } from "react";
import { DashboardCard, MetricTile, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { useBeastAdminCommandCenter } from "@/lib/useBeastAdminCommandCenter";
import { DevelopmentAgentDirectory } from "../development/agents/DevelopmentAgentDirectory";

type StaffBrief = {
  state?: "running" | "never_run" | "clean" | "failed" | "findings";
  runs?: Array<{ started_at: string; finding_count: number; status: string }>;
};

export function BeastAdminStaffWorkspace() {
  const { canonical, loading, error } = useBeastAdminCommandCenter();
  const [brief, setBrief] = useState<StaffBrief | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/staff-operations", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((value) => { if (active) setBrief(value); })
      .catch(() => { if (active) setBrief(null); });
    return () => { active = false; };
  }, []);

  if (loading) return <DashboardCard accent="admin"><SectionHeader eyebrow="Staff" title="Loading staff roster" description="Reading accepted BeastFusion capability and assignment evidence." /></DashboardCard>;
  if (!canonical) return <DashboardCard accent="red"><SectionHeader eyebrow="Staff" title="Staff evidence unavailable" description={error || "Canonical BeastFusion evidence is unavailable."} /></DashboardCard>;

  const activeAssignments = canonical.roadmap.filter((item) => item.executable || ["in_progress", "validation"].includes(item.status)).length;
  const blocked = canonical.roadmap.filter((item) => item.blocked).length;
  const latest = brief?.runs?.[0];

  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Staff management summary">
      <MetricTile label="Development staff" value="6" detail="Governed BeastFusion roles" icon="◎" tone="yellow" />
      <MetricTile label="Active assignments" value={String(activeAssignments)} detail="Current governed work" icon="▶" tone="yellow" />
      <MetricTile label="Blocked work" value={String(blocked)} detail="Explicit blockers only" icon="!" tone="yellow" />
      <MetricTile label="Operations watch" value={brief?.state === "findings" ? String(latest?.finding_count ?? 0) : brief?.state === "failed" ? "Error" : brief?.state === "running" ? "Running" : "Clear"} detail="Latest standing observation" icon="◉" tone="yellow" />
    </section>
    <DevelopmentAgentDirectory canonical={canonical} />
  </div>;
}
