"use client";

import { useEffect, useMemo, useState } from "react";

type Catalog = {
  packageId: string;
  environment: string;
  configuredModelPolicy: { turns: Array<{ scenarioId: string; turnId: string; professionalId: string; selectedModel: string }>; selectionSource: string };
  entitlementChecks: Array<{ id: string; professionalId: string; ageBand: string; expectedAllowed: boolean; actualAllowed: boolean; reason: string; passed: boolean }>;
  scenarios: Array<{ id: string; title: string; professionalId: string; ageBand: string; dimensions: string[]; turns: Array<{ id: string; criteria: Array<{ id: string; description: string; category: string }> }> }>;
};

type ScenarioResult = {
  scenarioId: string;
  title: string;
  professionalId: string;
  environment: string;
  syntheticOnly: boolean;
  memberRecordsLoaded: boolean;
  modelOverrideUsed: boolean;
  executionComplete?: boolean;
  results: Array<{ turnId: string; selectedModel: string; returnedModel: string; response: string; intent: string; handoff: { professionalId: string; reason: string } | null; validationFailures: string[]; timings: { totalMs: number } }>;
  handoffExecutions?: Array<{ status: string; expectedTarget: string; receiverInvoked: boolean; response?: string; returnedModel?: string; sourceConversationCopied?: boolean; sourceMemoryCopied?: boolean; sourceRecordsCopied?: boolean; entitlementRechecked?: boolean }>;
  error?: string;
};

const endpoint = "/api/admin/member-ai-production-evaluation";

export default function MemberAIProductionEvaluationPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Loading the governed synthetic catalog…");

  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(String(response.status)); return response.json() as Promise<Catalog>; })
      .then((value) => { if (active) { setCatalog(value); setStatus("Ready. No member records will be loaded."); } })
      .catch(() => active && setStatus("The owner-only evaluation catalog is unavailable."));
    return () => { active = false; };
  }, []);

  const models = useMemo(() => Array.from(new Set(catalog?.configuredModelPolicy.turns.map((item) => item.selectedModel) || [])), [catalog]);

  async function runAll() {
    if (!catalog || running) return;
    setRunning(true); setResults([]);
    const completed: ScenarioResult[] = [];
    try {
      for (let index = 0; index < catalog.scenarios.length; index += 1) {
        const scenario = catalog.scenarios[index];
        setStatus(`Running ${scenario.title} (${index + 1} of ${catalog.scenarios.length})…`);
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: scenario.id }) });
        const payload = await response.json() as ScenarioResult;
        completed.push(response.ok ? payload : { ...payload, scenarioId: scenario.id, title: scenario.title, professionalId: scenario.professionalId, environment: catalog.environment, syntheticOnly: true, memberRecordsLoaded: false, modelOverrideUsed: false, executionComplete: false, results: [] });
        setResults([...completed]);
      }
      const failed = completed.filter((scenario) => scenario.error || scenario.executionComplete === false).length;
      setStatus(failed === 0
        ? `Evaluation complete: ${completed.length} successful controlled multi-turn scenarios, 0 failed.`
        : `Evaluation incomplete: ${completed.length - failed} successful scenarios, ${failed} failed or incomplete.`);
    } catch {
      setStatus(`Evaluation stopped safely after ${completed.length} scenarios.`);
    } finally { setRunning(false); }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 text-white">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Owner-only · BF-AGT-016</p>
        <h1 className="text-3xl font-black">Member AI Production capability evaluation</h1>
        <p className="max-w-3xl text-sm text-slate-300">Runs only approved synthetic multi-turn scenarios through this deployment’s configured model-selection, prompt, safety, context, and handoff architecture. It does not load or write member records and cannot override the configured model.</p>
      </header>
      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
        <p role="status" className="text-sm text-slate-200">{status}</p>
        <p className="mt-3 text-xs text-slate-400">Environment: {catalog?.environment || "—"} · Configured models: {models.join(", ") || "—"}</p>
        <p className="mt-1 text-xs text-slate-400">Entitlement boundary fixtures: {catalog ? `${catalog.entitlementChecks.filter((check) => check.passed).length}/${catalog.entitlementChecks.length} passed` : "—"}</p>
        <button type="button" onClick={runAll} disabled={!catalog || running} className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{running ? "Evaluation running…" : "Run governed Production evaluation"}</button>
      </section>
      <section aria-label="Evaluation results" className="space-y-4">
        {results.map((scenario) => <article key={scenario.scenarioId} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
          <h2 className="font-black">{scenario.title}</h2>
          <p className="mt-1 text-xs text-slate-400">{scenario.professionalId} · synthetic: {String(scenario.syntheticOnly)} · member records loaded: {String(scenario.memberRecordsLoaded)} · model override: {String(scenario.modelOverrideUsed)}</p>
          {scenario.error ? <p className="mt-3 text-sm text-rose-200">{scenario.error}</p> : null}
          <div className="mt-4 space-y-3">{scenario.results.map((turn) => <div key={turn.turnId} className="rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-cyan-200"><strong>{turn.turnId}</strong><span>{turn.returnedModel} · {turn.timings.totalMs} ms</span></div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{turn.response}</p>
            {turn.handoff ? <p className="mt-2 text-xs text-emerald-200">Handoff: {turn.handoff.professionalId} — {turn.handoff.reason}</p> : null}
            {turn.validationFailures.length ? <p className="mt-2 text-xs text-amber-200">Validation: {turn.validationFailures.join(" · ")}</p> : null}
          </div>)}</div>
          {scenario.handoffExecutions?.map((handoff, index) => <div key={`${scenario.scenarioId}-handoff-${index}`} className="mt-3 rounded-xl border border-emerald-400/20 p-4 text-xs text-slate-300">
            <p className="font-bold text-emerald-200">Handoff execution: {handoff.status} · {handoff.expectedTarget}</p>
            <p className="mt-1">Receiver invoked: {String(handoff.receiverInvoked)} · entitlement rechecked: {String(handoff.entitlementRechecked || false)} · source conversation/memory/records copied: {String(Boolean(handoff.sourceConversationCopied || handoff.sourceMemoryCopied || handoff.sourceRecordsCopied))}</p>
            {handoff.response ? <p className="mt-2 whitespace-pre-wrap text-sm">{handoff.response}</p> : null}
          </div>)}
        </article>)}
      </section>
      <pre data-evaluation-evidence className="sr-only" aria-hidden="true">{JSON.stringify({ catalog, results })}</pre>
    </main>
  );
}
