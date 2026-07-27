import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminExecutiveMetricsWorkspace } from "./BeastAdminExecutiveMetricsWorkspace";

export default function BeastAdminExecutiveMetricsPage() {
  return (
    <BeastAdminShell
      title="Executive Metrics"
      purpose="Owner-only growth, engagement, adoption, professional, and feature metrics derived from meaningful persisted Beast activity."
    >
      <BeastAdminExecutiveMetricsWorkspace />
    </BeastAdminShell>
  );
}
