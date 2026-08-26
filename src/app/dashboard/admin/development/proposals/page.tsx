import { BeastAdminShell } from "../../BeastAdminShell";
import { OwnerProposalReviewWorkspace } from "./OwnerProposalReviewWorkspace";

export default function OwnerProposalReviewPage() {
  return <BeastAdminShell title="Strategy Proposals" purpose="Review canonical Orchestrator 3.0 proposals without creating execution authority."><OwnerProposalReviewWorkspace /></BeastAdminShell>;
}
