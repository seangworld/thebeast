"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Brief = { positioning?: string; readerOutcome?: string; chapters?: string[]; evidencePlan?: string[]; acceptanceCriteria?: string[] };
type Publication = { id: string; title: string; audience: string; topic: string; formats: string[]; state: string; opportunity_score: number | null; brief?: Brief; package_evidence?: Record<string, boolean>; updated_at: string };
type Chapter = { id: string; chapter_number: number; title: string; status: string; draft_text: string; word_count: number; source_notes: Array<{ title: string; url: string; claim: string }> };

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
  const [chapters, setChapters] = useState<Record<string, Chapter[]>>({});
  const [generatingPublicationId, setGeneratingPublicationId] = useState<string | null>(null);
  const [packagingPublicationId, setPackagingPublicationId] = useState<string | null>(null);
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

  async function loadChapters(publicationId: string) {
    const response = await fetch(`/api/admin/beast-marketing/publishing/manuscript?publicationId=${encodeURIComponent(publicationId)}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || "Manuscript could not be loaded."); return; }
    setChapters((current) => ({ ...current, [publicationId]: body.chapters || [] }));
  }

  async function manuscriptAction(publicationId: string, action: "initialize" | "generate_next") {
    setMessage(action === "initialize" ? "Creating chapter plan…" : "Generating the next sourced chapter draft…");
    const response = await fetch("/api/admin/beast-marketing/publishing/manuscript", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicationId, action }) });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || "Manuscript action could not be completed."); return; }
    setMessage(action === "initialize" ? `Chapter plan created · ${body.chapterCount} chapters.` : `Chapter ${body.chapter.chapter_number} is ready for review.`);
    await Promise.all([load(), loadChapters(publicationId)]);
  }

  async function generateAllRemaining(publicationId: string) {
    if (generatingPublicationId) return;
    setGeneratingPublicationId(publicationId);
    let generated = 0;
    try {
      while (true) {
        setMessage(generated ? `Generating chapter drafts… ${generated} complete.` : "Generating all remaining sourced chapter drafts…");
        const response = await fetch("/api/admin/beast-marketing/publishing/manuscript", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicationId, action: "generate_next" }) });
        const body = await response.json();
        if (!response.ok) { setMessage(body.error || `Generation stopped after ${generated} chapters.`); return; }
        generated += 1;
        setMessage(`Chapter ${body.chapter.chapter_number} drafted · ${body.remainingCount} remaining.`);
        if (body.remainingCount === 0) break;
      }
      setMessage(`${generated} chapter${generated === 1 ? "" : "s"} generated · ready for individual review.`);
    } catch {
      setMessage(`Generation stopped safely after ${generated} chapter${generated === 1 ? "" : "s"}. Completed drafts were preserved.`);
    } finally {
      setGeneratingPublicationId(null);
      await Promise.all([load(), loadChapters(publicationId)]);
    }
  }

  async function approveChapter(publicationId: string, chapterId: string) {
    setMessage("Saving chapter approval…");
    const response = await fetch("/api/admin/beast-marketing/publishing/manuscript", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ chapterId, action: "approve" }) });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || "Chapter approval could not be saved."); return; }
    setMessage(body.manuscriptComplete ? "All chapters approved · manuscript advanced to quality review." : "Chapter approved.");
    await Promise.all([load(), loadChapters(publicationId)]);
  }

  async function downloadInteriorPackage(publicationId: string) {
    if (packagingPublicationId) return;
    setPackagingPublicationId(publicationId); setMessage("Building and validating the selected KDP interiors…");
    try {
      const response = await fetch("/api/admin/beast-marketing/publishing/package", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicationId }) });
      if (!response.ok) { const body = await response.json(); setMessage(body.error || "KDP package construction failed."); return; }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || "kdp-owner-review-package.zip";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setMessage("KDP interiors built and validated · owner review package downloaded.");
      await load();
    } catch {
      setMessage("KDP package download stopped safely. No readiness approval was granted.");
    } finally {
      setPackagingPublicationId(null);
    }
  }

  function manuscript(item: Publication) {
    const rows = chapters[item.id];
    const generating = generatingPublicationId === item.id;
    return <div className="space-y-3"><div className="flex flex-wrap gap-2"><button disabled={Boolean(generatingPublicationId)} onClick={() => void generateAllRemaining(item.id)} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 disabled:cursor-wait disabled:opacity-60">{generating ? "Generating all chapters…" : "Generate all remaining chapters"}</button><button disabled={Boolean(generatingPublicationId)} onClick={() => void manuscriptAction(item.id, "generate_next")} className="min-h-11 rounded-xl border border-amber-300/30 px-4 py-2 text-sm font-black text-amber-100 disabled:cursor-wait disabled:opacity-60">Generate one chapter</button><button disabled={generating} onClick={() => void loadChapters(item.id)} className="min-h-11 rounded-xl border border-white/15 px-4 py-2 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60">{rows ? "Refresh chapters" : "View chapters"}</button></div><p className="text-xs leading-5 text-slate-400">Bulk generation drafts every remaining chapter in order. Each chapter still requires your approval before the manuscript can advance.</p>{rows ? <div className="space-y-2">{rows.map((chapter) => <details key={chapter.id} className="rounded-xl border border-white/10 p-3" open={chapter.status === "review_ready"}><summary className="cursor-pointer text-sm font-black text-white">Chapter {chapter.chapter_number}: {chapter.title} · {label(chapter.status)} · {chapter.word_count} words</summary>{chapter.draft_text ? <div className="mt-3 space-y-3"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{chapter.draft_text}</p><div>{chapter.source_notes.map((source) => <p key={source.url} className="text-sm text-slate-400"><a className="text-amber-200 underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> — {source.claim}</p>)}</div>{chapter.status === "review_ready" ? <button onClick={() => void approveChapter(item.id, chapter.id)} className="min-h-11 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950">Approve chapter</button> : null}</div> : null}</details>)}</div> : null}</div>;
  }

  function actions(item: Publication) {
    if (item.state === "scored") return <button onClick={() => void advance(item.id, "prepare_brief")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Prepare brief</button>;
    if (item.state === "brief_ready") return <button onClick={() => void advance(item.id, "approve_brief")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Approve brief</button>;
    if (item.state === "brief_approved") return <button onClick={() => void manuscriptAction(item.id, "initialize")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Create chapter plan</button>;
    if (item.state === "drafting") return manuscript(item);
    if (item.state === "quality_review") return <div className="space-y-3"><div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4"><p className="text-sm font-black text-white">Interior files</p><p className="mt-1 text-xs leading-5 text-slate-400">Builds EPUB for Kindle and 6 × 9-inch no-bleed DOCX/PDF interiors for selected print formats. The ZIP also contains the manifest and source notes.</p><button disabled={Boolean(packagingPublicationId)} onClick={() => void downloadInteriorPackage(item.id)} className="mt-3 min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 disabled:cursor-wait disabled:opacity-60">{packagingPublicationId === item.id ? "Building package…" : "Build and download interiors"}</button></div><form onSubmit={(event) => validatePackage(event, item.id)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm font-black text-white">Package evidence</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{evidenceFields.map(([key, text]) => <label key={`${item.updated_at}-${key}`} className="flex min-h-9 items-center gap-2 text-sm text-slate-300"><input type="checkbox" name={key} defaultChecked={Boolean(item.package_evidence?.[key])} />{text}</label>)}</div><button className="mt-3 min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Validate package</button></form></div>;
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
