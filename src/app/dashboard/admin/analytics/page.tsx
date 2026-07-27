import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminAIAnalyticsWorkspace } from "./BeastAdminAIAnalyticsWorkspace";

export default function BeastAdminAnalyticsPage() {
  return (
    <BeastAdminShell
      title="AI Analytics"
      purpose="Owner-only insight into how members use Beast professionals, based on persisted conversation evidence rather than estimated activity."
    >
      <BeastAdminAIAnalyticsWorkspace />
    </BeastAdminShell>
  );
}
