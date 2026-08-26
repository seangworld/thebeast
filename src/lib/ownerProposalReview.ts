import type { BeastAdminCanonicalReadModel } from "./beastAdminCanonicalProjection";

export const ownerProposalActions = ["approve", "reject", "modify_return", "watch", "investigate_further"] as const;
export type OwnerProposalAction = (typeof ownerProposalActions)[number];
export type CanonicalStrategyProposal = NonNullable<BeastAdminCanonicalReadModel["proposals"]>[number];

const intakeProducts: Record<string, string> = { beastfusion: "fusion", beast: "beastos", beastos: "beastos", beastmoney: "money", beastlearning: "education", beasteducation: "education", beasthealth: "health", beastgoals: "goals", beastdocuments: "documents", beasthome: "home", seangworld: "seangworld" };
export function proposalIntakeProduct(product: string) { return intakeProducts[product] || "future"; }

export function validateOwnerProposalDecision(input: { proposal: CanonicalStrategyProposal | undefined; action: unknown; rationale: unknown; detail: unknown }) {
  if (!input.proposal || input.proposal.status !== "awaiting_owner_review") return { valid: false as const, reason: "Proposal is not available for owner review." };
  if (!ownerProposalActions.includes(input.action as OwnerProposalAction)) return { valid: false as const, reason: "Select a valid owner decision." };
  const rationale = typeof input.rationale === "string" ? input.rationale.trim().slice(0, 4_000) : "";
  const detail = typeof input.detail === "string" ? input.detail.trim().slice(0, 4_000) : "";
  if (rationale.length < 3) return { valid: false as const, reason: "Add a short decision rationale." };
  if (["modify_return", "investigate_further"].includes(input.action as string) && detail.length < 3) return { valid: false as const, reason: input.action === "modify_return" ? "Describe the requested modifications." : "Describe the further investigation requested." };
  return { valid: true as const, decision: { proposalId: input.proposal.id, action: input.action as OwnerProposalAction, rationale, detail, ownerApproved: input.action === "approve", executionAuthorized: false, executable: false, governanceStatus: "pending_beastfusion_reconciliation" as const } };
}
