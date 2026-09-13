"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { normalizeOwnerProviderAction, type OwnerProviderAction } from "@/lib/ownerProviderActions";

type Brief = { positioning?: string; readerOutcome?: string; chapters?: string[]; evidencePlan?: string[]; acceptanceCriteria?: string[] };
type Publication = { id: string; title: string; audience: string; topic: string; formats: string[]; state: string; opportunity_score: number | null; brief?: Brief; package_evidence?: Record<string, boolean>; updated_at: string };
type Chapter = { id: string; chapter_number: number; title: string; status: string; draft_text: string; word_count: number; source_notes: Array<{ title: string; url: string; claim: string }> };
type GenerationProgress = { state: "working" | "error" | "success"; text: string; completed: number; total: number; ownerAction?: OwnerProviderAction | null };
type PublishingOpportunity = {
  id: string;
  title: string;
  summary: string;
  huntType: string;
  market: string;
  audience: "general_consumer" | "small_business" | "professional";
  startupCost: number | null;
  buildDays: number | null;
  competition: number | null;
  expectedMonthlyRevenueLow: number | null;
  expectedMonthlyRevenueHigh: number | null;
  score: number;
  recommendation: "BUILD" | "WATCH" | "REJECT";
  recommendationReason: string;
  scores: {
    commercialIntent: number;
    competitionGap: number;
    confidence: number;
    verifiability?: number;
    durability: number;
  };
  explanation: {
    customer: string;
    whatToBuild: string;
    whyNow: string;
    monetization: string;
  };
  evidence: Array<{ label: string; url: string; observedAt: string }>;
};

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
  const [huntObjective, setHuntObjective] = useState("Find current evidence-backed, low-liability nonfiction KDP book opportunities for a broad U.S. audience that AI can substantially produce and an owner can independently verify.");
  const [huntResults, setHuntResults] = useState<PublishingOpportunity[]>([]);
  const [hunting, setHunting] = useState(false);
  const [addingOpportunityId, setAddingOpportunityId] = useState<string | null>(null);
  const [opportunityFormats, setOpportunityFormats] = useState<Record<string, string[]>>({});
  const [creating, setCreating] = useState(false);
  const createInFlight = useRef(false);
  const [huntOwnerAction, setHuntOwnerAction] = useState<OwnerProviderAction | null>(null);
  const [generationProgress, setGenerationProgress] = useState<Record<string, GenerationProgress>>({});
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/beast-marketing/publishing", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "KDP factory is unavailable.");
    setPublications(body.publications || []);
  }, []);
  useEffect(() => { void load().catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false)); }, [load]);

  function selectedFormats(id: string) {
    return opportunityFormats[id] || ["ebook"];
  }

  function toggleOpportunityFormat(id: string, format: string) {
    setOpportunityFormats((current) => {
      const selected = current[id] || ["ebook"];
      const next = selected.includes(format) ? selected.filter((item) => item !== format) : [...selected, format];
      return { ...current, [id]: next.length ? next : ["ebook"] };
    });
  }

  async function runPublishingHunt() {
    if (hunting) return;
    setHunting(true); setMessage("BeastHunter is researching current KDP opportunities and evidence…"); setHuntResults([]); setHuntOwnerAction(null);
    const criteria = {
      query: huntObjective,
      huntTypes: ["PDF / Book"],
      markets: [],
      freshnessDays: 30,
      interaction: "none",
      maximumStartupCost: 250,
      maximumBuildDays: 14,
      revenueModels: ["One-time sale"],
      monthlyRevenueTarget: null,
      automation: "mostly_automated",
      audience: "general_consumer",
      specializedDomains: "penalize",
      minimumOwnerFit: 70,
      minimumVerifiability: 70,
      maximumLiabilityRisk: 35,
      maximumCompetition: 75,
      geography: "United States",
      minimumActionWindowDays: 30,
      strictness: "flexible",
      resultCount: 10,
    };
    try {
      let response = await fetch("/api/admin/beast-hunter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ criteria }) });
      let body = await response.json() as { error?: string; duplicateHuntId?: string; opportunities?: PublishingOpportunity[]; ownerAction?: unknown };
      if (response.status === 409 && body.duplicateHuntId) {
        response = await fetch(`/api/admin/beast-hunter?huntId=${encodeURIComponent(body.duplicateHuntId)}`, { cache: "no-store" });
        body = await response.json() as { error?: string; opportunities?: PublishingOpportunity[]; ownerAction?: unknown };
      }
      if (!response.ok || !body.opportunities) { setHuntOwnerAction(normalizeOwnerProviderAction(body.ownerAction)); throw new Error(body.error || "BeastHunter could not return publishing opportunities."); }
      setHuntResults(body.opportunities);
      setMessage(`${body.opportunities.length} evidence-backed KDP opportunities found. Choose only the ones you want to produce.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The KDP opportunity search could not be completed.");
    } finally {
      setHunting(false);
    }
  }

  async function addOpportunity(item: PublishingOpportunity) {
    if (addingOpportunityId) return;
    setAddingOpportunityId(item.id); setMessage(`Adding ${item.title} to Publishing…`);
    const response = await fetch("/api/admin/beast-marketing/publishing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      title: item.title,
      audience: item.explanation.customer,
      topic: `${item.summary} Proposed publication: ${item.explanation.whatToBuild}`,
      formats: selectedFormats(item.id),
      opportunity: {
        buyerIntent: item.scores.commercialIntent,
        differentiation: item.scores.competitionGap,
        evidenceReadiness: item.scores.verifiability ?? item.scores.confidence,
        seriesPotential: item.scores.durability,
        timeToMarketDays: item.buildDays ?? 14,
        estimatedCashCost: item.startupCost ?? 0,
      },
    }) });
    const body = await response.json() as { error?: string; recommendation?: string };
    setAddingOpportunityId(null);
    if (!response.ok) { setMessage(body.error || "The selected opportunity could not be added."); return; }
    setHuntResults((current) => current.filter((candidate) => candidate.id !== item.id));
    setMessage(`${item.title} added to the production queue · ${label(body.recommendation || "review")} priority.`);
    await load();
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createInFlight.current) return;
    createInFlight.current = true;
    setCreating(true);
    setMessage("Scoring and saving candidate…");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/admin/beast-marketing/publishing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        title: data.get("title"), audience: data.get("audience"), topic: data.get("topic"), formats: data.getAll("formats"),
        opportunity: { buyerIntent: data.get("buyerIntent"), differentiation: data.get("differentiation"), evidenceReadiness: data.get("evidenceReadiness"), seriesPotential: data.get("seriesPotential"), timeToMarketDays: data.get("timeToMarketDays"), estimatedCashCost: data.get("estimatedCashCost") },
      }) });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error || "Candidate could not be saved."); return; }
      form.reset();
      await load();
      setMessage(`Candidate saved · ${label(body.recommendation)} priority. It is listed under Publishing projects below.`);
    } catch {
      setMessage("The candidate could not be saved. Your form entries were preserved; try again.");
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
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

  async function manuscriptAction(publicationId: string, action: "initialize" | "generate_next", knownTotal = chapters[publicationId]?.length || 0) {
    if (action === "generate_next" && generatingPublicationId) return;
    if (action === "generate_next") {
      const rows = chapters[publicationId] || [];
      const completed = rows.filter((chapter) => ["review_ready", "approved"].includes(chapter.status)).length;
      setGeneratingPublicationId(publicationId);
      setGenerationProgress((current) => ({ ...current, [publicationId]: { state: "working", text: "Generating the next sourced chapter…", completed, total: rows.length || knownTotal } }));
    }
    setMessage(action === "initialize" ? "Creating chapter plan…" : "Generating the next sourced chapter draft…");
    try {
      const response = await fetch("/api/admin/beast-marketing/publishing/manuscript", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicationId, action }) });
      const body = await response.json() as { error?: string; chapterCount?: number; chapter?: Chapter; ownerAction?: unknown };
      if (!response.ok) {
        const rows = chapters[publicationId] || [];
        const completed = rows.filter((chapter) => ["review_ready", "approved"].includes(chapter.status)).length;
        const text = body.error || "Manuscript action could not be completed.";
        setGenerationProgress((current) => ({ ...current, [publicationId]: { state: "error", text, completed, total: rows.length || knownTotal, ownerAction: normalizeOwnerProviderAction(body.ownerAction) } }));
        setMessage(text);
        return;
      }
      setMessage(action === "initialize" ? `Chapter plan created · ${body.chapterCount} chapters.` : `Chapter ${body.chapter?.chapter_number} is ready for review.`);
      if (action === "generate_next") {
        const rows = chapters[publicationId] || [];
        setGenerationProgress((current) => ({ ...current, [publicationId]: { state: "success", text: `Chapter ${body.chapter?.chapter_number} drafted and ready for review.`, completed: Math.min(rows.length, rows.filter((chapter) => ["review_ready", "approved"].includes(chapter.status)).length + 1), total: rows.length } }));
      }
    } catch {
      const rows = chapters[publicationId] || [];
      const text = "Chapter generation stopped. Nothing is processing in the background.";
      setGenerationProgress((current) => ({ ...current, [publicationId]: { state: "error", text, completed: rows.filter((chapter) => ["review_ready", "approved"].includes(chapter.status)).length, total: rows.length } }));
      setMessage(text);
    } finally {
      if (action === "generate_next") setGeneratingPublicationId(null);
      await Promise.all([load(), loadChapters(publicationId)]);
    }
  }

  async function generateAllRemaining(publicationId: string, knownTotal = chapters[publicationId]?.length || 0) {
    if (generatingPublicationId) return;
    setGeneratingPublicationId(publicationId);
    let generated = 0;
    const initialRows = chapters[publicationId] || [];
    const initialCompleted = initialRows.filter((chapter) => ["review_ready", "approved"].includes(chapter.status)).length;
    const total = initialRows.length || knownTotal;
    setGenerationProgress((current) => ({ ...current, [publicationId]: { state: "working", text: "Generating chapter 1 of the remaining chapters…", completed: initialCompleted, total } }));
    try {
      while (true) {
        setMessage(generated ? `Generating chapter drafts… ${generated} complete.` : "Generating all remaining sourced chapter drafts…");
        const response = await fetch("/api/admin/beast-marketing/publishing/manuscript", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicationId, action: "generate_next" }) });
        const body = await response.json() as { error?: string; chapter?: Chapter; remainingCount?: number; ownerAction?: unknown };
        if (!response.ok) {
          const text = body.error || `Generation stopped after ${generated} chapters.`;
          setGenerationProgress((current) => ({ ...current, [publicationId]: { state: "error", text, completed: initialCompleted + generated, total, ownerAction: normalizeOwnerProviderAction(body.ownerAction) } }));
          setMessage(text);
          return;
        }
        generated += 1;
        setMessage(`Chapter ${body.chapter?.chapter_number} drafted · ${body.remainingCount} remaining.`);
        setGenerationProgress((current) => ({ ...current, [publicationId]: { state: "working", text: body.remainingCount ? `Chapter ${body.chapter?.chapter_number} drafted. Generating the next chapter…` : "All chapter drafts generated.", completed: initialCompleted + generated, total } }));
        if (body.remainingCount === 0) break;
      }
      setMessage(`${generated} chapter${generated === 1 ? "" : "s"} generated · ready for individual review.`);
      setGenerationProgress((current) => ({ ...current, [publicationId]: { state: "success", text: `${generated} chapter${generated === 1 ? "" : "s"} generated and ready for review.`, completed: initialCompleted + generated, total } }));
    } catch {
      const text = `Generation stopped safely after ${generated} chapter${generated === 1 ? "" : "s"}. Nothing is still processing; completed drafts were preserved.`;
      setMessage(text);
      setGenerationProgress((current) => ({ ...current, [publicationId]: { state: "error", text, completed: initialCompleted + generated, total } }));
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
    setPackagingPublicationId(publicationId); setMessage("Building and validating the KDP preparation package…");
    try {
      const response = await fetch("/api/admin/beast-marketing/publishing/package", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicationId }) });
      if (!response.ok) { const body = await response.json(); setMessage(body.error || "KDP package construction failed."); return; }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || "kdp-owner-review-package.zip";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setMessage("KDP interiors and preparation worksheets built · owner review package downloaded.");
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
    const progress = generationProgress[item.id];
    const completed = rows?.filter((chapter) => ["review_ready", "approved"].includes(chapter.status)).length || 0;
    const total = rows?.length || item.brief?.chapters?.length || 0;
    const shownCompleted = progress?.completed ?? completed;
    const shownTotal = progress?.total || total;
    const percentage = shownTotal ? Math.round((shownCompleted / shownTotal) * 100) : 0;
    return <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button disabled={Boolean(generatingPublicationId)} onClick={() => void generateAllRemaining(item.id, total)} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 disabled:cursor-wait disabled:opacity-60">{generating ? "Generating chapters…" : "Generate all remaining chapters"}</button>
        <button disabled={Boolean(generatingPublicationId)} onClick={() => void manuscriptAction(item.id, "generate_next", total)} className="min-h-11 rounded-xl border border-amber-300/30 px-4 py-2 text-sm font-black text-amber-100 disabled:cursor-wait disabled:opacity-60">{generating ? "Generation in progress…" : "Generate one chapter"}</button>
        <button disabled={generating} onClick={() => void loadChapters(item.id)} className="min-h-11 rounded-xl border border-white/15 px-4 py-2 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60">{rows ? "Refresh chapters" : "View chapters"}</button>
      </div>
      <p className="text-xs leading-5 text-slate-400">Chapter generation uses paid OpenAI API credits. Bulk generation drafts every remaining chapter in order. Each chapter still requires your approval.</p>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" aria-live="polite">
        <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-300"><span>{shownCompleted} of {shownTotal} chapters drafted</span><span>{percentage}%</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-300 transition-[width] duration-300" style={{ width: `${percentage}%` }} /></div>
        {generating ? <p className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-100"><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-200 border-r-transparent" aria-hidden="true" />{progress?.text || "Generation request is in process…"}</p> : progress ? <div className={`mt-3 rounded-lg border p-3 text-sm font-bold ${progress.state === "error" ? "border-red-300/30 bg-red-400/[0.08] text-red-100" : "border-emerald-300/25 bg-emerald-400/[0.06] text-emerald-100"}`}><p>{progress.text}</p>{progress.ownerAction ? <a href={progress.ownerAction.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-amber-300 px-4 py-2 text-slate-950">{progress.ownerAction.label}</a> : null}</div> : <p className="mt-2 text-xs text-slate-400">No generation is currently running.</p>}
      </div>
      {rows ? <div className="space-y-2">{rows.map((chapter) => <details key={chapter.id} className="rounded-xl border border-white/10 p-3" open={chapter.status === "review_ready"}><summary className="cursor-pointer text-sm font-black text-white">Chapter {chapter.chapter_number}: {chapter.title} · {label(chapter.status)} · {chapter.word_count} words</summary>{chapter.draft_text ? <div className="mt-3 space-y-3"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{chapter.draft_text}</p><div>{chapter.source_notes.map((source) => <p key={source.url} className="text-sm text-slate-400"><a className="text-amber-200 underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> — {source.claim}</p>)}</div>{chapter.status === "review_ready" ? <button onClick={() => void approveChapter(item.id, chapter.id)} className="min-h-11 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950">Approve chapter</button> : null}</div> : <p className="mt-3 text-sm text-slate-400">{chapter.status === "blocked" ? "No draft was created. The last generation attempt stopped; use the error and action shown above." : chapter.status === "generating" ? "This chapter is currently being generated." : "This chapter is waiting for generation."}</p>}</details>)}</div> : <p className="text-sm text-slate-400">Load the chapter plan to view individual status.</p>}
    </div>;
  }

  function actions(item: Publication) {
    if (item.state === "scored") return <button onClick={() => void advance(item.id, "prepare_brief")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Prepare brief</button>;
    if (item.state === "brief_ready") return <button onClick={() => void advance(item.id, "approve_brief")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Approve brief</button>;
    if (item.state === "brief_approved") return <button onClick={() => void manuscriptAction(item.id, "initialize")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Create chapter plan</button>;
    if (item.state === "drafting") return manuscript(item);
    if (item.state === "quality_review") return <div className="space-y-3"><div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4"><p className="text-sm font-black text-white">Preparation package</p><p className="mt-1 text-xs leading-5 text-slate-400">Builds EPUB for Kindle and 6 × 9-inch no-bleed DOCX/PDF interiors for print, plus manifest, source notes and owner-review worksheets for metadata, cover, pricing, quality and submission. Worksheets do not mark those gates complete.</p><button disabled={Boolean(packagingPublicationId)} onClick={() => void downloadInteriorPackage(item.id)} className="mt-3 min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 disabled:cursor-wait disabled:opacity-60">{packagingPublicationId === item.id ? "Building package…" : "Build preparation package"}</button></div><form onSubmit={(event) => validatePackage(event, item.id)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm font-black text-white">Package evidence</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{evidenceFields.map(([key, text]) => <label key={`${item.updated_at}-${key}`} className="flex min-h-9 items-center gap-2 text-sm text-slate-300"><input type="checkbox" name={key} defaultChecked={Boolean(item.package_evidence?.[key])} />{text}</label>)}</div><button className="mt-3 min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Validate package</button></form></div>;
    if (item.state === "package_ready") return <button onClick={() => void advance(item.id, "approve_package")} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Owner approve package</button>;
    if (item.state === "owner_approved") return <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-3 text-sm text-emerald-100"><p>Package approved. Amazon submission is waiting for your separate owner action.</p><a href="https://kdp.amazon.com/bookshelf" target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-emerald-300 px-4 py-2 font-black text-slate-950">Open KDP Bookshelf</a></div>;
    return null;
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Priority 1 revenue factory</p>
      <h2 className="mt-2 text-xl font-black text-white">KDP production queue</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">Preparation is active. Amazon submission, account changes, terms, ISBN decisions, advertising, and publication remain owner-only.</p>
    </section>
    <section className="rounded-2xl border border-amber-300/20 bg-white/[0.03] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">BeastHunter inside Publishing</p>
      <h2 className="mt-2 text-lg font-black text-white">Find KDP opportunities</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">Optional paid research using BeastAdmin&apos;s OpenAI API account. For a no-additional-API-cost workflow, research with Codex/ChatGPT and enter the chosen idea below. Nothing enters production until you choose it.</p>
      <label className="mt-4 block text-sm font-bold text-slate-200">What should BeastHunter look for?<textarea value={huntObjective} onChange={(event) => setHuntObjective(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" /></label>
      <button type="button" disabled={hunting || !huntObjective.trim()} onClick={() => void runPublishingHunt()} className="mt-4 min-h-11 rounded-xl bg-amber-300 px-5 py-2 font-black text-slate-950 disabled:cursor-wait disabled:opacity-60">{hunting ? "Researching KDP opportunities…" : "Search with BeastHunter"}</button>
      {huntResults.length ? <div className="mt-5 grid gap-4">{huntResults.map((item) => {
        const revenue = item.expectedMonthlyRevenueLow === null && item.expectedMonthlyRevenueHigh === null ? "Not enough evidence" : `${(item.expectedMonthlyRevenueLow ?? 0).toLocaleString()}–${(item.expectedMonthlyRevenueHigh ?? 0).toLocaleString()}/month`;
        return <article key={item.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-amber-200">#{item.score}/100 · {item.recommendation} · {item.market}</p><h3 className="mt-2 text-lg font-black text-white">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{item.summary}</p></div></div><p className="mt-3 text-sm text-slate-300"><strong className="text-white">Why now:</strong> {item.explanation.whyNow}</p><p className="mt-2 text-sm text-slate-300"><strong className="text-white">Revenue evidence:</strong> {revenue} · {item.explanation.monetization}</p><p className="mt-2 text-xs leading-5 text-slate-400">{item.recommendationReason}</p><div className="mt-3 flex flex-wrap gap-3">{item.evidence.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-300 underline">{source.label}</a>)}</div><fieldset className="mt-4"><legend className="text-xs font-black uppercase tracking-wider text-slate-400">Create formats</legend><div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">{["ebook","paperback","hardcover"].map((format) => <label key={format}><input type="checkbox" checked={selectedFormats(item.id).includes(format)} onChange={() => toggleOpportunityFormat(item.id, format)} className="mr-2" />{label(format)}</label>)}</div></fieldset><button type="button" disabled={Boolean(addingOpportunityId)} onClick={() => void addOpportunity(item)} className="mt-4 min-h-11 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 disabled:cursor-wait disabled:opacity-60">{addingOpportunityId === item.id ? "Adding to Publishing…" : "Create this publication"}</button></article>;
      })}</div> : null}
      {message ? <p role="status" className="mt-3 text-sm text-amber-100">{message}</p> : null}
      {huntOwnerAction ? <a href={huntOwnerAction.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">{huntOwnerAction.label}</a> : null}
    </section>
    <form onSubmit={create} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-black text-white">Start with my own idea</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">Primary workflow: bring an idea you developed yourself or with Codex/ChatGPT. This path does not run the paid BeastHunter opportunity search.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm text-slate-300">Working title<input required name="title" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" /></label>
        <label className="text-sm text-slate-300">Target audience<input required name="audience" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" /></label>
        <label className="text-sm text-slate-300">Topic and promise<input required name="topic" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" /></label>
      </div>
      <fieldset className="mt-4"><legend className="text-sm font-black text-white">Formats</legend><div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">{["ebook","paperback","hardcover"].map((item) => <label key={item}><input defaultChecked={item === "ebook"} type="checkbox" name="formats" value={item} className="mr-2" />{label(item)}</label>)}</div></fieldset>
      <details className="mt-4 rounded-xl border border-white/10 p-4">
        <summary className="cursor-pointer text-sm font-black text-white">Advanced opportunity scoring</summary>
        <p className="mt-2 text-xs leading-5 text-slate-400">Defaults are provided. Change these only when you have better market evidence.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[["buyerIntent","Buyer intent",70],["differentiation","Differentiation",70],["evidenceReadiness","Evidence ready",70],["seriesPotential","Series potential",70],["timeToMarketDays","Days to market",14],["estimatedCashCost","Cash cost ($)",0]].map(([name,text,value]) => <label key={String(name)} className="text-xs text-slate-300">{text}<input required type="number" min="0" max={name === "timeToMarketDays" || name === "estimatedCashCost" ? undefined : 100} defaultValue={value} name={String(name)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" /></label>)}
        </div>
      </details>
      <button disabled={creating} className="mt-4 min-h-11 rounded-xl bg-amber-300 px-5 py-2 font-black text-slate-950 disabled:cursor-wait disabled:opacity-60">{creating ? "Adding idea…" : "Add my idea to publishing"}</button>
    </form>
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-black text-white">Publishing projects</h2>
      {loading ? <p role="status" className="mt-3 text-sm text-slate-300">Loading factory queue…</p> : null}
      {!loading && !publications.length ? <p className="mt-3 text-sm text-slate-400">No publishing projects yet. Search with BeastHunter or add your own idea above.</p> : null}
      <div className="mt-4 space-y-3">{publications.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-white">{item.title}</h3><p className="mt-1 text-sm text-slate-300">{item.topic}</p></div><span className="rounded-full border border-amber-300/20 px-3 py-1 text-xs font-black text-amber-100">Score {item.opportunity_score ?? "Unavailable"}</span></div><p className="mt-3 text-sm text-slate-400">{label(item.state)} · {item.formats.map(label).join(" · ")} · {item.audience}</p>{item.brief?.chapters?.length ? <details className="mt-4 rounded-xl border border-white/10 p-4" open={item.state === "brief_ready"}><summary className="cursor-pointer text-sm font-black text-white">Publication brief</summary><p className="mt-3 text-sm text-slate-300">{item.brief.positioning}</p><p className="mt-2 text-sm text-slate-300">{item.brief.readerOutcome}</p><ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-300">{item.brief.chapters.map((chapter) => <li key={chapter}>{chapter}</li>)}</ol></details> : null}<div className="mt-4">{actions(item)}</div></article>)}</div>
    </section>
  </div>;
}
