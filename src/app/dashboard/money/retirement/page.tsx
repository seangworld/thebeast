"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BeastMoneyShell } from "../BeastMoneyShell";

type Assumption = { label: string; value: string; source: string; confidence: string; reviewed: string; limitation: string };
const initial: Assumption[] = [
  { label: "Target retirement age", value: "", source: "User Entered", confidence: "Unknown", reviewed: "Not reviewed", limitation: "Required for an informational scenario." },
  { label: "Inflation assumption", value: "", source: "Default Assumption", confidence: "Low", reviewed: "Not reviewed", limitation: "Review and replace with your own planning assumption." },
  { label: "Social Security estimate", value: "", source: "Official", confidence: "Unknown", reviewed: "Not reviewed", limitation: "Enter only a current official estimate; BeastMoney does not infer benefits." },
];

export default function RetirementAssumptionsPage() {
  const [assumptions, setAssumptions] = useState(initial);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading saved retirement assumptions…");
  useEffect(() => { const load = async () => { try { const supabase = createClient(); const { data: user } = await supabase.auth.getUser(); if (!user.user) { setStatus("Sign in to save retirement assumptions."); return; } const { data } = await supabase.from("retirement_scenarios").select("id, assumptions").eq("owner_id", user.user.id).limit(1).maybeSingle(); if (data) { setScenarioId(data.id); setAssumptions((data.assumptions as Assumption[]) || initial); setStatus("Loaded your saved assumptions."); } else setStatus("Review assumptions, then save your first scenario."); } catch { setStatus("Retirement assumptions could not be loaded. Check your connection and try again."); } }; void load(); }, []);
  const save = async () => { try { const supabase = createClient(); const { data: user } = await supabase.auth.getUser(); if (!user.user) throw new Error("Sign in required"); const payload = { owner_id: user.user.id, name: "Retirement plan", assumptions }; const query = scenarioId ? supabase.from("retirement_scenarios").update({ assumptions }).eq("id", scenarioId).eq("owner_id", user.user.id) : supabase.from("retirement_scenarios").insert(payload).select("id").single(); const { data, error } = await query; if (error) throw error; if (data && "id" in data) setScenarioId(data.id); setStatus("Saved. Projections remain informational and non-guaranteed."); } catch { setStatus("Save failed. No assumptions were changed."); } };
  return <BeastMoneyShell title="Retirement Assumptions" description="Review the inputs behind an informational retirement scenario.">
    <div className="space-y-5">
      <div className="beast-panel p-5 text-sm text-[#dbe3ef]"><strong>Informational only.</strong> Projections are not guarantees. BeastMoney does not tell you when to retire, claim benefits, withdraw funds, or change investments.</div>
      {assumptions.map((item, index) => <div key={item.label} className="beast-panel grid gap-3 p-5 md:grid-cols-2">
        <label className="grid gap-1"><span>{item.label}</span><input className="beast-input" value={item.value} onChange={(event) => setAssumptions(assumptions.map((entry, i) => i === index ? { ...entry, value: event.target.value } : entry))} placeholder="Enter a reviewed value" /></label>
        <div className="text-sm"><p><strong>Source:</strong> {item.source}</p><p><strong>Confidence:</strong> {item.confidence}</p><p><strong>Last reviewed:</strong> {item.reviewed}</p><p className="mt-2 text-[#aeb9c9]">{item.limitation}</p></div>
      </div>)}
      <button className="beast-button" onClick={save}>Save reviewed assumptions</button><p className="text-sm text-[#aeb9c9]">{status}</p>
      <div className="beast-panel p-5 text-sm text-[#aeb9c9]">Missing information lowers confidence. Official, imported, BeastMoney-estimated, and default values must remain distinct before any projection can be reviewed.</div>
    </div>
  </BeastMoneyShell>;
}
