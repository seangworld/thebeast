"use client";

import { useState } from "react";
import { decideDigitalStaffProposal } from "@/lib/digitalStaffRuntime/client";
import type { ProfessionalId, StructuredKnowledgeProposal } from "@/lib/digitalStaffRuntime";

export function RuntimeProposalReview({ professionalId, conversationId, proposals, onDecision }: { professionalId: ProfessionalId; conversationId: string; proposals: readonly StructuredKnowledgeProposal[]; onDecision?: () => void }) {
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  if (!proposals.length) return null;
  async function decide(proposal: StructuredKnowledgeProposal, decision: "approve" | "reject") {
    setPending(proposal.id); setMessage("");
    try { await decideDigitalStaffProposal({ professionalId, conversationId, proposalId: proposal.id, decision }); setMessage(decision === "approve" ? "Saved to the canonical workspace." : "Proposal rejected."); onDecision?.(); } catch (error) { setMessage(error instanceof Error ? error.message : "The proposal could not be updated."); } finally { setPending(""); }
  }
  return <section className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3" aria-label="Structured information to review"><p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">Review structured information</p><div className="mt-2 grid gap-2">{proposals.filter((proposal) => proposal.approvalStatus === "proposed").map((proposal) => <article key={proposal.id} className="rounded-lg border border-white/10 bg-black/10 p-3"><p className="font-bold text-white">{proposal.entityType}</p><dl className="mt-2 grid gap-1 text-xs text-slate-300">{Object.entries(proposal.fields).map(([key, value]) => <div key={key} className="flex justify-between gap-3"><dt className="text-slate-500">{key}</dt><dd className="text-right">{String(value ?? "Unknown")}</dd></div>)}</dl>{proposal.missingFields.length ? <p className="mt-2 text-xs text-slate-400">Still useful later: {proposal.missingFields.join(", ")}.</p> : null}<div className="mt-3 flex flex-wrap gap-2"><button type="button" className="beast-button" disabled={Boolean(pending)} onClick={() => void decide(proposal, "approve")}>Accept</button><button type="button" className="beast-button-secondary" disabled={Boolean(pending)} onClick={() => void decide(proposal, "reject")}>Reject</button></div></article>)}</div>{message ? <p className="mt-2 text-xs text-cyan-100" role="status">{message}</p> : null}</section>;
}
