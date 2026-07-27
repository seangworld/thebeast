import { BeastAdminCEOModeWorkspace } from "./BeastAdminCEOModeWorkspace";
import { BeastAdminShell } from "./BeastAdminShell";

export default function BeastAdminDashboardPage() {
  return (
    <BeastAdminShell
      title="CEO Mode"
      purpose="SEANGWORLD’s owner-only daily operating headquarters for verified changes, current attention, and the next best work across the Beast ecosystem."
    >
      <BeastAdminCEOModeWorkspace />
    </BeastAdminShell>
  );
}
