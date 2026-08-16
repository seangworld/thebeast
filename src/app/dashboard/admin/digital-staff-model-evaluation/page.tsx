"use client";

import { useEffect, useMemo, useState } from "react";

type EvaluationCase = {
  id: string;
  professionalId: string;
  tier: "ordinary" | "strong";
  category: string;
  expectations: string[];
};

type Availability = {
  models: Array<{ model: string; available: boolean }>;
  cases: EvaluationCase[];
};

type EvaluationResult = {
  caseId: string;
  professionalId: string;
  requestedTier: "ordinary" | "strong";
  category: string;
  model: string;
  response: string;
  intent: string;
  nextQuestion: string | null;
  proposalCount: number;
  toolCallCount: number;
  researchSourceCount: number;
  validationFailures: string[];
  timings: Record<string, number | null>;
  expectations: string[];
};

const endpoint = "/api/admin/digital-staff-model-evaluation";

export default function DigitalStaffModelEvaluationPage() {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [status, setStatus] = useState("Loading the protected evaluation catalog…");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Availability returned ${response.status}.`);
        return response.json() as Promise<Availability>;
      })
      .then((payload) => {
        if (!active) return;
        setAvailability(payload);
        setStatus("Ready to run the synthetic Preview benchmark.");
      })
      .catch(() => active && setStatus("The protected evaluation catalog is unavailable."));
    return () => { active = false; };
  }, []);

  const benchmarkModels = useMemo(
    () => availability?.models.filter((item) => item.available && ["gpt-5", "gpt-5.4-mini", "gpt-5.6-luna"].includes(item.model)).map((item) => item.model) || [],
    [availability]
  );

  async function runBenchmark() {
    if (!availability || running) return;
    setRunning(true);
    setResults([]);
    const completed: EvaluationResult[] = [];
    try {
      const ordinaryCases = availability.cases.filter((item) => item.tier === "ordinary");
      const strongSafetyCases = availability.cases.filter((item) => ["money-multi-debt", "guidance-research", "health-significant-symptoms", "health-medication-interaction"].includes(item.id));
      const cases = [...ordinaryCases, ...strongSafetyCases];
      for (const model of benchmarkModels) {
        for (const evaluationCase of cases) {
          setStatus(`Running ${model} — ${evaluationCase.id} (${completed.length + 1} of ${benchmarkModels.length * cases.length})…`);
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, caseId: evaluationCase.id }),
          });
          if (!response.ok) throw new Error(`Evaluation returned ${response.status}.`);
          completed.push(await response.json() as EvaluationResult);
          setResults([...completed]);
        }
      }
      setStatus(`Benchmark complete: ${completed.length} synthetic turns.`);
    } catch {
      setStatus(`Benchmark stopped safely after ${completed.length} completed synthetic turns.`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 text-white">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Preview-only owner tool</p>
        <h1 className="text-3xl font-black">Digital Staff model evaluation</h1>
        <p className="max-w-3xl text-sm text-slate-300">Runs synthetic Money, Guidance, and Health cases through the server-side provider configuration. This page is disabled in Production and does not load member records.</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
        <p role="status" className="text-sm text-slate-200">{status}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {availability?.models.map((item) => (
            <span key={item.model} className={`rounded-full px-3 py-1 text-xs font-bold ${item.available ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"}`}>
              {item.model}: {item.available ? "available" : "unavailable"}
            </span>
          ))}
        </div>
        <button type="button" onClick={runBenchmark} disabled={running || benchmarkModels.length < 2} className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
          {running ? "Benchmark running…" : "Run approved synthetic benchmark"}
        </button>
      </section>

      <section aria-label="Evaluation results" className="space-y-3">
        {results.map((result, index) => (
          <article key={`${result.model}-${result.caseId}-${index}`} data-evaluation-result className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-black">{result.model} — {result.caseId}</h2>
              <span className="text-xs text-cyan-200">{result.timings.totalMs ?? "—"} ms total · {result.timings.initialModelMs ?? "—"} ms provider</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{result.response}</p>
            <dl className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-4">
              <div><dt className="font-bold text-white">Tier</dt><dd>{result.requestedTier}</dd></div>
              <div><dt className="font-bold text-white">Intent</dt><dd>{result.intent}</dd></div>
              <div><dt className="font-bold text-white">Tools</dt><dd>{result.toolCallCount}</dd></div>
              <div><dt className="font-bold text-white">Research sources</dt><dd>{result.researchSourceCount}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-slate-400">Expectations: {result.expectations.join(" · ")}</p>
            {result.validationFailures.length > 0 ? <p className="mt-2 text-xs text-amber-200">Validation: {result.validationFailures.join(" · ")}</p> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
