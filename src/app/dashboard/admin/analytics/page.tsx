import { BeastAdminShell, AdminMetricGrid } from "../BeastAdminShell";
import {
  beastAdminBetaAssignments,
  beastAdminFeedbackItems,
  beastAdminMembers,
  buildBeastAdminAnalytics,
} from "@/lib/beastAdmin";
import { beastModuleRegistry } from "@/lib/moduleRegistry";

export default function BeastAdminAnalyticsPage() {
  const analytics = buildBeastAdminAnalytics({
    members: beastAdminMembers,
    moduleCount: beastModuleRegistry.length,
    feedbackCount: beastAdminFeedbackItems.length,
    betaAssignments: beastAdminBetaAssignments,
  });

  return (
    <BeastAdminShell
      title="Analytics"
      description="Foundation metrics for owner review. Charts and third-party analytics integrations are deferred."
    >
      <AdminMetricGrid
        metrics={[
          { label: "Total Members", value: String(analytics.totalMembers), detail: "All member records", icon: "T" },
          { label: "Active Members", value: String(analytics.activeMembers), detail: "Currently active", icon: "A" },
          { label: "Module Count", value: String(analytics.moduleCount), detail: "Registered Beast apps", icon: "M" },
          { label: "Feedback Count", value: String(analytics.feedbackCount), detail: "Feedback items", icon: "F" },
          { label: "Beta Users", value: String(analytics.betaUsers), detail: "Assigned beta access", icon: "B" },
        ]}
      />
    </BeastAdminShell>
  );
}
