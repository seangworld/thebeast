"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadHistoricalReconciliation, updateHistoricalReconciliation, type HistoricalReconciliationProfessional } from "@/lib/digitalStaffRuntime/client";
import type { HistoricalKnowledgeProposal, ProfessionalId } from "@/lib/digitalStaffRuntime";

const labels: Record<ProfessionalId, string> = {
  "beastfusion.fusion-director": "Avery Stone",
  "beastmoney.money-coach": "Money Coach",
  "beasteducation.guidance-counselor": "Guidance Counselor",
  "beasteducation.tutor": "Riley Chen",
  "beasthealth.health-advisor": "Health Advisor",
};

function displayKey(value: string) { return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "); }

function ProposalCard({ professionalId, proposal, busy, onDecision }: { professionalId: ProfessionalId; proposal: HistoricalKnowledgeProposal; busy: boolean; onDecision: (decision: "approve" | "reject" | "merge", proposal: HistoricalKnowledgeProposal, fields: Record<string, string | number | boolean | null>) => Promise<void> }) {
  const [fields, setFields] = useState(proposal.fields);
  const changed = JSON.stringify(fields) !== JSON.stringify(proposal.fields);
  return (
    <article className="rounded-xl border border-white/10 bg-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-black capitalize text-white">{displayKey(proposal.entityType)}</p><p className="mt-1 text-xs text-slate-400">{proposal.reconciliation.currentStatus.replaceAll("_", " ")} · {Math.round(proposal.confidence * 100)}% confidence</p></div>
        <span className={`rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-wide ${proposal.reconciliation.disposition === "conflict" ? "bg-amber-300/15 text-amber-100" : proposal.reconciliation.disposition === "merge" ? "bg-violet-300/15 text-violet-100" : "bg-cyan-300/15 text-cyan-100"}`}>{proposal.reconciliation.disposition}</span>
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {Object.entries(fields).map(([key, value]) => <div key={key}><dt className="text-xs font-bold capitalize text-slate-500">{displayKey(key)}</dt><dd className="mt-1"><input aria-label={`${displayKey(key)} for ${proposal.entityType}`} className="beast-input w-full" value={String(value ?? "")} onChange={(event) => setFields((current) => ({ ...current, [key]: typeof proposal.fields[key] === "number" ? Number(event.target.value) : typeof proposal.fields[key] === "boolean" ? event.target.value === "true" : event.target.value }))} /></dd></div>)}
      </dl>
      {proposal.missingFields.length ? <p className="mt-3 text-xs text-slate-400">Still unknown: {proposal.missingFields.join(", ")}.</p> : null}
      {proposal.contradictions.length ? <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100"><p className="font-black">Needs your resolution</p>{proposal.contradictions.map((item) => <p key={item}>{item}</p>)}</div> : null}
      <p className="mt-3 text-xs text-slate-500">Historical {labels[professionalId]} conversation · {new Date(proposal.reconciliation.provenance.originalTimestamp).toLocaleDateString()} · original message preserved</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {proposal.reconciliation.disposition === "create" ? <button type="button" className="beast-button" disabled={busy} onClick={() => void onDecision("approve", proposal, fields)}>{changed ? "Accept edited" : "Accept"}</button> : <button type="button" className="beast-button" disabled={busy} onClick={() => void onDecision("merge", proposal, fields)}>{changed ? "Merge edited" : "Merge"}</button>}
        <button type="button" className="beast-button-secondary" disabled={busy} onClick={() => void onDecision("reject", proposal, fields)}>Reject</button>
      </div>
    </article>
  );
}

export function HistoricalKnowledgeReconciliation({ professionalId, returnTo }: { professionalId?: string; returnTo?: string }) {
  const router = useRouter();
  const [professionals, setProfessionals] = useState<HistoricalReconciliationProfessional[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void loadHistoricalReconciliation().then(async (items) => {
      const scoped = professionalId ? items.filter((item) => item.professionalId === professionalId) : items;
      if (active) setProfessionals(scoped);
      const target = professionalId ? scoped.find((item) => item.professionalId === professionalId) : undefined;
      if (target && !target.state) {
        const started = await updateHistoricalReconciliation({ professionalId: target.professionalId, action: "start" });
        if (active) setProfessionals(started.filter((item) => item.professionalId === target.professionalId));
        const processed = await updateHistoricalReconciliation({ professionalId: target.professionalId, action: "process" });
        if (active) setProfessionals(processed.filter((item) => item.professionalId === target.professionalId));
      }
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Historical reconciliation is unavailable."); });
    return () => { active = false; };
  }, [professionalId]);
  const pendingCount = useMemo(() => professionals.reduce((total, item) => total + item.proposals.filter((proposal) => proposal.approvalStatus === "proposed").length, 0), [professionals]);

  async function act(professionalId: ProfessionalId, action: "start" | "process" | "pause" | "skip" | "decide", extra: Record<string, unknown> = {}) {
    setBusy(`${professionalId}:${action}`); setError("");
    try {
      const next = await updateHistoricalReconciliation({ professionalId, action, ...extra } as Parameters<typeof updateHistoricalReconciliation>[0]);
      const scoped = professionalId ? next.filter((item) => item.professionalId === professionalId) : next;
      setProfessionals(scoped);
      if (action === "decide" && returnTo && scoped.every((item) => !item.proposals.some((proposal) => proposal.approvalStatus === "proposed"))) router.push(returnTo);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The reconciliation control failed safely."); }
    finally { setBusy(""); }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5">
        <p className="text-sm leading-6 text-cyan-50">I found information from your earlier conversations that isn&apos;t fully organized yet. I&apos;ve organized what I found below so you can review it.</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">Historical conversation remains unchanged evidence. Nothing becomes an authoritative Beast record until you Accept or Merge it. You can skip this and continue using every Digital Professional normally.</p>
        <p className="mt-3 text-sm font-bold text-white">{pendingCount} finding{pendingCount === 1 ? "" : "s"} awaiting review</p>
      </section>
      {error ? <p className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-4 text-sm text-rose-100" role="alert">{error}</p> : null}
      {professionals.map((item) => {
        const state = item.state;
        const pending = item.proposals.filter((proposal) => proposal.approvalStatus === "proposed");
        const grouped = Object.entries(Object.groupBy(pending, (proposal) => proposal.domain));
        const eligibleBulk = pending.filter((proposal) => proposal.reconciliation.disposition === "create" && proposal.confidence >= 0.9 && !proposal.missingFields.length && !proposal.contradictions.length).length;
        return <section key={item.professionalId} className="rounded-2xl border border-white/10 bg-[#111827] p-5" aria-labelledby={`${item.professionalId}-heading`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id={`${item.professionalId}-heading`} className="text-xl font-black text-white">{labels[item.professionalId]}</h2><p className="mt-1 text-sm capitalize text-slate-400">{state?.status || "not started"}</p></div><div className="flex flex-wrap gap-2">
            {!state ? <button type="button" className="beast-button" disabled={Boolean(busy)} onClick={() => void act(item.professionalId, "start")}>Review information from earlier conversations</button> : null}
            {state && ["running", "paused", "failed", "skipped"].includes(state.status) ? <button type="button" className="beast-button" disabled={Boolean(busy)} onClick={() => void act(item.professionalId, "process")}>{state.status === "running" ? "Process next batch" : "Resume"}</button> : null}
            {state?.status === "running" ? <button type="button" className="beast-button-secondary" disabled={Boolean(busy)} onClick={() => void act(item.professionalId, "pause")}>Pause</button> : null}
            {state && state.status !== "completed" ? <button type="button" className="beast-button-secondary" disabled={Boolean(busy)} onClick={() => void act(item.professionalId, "skip")}>Skip for now</button> : null}
          </div></div>
          {state ? <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">{[["Conversations", state.metrics.conversationsScanned], ["Messages", state.metrics.messagesScanned], ["Findings", state.metrics.proposalsGenerated], ["Duplicates ignored", state.metrics.duplicatesIgnored], ["Conflicts", state.metrics.conflictsDetected], ["Failures", state.metrics.failures]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-white/10 p-3"><dt className="text-slate-500">{label}</dt><dd className="mt-1 text-lg font-black text-white">{value}</dd></div>)}</dl> : null}
          {eligibleBulk > 0 ? <button type="button" className="beast-button-secondary mt-4" disabled={Boolean(busy)} onClick={() => void act(item.professionalId, "decide", { decision: "bulk_approve" })}>Accept {eligibleBulk} high-confidence findings</button> : null}
          <div className="mt-5 grid gap-5">{grouped.map(([domain, proposals]) => <section key={domain}><h3 className="text-sm font-black uppercase tracking-[0.12em] text-cyan-200">{displayKey(domain)}</h3><div className="mt-3 grid gap-3 lg:grid-cols-2">{proposals?.map((proposal) => <ProposalCard key={proposal.id} professionalId={item.professionalId} proposal={proposal} busy={Boolean(busy)} onDecision={async (decision, selected, fields) => { const editedFields = JSON.stringify(fields) === JSON.stringify(selected.fields) ? undefined : fields; await act(item.professionalId, "decide", { proposalId: selected.id, decision, editedFields }); }} />)}</div></section>)}</div>
          {state?.status === "completed" && !pending.length ? <p className="mt-4 text-sm text-emerald-200">Reconciliation is complete and there are no remaining findings to review.</p> : null}
        </section>;
      })}
    </div>
  );
}
