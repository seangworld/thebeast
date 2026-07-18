import { BeastAdminShell, AdminMetricGrid } from "./BeastAdminShell";
import {
  beastAdminBetaAssignments,
  beastAdminFeedbackItems,
  beastAdminMembers,
  buildBeastAdminAnalytics,
} from "@/lib/beastAdmin";
import { beastModuleRegistry } from "@/lib/moduleRegistry";
import { formatVersionIdentity, versionManifest } from "@/lib/appVersion";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";

export default function BeastAdminDashboardPage() {
  const analytics = buildBeastAdminAnalytics({
    members: beastAdminMembers,
    moduleCount: beastModuleRegistry.length,
    feedbackCount: beastAdminFeedbackItems.length,
    betaAssignments: beastAdminBetaAssignments,
  });

  return (
    <BeastAdminShell
      title="BeastAdmin"
      description="Owner-only operating center for members, modules, beta access, feedback, analytics, ads, and settings."
    >
      <AdminMetricGrid
        metrics={[
          { label: "Members", value: String(analytics.totalMembers), detail: "Known member records", icon: "M" },
          { label: "Active Modules", value: String(beastModuleRegistry.filter((module) => module.enabled).length), detail: "Enabled registry entries", icon: "A" },
          { label: "Beta Testers", value: String(analytics.betaUsers), detail: "Members with beta assignments", icon: "B" },
          { label: "Feedback", value: String(analytics.feedbackCount), detail: "Feedback records awaiting review", icon: "F" },
          { label: "Recent Activity", value: "Ready", detail: "Activity stream placeholder", icon: "R" },
          { label: "Platform Status", value: "Stable", detail: "No active admin blocker recorded", icon: "S" },
        ]}
      />
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Foundation"
          title="BeastAdmin Phase A"
          description="This foundation keeps operational controls owner-only while deeper editing, analytics integrations, and ads tooling remain deferred."
        />
      </DashboardCard>
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Versions"
          title="Canonical product identities"
          description="Generated from the BeastFusion central version registry. Release and deployment controls remain outside BeastAdmin."
        />
        <div className="mt-4 grid gap-2 text-sm text-[#c7cfdb]">
          {Object.keys(versionManifest).map((identity) => (
            <p key={identity}>{formatVersionIdentity(identity as keyof typeof versionManifest)}</p>
          ))}
        </div>
      </DashboardCard>
    </BeastAdminShell>
  );
}
