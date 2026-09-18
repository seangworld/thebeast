import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminAIAnalyticsWorkspace } from "./BeastAdminAIAnalyticsWorkspace";

export default function BeastAdminAnalyticsPage() {
  return (
    <BeastAdminShell
      title="Capacity & AI Analytics"
      purpose="Review private aggregate Digital Professional usage, responsiveness, and capacity without loading raw conversation content."
    >
      <BeastAdminAIAnalyticsWorkspace />
    </BeastAdminShell>
  );
}
