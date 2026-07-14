import { BeastAdminShell } from "../BeastAdminShell";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";

export default function BeastAdminAdsPage() {
  return (
    <BeastAdminShell
      title="Ads"
      description="Future advertising workspace. Campaign creation, placement controls, and reporting are intentionally deferred."
    >
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Deferred"
          title="Advertising workspace placeholder"
          description="This area exists so owner navigation and permissions are ready before ad functionality is approved."
        />
      </DashboardCard>
    </BeastAdminShell>
  );
}
