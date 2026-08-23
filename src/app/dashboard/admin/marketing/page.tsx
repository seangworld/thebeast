import { BeastAdminShell } from "../BeastAdminShell";
import { BeastMarketingWorkspace } from "./BeastMarketingWorkspace";

export default function BeastMarketingPage() {
  return (
    <BeastAdminShell
      title="BeastMarketing"
      purpose="Plan, review, approve, and measure evidence-backed marketing without giving the system authority to publish, connect providers, or spend money."
    >
      <BeastMarketingWorkspace />
    </BeastAdminShell>
  );
}
