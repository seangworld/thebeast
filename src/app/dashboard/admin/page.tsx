import { BeastAdminCEOModeWorkspace } from "./BeastAdminCEOModeWorkspace";
import { BeastAdminShell } from "./BeastAdminShell";
import { StaffOperationsWorkspace } from "./development/StaffOperationsWorkspace";

export default function BeastAdminDashboardPage() {
  return (
    <BeastAdminShell
      title="CEO Mode"
      purpose="SEANGWORLD’s owner-only daily operating headquarters for verified changes, current attention, and the next best work across the Beast ecosystem."
    >
      <StaffOperationsWorkspace compact />
      <BeastAdminCEOModeWorkspace />
    </BeastAdminShell>
  );
}
