"use client";

import Link from "next/link";
import { useState } from "react";

export function SearchGrowthCampaignAction({ page, query, days, classification }: {
  page: string; query: string; days: number; classification: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const supported = /^https:\/\/(news|thebeast)\.seangworld\.com\//.test(page)
    && ["Optimize Existing", "Create New", "Distribute"].includes(classification);
  if (!supported) return null;

  async function prepare() {
    setState("saving");
    setError("");
    try {
      const response = await fetch("/api/admin/beast-marketing/search-campaign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, query, days }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The campaign could not be prepared.");
      setState("saved");
    } catch (reason) {
      setState("idle");
      setError(reason instanceof Error ? reason.message : "The campaign could not be prepared.");
    }
  }

  return <div className="mt-3 text-xs">
    {state === "saved" ? <p role="status">Campaign available. <Link className="font-bold text-cyan-200 underline" href="/dashboard/admin/marketing/advertising">Review in BeastMarketing</Link></p>
      : <button type="button" className="beast-button-secondary" disabled={state === "saving"} onClick={() => void prepare()}>{state === "saving" ? "Preparing campaign…" : "Prepare campaign"}</button>}
    <p className="mt-1 text-slate-400">Prepares a draft from refreshed evidence. Publication requires review.</p>
    {error ? <p role="alert" className="mt-2 text-red-200">{error}</p> : null}
  </div>;
}
