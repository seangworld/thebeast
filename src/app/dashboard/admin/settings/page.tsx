import { BeastAdminShell } from "../BeastAdminShell";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { beastAdminBetaAssignableModules, beastAdminBetaAssignments } from "@/lib/beastAdmin";

export default function BeastAdminSettingsPage() {
  return (
    <BeastAdminShell
      title="Settings"
      description="Owner-only settings foundation for module visibility and beta access controls."
    >
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Beta Access"
          title="Beta assignments are separate from user role"
          description={`${beastAdminBetaAssignments.length} assignment is seeded. Assignable beta modules: ${beastAdminBetaAssignableModules.join(", ")}.`}
        />
      </DashboardCard>
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Visibility"
          title="Module visibility controls"
          description="Supported states are Admin Only, Beta, Released, and Disabled. Interactive editing is reserved for the next phase."
        />
      </DashboardCard>
    </BeastAdminShell>
  );
}
