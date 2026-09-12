"use client";

import { useEffect, useState } from "react";
import type { Ga4ConnectionCheck } from "@/lib/ga4ConnectionCheck";

export function Ga4ConnectionPanel() {
  const [result, setResult] = useState<Ga4ConnectionCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!attempt) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setResult(null);
    void fetch("/api/admin/seangworld-intelligence?check=streams", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("The connection check is unavailable. Confirm you are signed into BeastAdmin and retry.");
        const body = await response.json();
        if (!["matched", "mismatch", "unavailable"].includes(body.status) || !Array.isArray(body.streams) || typeof body.message !== "string") throw new Error("The connection check returned an invalid result.");
        if (!controller.signal.aborted) setResult(body);
      })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "The check could not be completed."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  return <section className="rounded-2xl border border-cyan-300/20 bg-[#111827] p-5" aria-labelledby="ga4-connection-heading">
    <h2 id="ga4-connection-heading" className="text-xl font-black text-white">Analytics connection check</h2>
    <p className="mt-2 text-sm leading-6 text-slate-300">Verify that Beast and SEANGWORLD/News send to streams in the property used by these reports. This read-only check uses the existing Google connection.</p>
    <button className="beast-button-secondary mt-4" disabled={loading} onClick={() => setAttempt((value) => value + 1)}>{loading ? "Checking Google…" : "Check analytics connection"}</button>
    <div role="status" aria-live="polite" aria-busy={loading}>
      {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
      {result ? <div className="mt-4 space-y-3">
        <p className="font-bold text-white">{result.status === "matched" ? "Property mapping confirmed" : result.status === "mismatch" ? "Property mismatch found" : "Check unavailable"}</p>
        <p className="text-sm leading-6 text-slate-300">{result.message}</p>
        <ul className="space-y-2 text-sm text-slate-200">{result.streams.map((stream) => <li key={stream.label}>{stream.label}: <span className="font-mono">{stream.measurementId}</span> — {stream.status === "found" ? "Found in reporting property" : stream.status === "missing" ? "Missing from reporting property" : "Unverified"}</li>)}</ul>
        <p className="text-xs text-slate-400">Checked {new Date(result.checkedAt).toLocaleString()}. SEANGWORLD and News share one measurement ID; their page views are separated by hostname in daily reports.</p>
      </div> : null}
    </div>
  </section>;
}
