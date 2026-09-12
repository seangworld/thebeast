"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Brief = { positioning?: string; readerOutcome?: string; chapters?: string[]; evidencePlan?: string[]; acceptanceCriteria?: string[] };
type Publication = { id: string; title: string; audience: string; topic: string; formats: string[]; state: string; opportunity_score: number | null; brief?: Brief; updated_at: string };

const evidenceFields = [
  ["manuscript", "Manuscript complete"], ["interior", "Interior formatted"], ["cover", "Cover complete"],
  ["metadata", "Metadata complete"], ["pricing", "Pricing verified"], ["originalityReview", "Originality reviewed"],
  ["rightsReview", "Rights reviewed"], ["factualReview", "Facts reviewed"], ["aiDisclosurePrepared", "AI disclosure prepared"],
] as const;

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function KdpPublishingFactoryPanel() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/beast-marketing/publishing", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "KDP factory is unavailable.");
    setPublications(body.publications || []);
  }, []);
  useEffect(() => { void load().catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false)); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("Scoring and saving candidate…");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/beast-marketing/publishing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      title: data.get("title"), audience: data.get("audience"), topic: data.get("topic"), formats: data.getAll("formats"),
      opportunity: { buyerIntent: data.get("buyerIntent"), differentiation: data.get("differentiation"), evidenceReadiness: data.get("evidenceReadiness"), seriesPotential: data.get("seriesPotential"), timeToMarketDays: data.get("timeToMarketDays"), estimatedCashCost: data.get("estimatedCashCost") },
    }) });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || "Candidate could not be saved."); return; }
    event.currentTarget.reset(); setMessage(`Candidate saved · ${label(body.recommendation)} priority.`); await load();
  }

  async function advance(id: string, action: string, packageEvidence?: Record<string, boolean>) {
    setMessage("Saving lifecycle change…");
    const response = await fetch("/api/admin/beast-marketing/publishing", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action, packageEvidence }),
    });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || "Lifecycle change could not be saved."); return; }
    setMessage(`${body.publication.title} advanced to ${label(body.publication.state)}.`); await load();
  }

  function validatePackage(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const evidence = Object.fromEntries(evidenceFields.map(([key]) => [key, data.get(key) === "on"]));
    void advance(id, "validate_package", evidence);
  }

  function actions(item: Publication) {
    if (item.state === "scored") return <button onClick={() => void advance(item.id, "prepare_brief")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Prepare brief</button>;
    if (item.state === "brief_ready") return <button onClick={() => void advance(item.id, "approve_brief")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Approve brief</button>;
    if (item.state === "brief_approved") return <button onClick={() => void advance(item.id, "start_drafting")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Start production</button>;
    if (item.state === "drafting") return <button onClick={() => void advance(item.id, "send_to_quality_review")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Send to quality review</button>;
    if (item.state === "quality_review") return <form onSubmit={(event) => validatePackage(event, item.id)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm font-black text-white">Package evidence</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{evidenceFields.map(([key, text]) => <label key={key} className="flex min-h-9 items-center gap-2 text-sm text-slate-300"><input type="checkbox" name={key} />{text}</label>)}</div><button className="mt-3 min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Validate package</button></form>;
    if (item.state === "package_ready") return <button onClick={() => void advance(item.id, "approve_package")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Owner approve package</button>;
    if (item.state === "owner_approved") return <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-3 text-sm text-emerald-100">Package approved. Amazon submission is waiting for your separate owner action.</p>;
    return null;
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Priority 1 revenue factory</p>
      <h2 className="mt-2 text-xl font-black text-white">KDP production queue</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">Preparation is active. Amazon submission, account changes, terms, ISBN decisions, advertising, and publication remain owner-only.</p>
    </section>
    <form onSubmit={create} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-black text-white">Score a publication candidate</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm text-slate-300">Working title<input required name="title" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" /></label>
        <label className="text-sm text-slate-300">Target audience<input required name="audience" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" /></label>
        <label className="text-sm text-slate-300">Topic and promise<input required name="topic" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" /></label>
      </div>
      <fieldset className="mt-4"><legend className="text-sm font-black text-white">Formats</legend><div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">{["ebook","paperback","hardcover"].map((item) => <label key={item}><input defaultChecked={item === "ebook"} type="checkbox" name="formats" value={item} className="mr-2" />{label(item)}</label>)}</div></fieldset>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[["buyerIntent","Buyer intent",70],["differentiation","Differentiation",70],["evidenceReadiness","Evidence ready",70],["seriesPotential","Series potential",70],["timeToMarketDays","Days to market",14],["estimatedCashCost","Cash cost ($)",0]].map(([name,text,value]) => <label key={String(name)} className="text-xs text-slate-300">{text}<input required type="number" min="0" max={name === "timeToMarketDays" || name === "estimatedCashCost" ? undefined : 100} defaultValue={value} name={String(name)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" /></label>)}
      </div>
      <button className="mt-4 min-h-11 rounded-xl bg-amber-300 px-5 py-2 font-black text-slate-950">Score and add to queue</button>
      {message ? <p role="status" className="mt-3 text-sm text-amber-100">{message}</p> : null}
    </form>
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-black text-white">Current candidates</h2>
      {loading ? <p role="status" className="mt-3 text-sm text-slate-300">Loading factory queue…</p> : null}
      {!loading && !publications.length ? <p className="mt-3 text-sm text-slate-400">No publication candidates yet. Add the first candidate above.</p> : null}
      <div className="mt-4 space-y-3">{publications.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-white">{item.title}</h3><p className="mt-1 text-sm text-slate-300">{item.topic}</p></div><span className="rounded-full border border-amber-300/20 px-3 py-1 text-xs font-black text-amber-100">Score {item.opportunity_score ?? "Unavailable"}</span></div><p className="mt-3 text-sm text-slate-400">{label(item.state)} · {item.formats.map(label).join(" · ")} · {item.audience}</p>{item.brief?.chapters?.length ? <details className="mt-4 rounded-xl border border-white/10 p-4" open={item.state === "brief_ready"}><summary className="cursor-pointer text-sm font-black text-white">Publication brief</summary><p className="mt-3 text-sm text-slate-300">{item.brief.positioning}</p><p className="mt-2 text-sm text-slate-300">{item.brief.readerOutcome}</p><ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-300">{item.brief.chapters.map((chapter) => <li key={chapter}>{chapter}</li>)}</ol></details> : null}<div className="mt-4">{actions(item)}</div></article>)}</div>
    </section>
  </div>;
}
