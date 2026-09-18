import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";
import { StaffOperationsWorkspace } from "../../admin/development/StaffOperationsWorkspace";
import { StrategyProposalQueueWorkspace } from "../../admin/development/proposals/StrategyProposalQueueWorkspace";

export default function OperationsStaffPage() {
  return <OperationsWorkspaceShell title="Agents & approvals" purpose="Review the shared team’s work and decisions across SEANGWORLD."><StaffOperationsWorkspace /><StrategyProposalQueueWorkspace /></OperationsWorkspaceShell>;
}
