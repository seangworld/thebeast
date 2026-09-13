import { BeastAdminShell } from "../../admin/BeastAdminShell";
import { StaffOperationsWorkspace } from "../../admin/development/StaffOperationsWorkspace";
import { StrategyProposalQueueWorkspace } from "../../admin/development/proposals/StrategyProposalQueueWorkspace";

export default function OperationsStaffPage() {
  return <BeastAdminShell title="Agents & approvals" purpose="Review the shared team’s work and decisions across SEANGWORLD."><StaffOperationsWorkspace /><StrategyProposalQueueWorkspace /></BeastAdminShell>;
}
