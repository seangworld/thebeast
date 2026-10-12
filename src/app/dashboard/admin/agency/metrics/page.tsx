import { BeastAdminShell } from "../../BeastAdminShell";
import { AgencyPlanningStatus } from "./AgencyPlanningStatus";
import { AgencyMetricsContent } from "./AgencyMetricsContent";

export default function AgencyMetricsPage() {
  return (
    <BeastAdminShell title="Agency Metrics" purpose="Private character setup and independently verified performance. Missing metrics remain unavailable until reporting is connected.">
      <AgencyMetricsContent />
      <AgencyPlanningStatus />
    </BeastAdminShell>
  );
}
