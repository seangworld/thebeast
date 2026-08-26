import type { BeastAdminCanonicalReadModel } from "./beastAdminCanonicalProjection";

export const ownerProposalActions = ["approve", "reject", "modify_return", "watch", "investigate_further"] as const;
export type OwnerProposalAction = (typeof ownerProposalActions)[number];
export type CanonicalStrategyProposal = NonNullable<BeastAdminCanonicalReadModel["proposals"]>[number];
export const proposalQueueStatuses = ["needs_decision", "investigating", "approved", "watching", "rejected", "completed"] as const;
export type ProposalQueueStatus = (typeof proposalQueueStatuses)[number];

export function proposalQueueStatus(status: string): ProposalQueueStatus {
  if (["further_investigation_requested", "changes_requested"].includes(status)) return "investigating";
  if (status === "approved_pending_reconciliation") return "approved";
  if (status === "watching") return "watching";
  if (status === "rejected") return "rejected";
  if (["reconciled", "completed", "archived"].includes(status)) return "completed";
  return "needs_decision";
}

export function suppressDuplicateCanonicalProposals(proposals: CanonicalStrategyProposal[]) {
  const seen = new Set<string>();
  return proposals.filter((proposal) => {
    const status = proposalQueueStatus(proposal.status);
    if (["rejected", "completed"].includes(status)) return true;
    const key = `${proposal.product.toLowerCase()}:${proposal.conditionKey.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const intakeProducts: Record<string, string> = { beastfusion: "fusion", beast: "beastos", beastos: "beastos", beastmoney: "money", beastlearning: "education", beasteducation: "education", beasthealth: "health", beastgoals: "goals", beastdocuments: "documents", beasthome: "home", seangworld: "seangworld" };
export function proposalIntakeProduct(product: string) { return intakeProducts[product] || "future"; }

export function validateOwnerProposalDecision(input: { proposal: CanonicalStrategyProposal | undefined; action: unknown; rationale: unknown; detail: unknown }) {
  if (!input.proposal || input.proposal.status !== "awaiting_owner_review") return { valid: false as const, reason: "Proposal is not available for owner review." };
  if (!ownerProposalActions.includes(input.action as OwnerProposalAction)) return { valid: false as const, reason: "Select a valid owner decision." };
  const rationale = typeof input.rationale === "string" ? input.rationale.trim().slice(0, 4_000) : "";
  const detail = typeof input.detail === "string" ? input.detail.trim().slice(0, 4_000) : "";
  if (rationale.length < 3) return { valid: false as const, reason: "Add a short decision rationale." };
  if (["modify_return", "investigate_further"].includes(input.action as string) && detail.length < 3) return { valid: false as const, reason: input.action === "modify_return" ? "Describe the requested modifications." : "Describe the further investigation requested." };
  return { valid: true as const, decision: { proposalId: input.proposal.id, action: input.action as OwnerProposalAction, rationale, detail, ownerApproved: input.action === "approve", executionAuthorized: false as const, executable: false as const, governanceStatus: "pending_beastfusion_reconciliation" as const } };
}
