import { createHash } from "node:crypto";

export type PersistedOwnerDecision = {
  proposalId: string;
  action: string;
  rationale: string;
  detail: string;
  requestedAt: string;
  ownerApproved: boolean;
  executionAuthorized: false;
  executable: false;
  governanceStatus: "pending_beastfusion_reconciliation";
};

export function proposalDecisionSourceId(proposalId: string) {
  const hex = createHash("sha256").update(`orchestrator-3-proposal:${proposalId}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

export function appendDecisionHistory(current: unknown, decision: PersistedOwnerDecision) {
  const payload = current && typeof current === "object" && !Array.isArray(current) ? current as Record<string, unknown> : {};
  const history = Array.isArray(payload.decisionHistory) ? payload.decisionHistory : [];
  return { ...payload, proposalId: decision.proposalId, latestDecision: decision, decisionHistory: [...history, decision] };
}
