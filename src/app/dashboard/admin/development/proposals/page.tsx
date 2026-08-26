import { BeastAdminShell } from "../../BeastAdminShell";
import { StrategyProposalQueueWorkspace } from "./StrategyProposalQueueWorkspace";

export default function OwnerProposalReviewPage() {
  return <BeastAdminShell title="Strategy Proposals" purpose="Review canonical Orchestrator 3.0 proposals without creating execution authority."><StrategyProposalQueueWorkspace /></BeastAdminShell>;
}
