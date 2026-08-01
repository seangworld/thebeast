"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  compareCareerPaths,
  type CareerPathComparison,
  type EducationCareerProfilePhase,
  type ResearchSource,
} from "@/lib/education/careerIntelligence";

type ProfileRow = {
  id: string;
  phase: EducationCareerProfilePhase;
  category: string;
  label: string;
  value: string;
  source_type: string;
  source_reference: string | null;
  verification_status: string;
  confidence: number;
  occurred_on: string | null;
  updated_at: string;
};

type PathRow = {
  id: string;
  title: string;
  path_type: string;
  status: string;
  comparison: Partial<Record<string, string>>;
  rationale: string | null;
  confidence: number | null;
  source_url: string | null;
  source_name: string | null;
  source_effective_on: string | null;
  source_retrieved_at: string | null;
  jurisdiction: string | null;
  limitations: string | null;
};

type RoadmapRow = {
  id: string;
  title: string;
  destination: string;
  starting_point: string;
  gap_summary: string;
  status: string;
  version: number;
  progress: number;
  pending_material_change: Record<string, unknown> | null;
  last_reviewed_at: string | null;
};

type StepRow = {
  id: string;
  roadmap_id: string;
  title: string;
  description: string;
  step_type: string;
  status: string;
  sort_order: number;
  target_date: string | null;
  estimated_time: string | null;
  estimated_cost: string | null;
};

type ExtractionItemRow = {
  id: string;
  phase: EducationCareerProfilePhase;
  category: string;
  label: string;
  value: string;
  source_excerpt: string | null;
  confidence: number | null;
  status: string;
};

type DocumentRow = {
  id: string;
  title: string;
  file_name: string;
  category: string;
  status: string;
};

type OutcomeRow = {
  id: string;
  event_type: string;
  title: string;
  detail: string;
  occurred_at: string;
  source_type: string;
};

type GoalRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  target_date: string | null;
};

type ResearchResult = {
  status: string;
  answer?: string;
  sources?: ResearchSource[];
  limitations?: string[];
  error?: string;
};

const phaseCopy: Record<EducationCareerProfilePhase, { title: string; empty: string }> = {
  past: { title: "Past", empty: "Add education, work, military, training, credentials, projects, or prior outcomes." },
  present: { title: "Present", empty: "Add your current role, qualifications, strengths, interests, schedule, and constraints." },
  goal: { title: "Goals", empty: "Add the destination, timeline, environment, priority, and alternatives you want to explore." },
};

const profileCategories = [
  "school", "degree", "coursework", "certification", "license", "training",
  "military", "employment", "project", "volunteer", "leadership", "role",
  "qualification", "skill", "strength", "interest", "schedule", "budget",
  "family", "geography", "work_environment", "accessibility", "occupation",
  "employer_type", "income", "education_goal", "career_goal", "timeline",
  "constraint", "other",
] as const;

function displayDate(value?: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function EducationCareerWorkspace() {
  const [ownerId, setOwnerId] = useState("");
  const [profile, setProfile] = useState<ProfileRow[]>([]);
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [extractions, setExtractions] = useState<ExtractionItemRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    phase: "present" as EducationCareerProfilePhase,
    category: "role",
    label: "",
    value: "",
    occurredOn: "",
  });
  const [editingProfileId, setEditingProfileId] = useState("");
  const [pathDraft, setPathDraft] = useState({
    title: "", pathType: "other", goalId: "", rationale: "", time: "", cost: "", risk: "",
  });
  const [roadmapDraft, setRoadmapDraft] = useState({
    title: "", goalId: "", destination: "", startingPoint: "", gapSummary: "",
  });
  const [stepDraft, setStepDraft] = useState({ roadmapId: "", title: "", targetDate: "" });
  const [outcomeDraft, setOutcomeDraft] = useState({ eventType: "decision", title: "", detail: "" });
  const [researchQuery, setResearchQuery] = useState("");
  const [researchConsent, setResearchConsent] = useState(false);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [researching, setResearching] = useState(false);
  const [documentDraft, setDocumentDraft] = useState({ documentId: "", text: "", consent: false });
  const [extracting, setExtracting] = useState(false);
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const client = createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      setStatus("Your authenticated education profile could not be loaded.");
      setLoading(false);
      return;
    }
    setOwnerId(user.id);
    const [profileResult, pathResult, roadmapResult, stepResult, extractionResult, documentResult, outcomeResult, goalResult] = await Promise.all([
      client.from("education_career_profile_items").select("id, phase, category, label, value, source_type, source_reference, verification_status, confidence, occurred_on, updated_at").eq("owner_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
      client.from("education_career_paths").select("id, title, path_type, status, comparison, rationale, confidence, source_url, source_name, source_effective_on, source_retrieved_at, jurisdiction, limitations").eq("owner_id", user.id).neq("status", "archived").order("updated_at", { ascending: false }),
      client.from("education_career_roadmaps").select("id, title, destination, starting_point, gap_summary, status, version, progress, pending_material_change, last_reviewed_at").eq("owner_id", user.id).neq("status", "archived").order("updated_at", { ascending: false }),
      client.from("education_career_roadmap_steps").select("id, roadmap_id, title, description, step_type, status, sort_order, target_date, estimated_time, estimated_cost").eq("owner_id", user.id).order("sort_order"),
      client.from("education_career_document_extraction_items").select("id, phase, category, label, value, source_excerpt, confidence, status").eq("owner_id", user.id).eq("status", "pending").order("created_at"),
      client.from("beast_documents").select("id, title, file_name, category, status").eq("owner_id", user.id).not("status", "in", '("Archived","Deleted")').order("updated_at", { ascending: false }),
      client.from("education_career_outcomes").select("id, event_type, title, detail, occurred_at, source_type").eq("owner_id", user.id).order("occurred_at", { ascending: false }).limit(25),
      client.from("beast_goals").select("id, title, category, status, target_date").eq("owner_id", user.id).in("category", ["Education", "Career"]).neq("status", "Archived").order("updated_at", { ascending: false }),
    ]);
    const firstError = [profileResult.error, pathResult.error, roadmapResult.error, stepResult.error, extractionResult.error, documentResult.error, outcomeResult.error, goalResult.error].find(Boolean);
    if (firstError) {
      setStatus("Some Education & Career planning records are unavailable. No missing data was treated as empty.");
    } else {
      setStatus("");
    }
    setProfile((profileResult.data || []) as ProfileRow[]);
    setPaths((pathResult.data || []) as PathRow[]);
    setRoadmaps((roadmapResult.data || []) as RoadmapRow[]);
    setSteps((stepResult.data || []) as StepRow[]);
    setExtractions((extractionResult.data || []) as ExtractionItemRow[]);
    setDocuments((documentResult.data || []) as DocumentRow[]);
    setOutcomes((outcomeResult.data || []) as OutcomeRow[]);
    setGoals((goalResult.data || []) as GoalRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rankedPaths = useMemo(
    () => compareCareerPaths(paths.map((path): CareerPathComparison => ({
      id: path.id,
      title: path.title,
      factors: path.comparison,
      confidence: path.confidence ?? undefined,
      sourceName: path.source_name ?? undefined,
      sourceUrl: path.source_url ?? undefined,
      sourceEffectiveOn: path.source_effective_on ?? undefined,
      sourceRetrievedAt: path.source_retrieved_at ?? undefined,
      jurisdiction: path.jurisdiction ?? undefined,
      limitations: path.limitations ?? undefined,
    }))),
    [paths]
  );

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!ownerId || !profileDraft.label.trim() || !profileDraft.value.trim()) return;
    const client = createClient();
    const values = {
      owner_id: ownerId,
      phase: profileDraft.phase,
      category: profileDraft.category,
      label: profileDraft.label.trim(),
      value: profileDraft.value.trim(),
      occurred_on: profileDraft.occurredOn || null,
      source_type: "form",
      verification_status: "member_reported",
      confidence: 1,
      updated_at: new Date().toISOString(),
    };
    const result = editingProfileId
      ? await client.from("education_career_profile_items").update(values).eq("id", editingProfileId).eq("owner_id", ownerId)
      : await client.from("education_career_profile_items").insert(values);
    if (result.error) setStatus("The profile item could not be saved. No existing record changed.");
    else {
      setEditingProfileId("");
      setProfileDraft({ phase: "present", category: "role", label: "", value: "", occurredOn: "" });
      await load();
    }
  }

  async function removeProfile(item: ProfileRow) {
    if (!window.confirm(`Remove “${item.label}” from your Education & Career Profile?`)) return;
    const result = await createClient().from("education_career_profile_items").delete().eq("id", item.id).eq("owner_id", ownerId);
    if (result.error) setStatus("The profile item could not be removed.");
    else await load();
  }

  async function savePath(event: FormEvent) {
    event.preventDefault();
    if (!ownerId || !pathDraft.title.trim()) return;
    const result = await createClient().from("education_career_paths").insert({
      owner_id: ownerId,
      title: pathDraft.title.trim(),
      path_type: pathDraft.pathType,
      goal_id: pathDraft.goalId || null,
      rationale: pathDraft.rationale.trim() || null,
      comparison: { time: pathDraft.time, cost: pathDraft.cost, risk: pathDraft.risk },
      status: "candidate",
    });
    if (result.error) setStatus("The candidate path could not be saved.");
    else {
      setPathDraft({ title: "", pathType: "other", goalId: "", rationale: "", time: "", cost: "", risk: "" });
      await load();
    }
  }

  async function saveRoadmap(event: FormEvent) {
    event.preventDefault();
    if (!ownerId || !roadmapDraft.title.trim()) return;
    const result = await createClient().from("education_career_roadmaps").insert({
      owner_id: ownerId,
      title: roadmapDraft.title.trim(),
      goal_id: roadmapDraft.goalId || null,
      destination: roadmapDraft.destination.trim(),
      starting_point: roadmapDraft.startingPoint.trim(),
      gap_summary: roadmapDraft.gapSummary.trim(),
      status: "draft",
    });
    if (result.error) setStatus("The roadmap draft could not be saved.");
    else {
      setRoadmapDraft({ title: "", goalId: "", destination: "", startingPoint: "", gapSummary: "" });
      await load();
    }
  }

  async function transitionRoadmap(roadmap: RoadmapRow, next: "active" | "paused" | "archived") {
    if (next === "archived" && !window.confirm(`Archive “${roadmap.title}”?`)) return;
    const now = new Date().toISOString();
    const result = await createClient().from("education_career_roadmaps").update({
      status: next,
      approved_at: next === "active" ? now : undefined,
      last_reviewed_at: now,
      version: next === "active" && roadmap.pending_material_change ? roadmap.version + 1 : roadmap.version,
      pending_material_change: next === "active" ? null : roadmap.pending_material_change,
    }).eq("id", roadmap.id).eq("owner_id", ownerId);
    if (result.error) setStatus("The roadmap status could not be changed.");
    else await load();
  }

  async function saveStep(event: FormEvent) {
    event.preventDefault();
    if (!ownerId || !stepDraft.roadmapId || !stepDraft.title.trim()) return;
    const order = steps.filter(({ roadmap_id }) => roadmap_id === stepDraft.roadmapId).length;
    const result = await createClient().from("education_career_roadmap_steps").insert({
      owner_id: ownerId,
      roadmap_id: stepDraft.roadmapId,
      title: stepDraft.title.trim(),
      target_date: stepDraft.targetDate || null,
      sort_order: order,
    });
    if (result.error) setStatus("The roadmap step could not be saved.");
    else {
      setStepDraft({ roadmapId: stepDraft.roadmapId, title: "", targetDate: "" });
      await load();
    }
  }

  async function moveStep(step: StepRow, direction: -1 | 1) {
    const siblings = steps.filter(({ roadmap_id }) => roadmap_id === step.roadmap_id);
    const index = siblings.findIndex(({ id }) => id === step.id);
    const swap = siblings[index + direction];
    if (!swap) return;
    const client = createClient();
    const [first, second] = await Promise.all([
      client.from("education_career_roadmap_steps").update({ sort_order: swap.sort_order }).eq("id", step.id).eq("owner_id", ownerId),
      client.from("education_career_roadmap_steps").update({ sort_order: step.sort_order }).eq("id", swap.id).eq("owner_id", ownerId),
    ]);
    if (first.error || second.error) setStatus("The roadmap order could not be changed.");
    else await load();
  }

  async function reviewExtraction(item: ExtractionItemRow, decision: "approved" | "rejected" | "merged") {
    const client = createClient();
    const mergeProfileItemId = decision === "merged" ? mergeTargets[item.id] : null;
    if (decision === "merged" && !mergeProfileItemId) {
      setStatus("Choose an existing profile item before merging this proposal.");
      return;
    }
    const result = decision === "approved" || decision === "merged"
      ? await client.rpc("approve_education_career_document_item", { requested_item_id: item.id, merge_profile_item_id: mergeProfileItemId })
      : await client.from("education_career_document_extraction_items").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", item.id).eq("owner_id", ownerId);
    if (result.error) setStatus("The document proposal could not be reviewed.");
    else await load();
  }

  async function editExtraction(item: ExtractionItemRow) {
    const value = window.prompt("Edit the proposed value before review", item.value)?.trim();
    if (!value || value === item.value) return;
    const result = await createClient()
      .from("education_career_document_extraction_items")
      .update({ value })
      .eq("id", item.id)
      .eq("owner_id", ownerId)
      .eq("status", "pending");
    if (result.error) setStatus("The proposed document value could not be edited.");
    else await load();
  }

  async function extractDocument(event: FormEvent) {
    event.preventDefault();
    if (!documentDraft.documentId || !documentDraft.text.trim()) return;
    setExtracting(true);
    try {
      const response = await fetch(`/api/education/documents/${documentDraft.documentId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: documentDraft.text, consent: documentDraft.consent }),
      });
      const result = (await response.json()) as { error?: string; proposedItemCount?: number; reused?: boolean };
      if (!response.ok) setStatus(result.error || "The document could not be analyzed.");
      else {
        setStatus(result.reused ? "The remembered extraction was reused; no duplicate proposals were created." : `${result.proposedItemCount || 0} document proposals are ready for review.`);
        setDocumentDraft({ documentId: documentDraft.documentId, text: "", consent: false });
        await load();
      }
    } catch {
      setStatus("Document extraction is unreachable. No profile records were created.");
    } finally {
      setExtracting(false);
    }
  }

  async function saveOutcome(event: FormEvent) {
    event.preventDefault();
    if (!ownerId || !outcomeDraft.title.trim()) return;
    const result = await createClient().from("education_career_outcomes").insert({
      owner_id: ownerId,
      event_type: outcomeDraft.eventType,
      title: outcomeDraft.title.trim(),
      detail: outcomeDraft.detail.trim(),
      source_type: "member",
    });
    if (result.error) setStatus("The outcome could not be recorded.");
    else {
      setOutcomeDraft({ eventType: "decision", title: "", detail: "" });
      await load();
    }
  }

  async function runResearch(event: FormEvent) {
    event.preventDefault();
    setResearching(true);
    setResearch(null);
    try {
      const response = await fetch("/api/education/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: researchQuery, externalResearchConsent: researchConsent }),
      });
      setResearch((await response.json()) as ResearchResult);
    } catch {
      setResearch({ status: "error", error: "Research is unreachable. Your saved planning data was not sent." });
    } finally {
      setResearching(false);
    }
  }

  if (loading) return <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-slate-300" role="status">Loading your Education &amp; Career intelligence…</p>;

  return (
    <div className="grid min-w-0 gap-6" data-education-career-intelligence="BE-201">
      {status ? <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100" role="alert">{status}</p> : null}

      <section id="profile" className="rounded-2xl border border-white/10 bg-[#111827] p-4 sm:p-6" aria-labelledby="education-profile-heading">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-200">Education &amp; Career Profile</p>
        <h2 id="education-profile-heading" className="mt-2 text-2xl font-black text-white">Past, present, and goals</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Conversation and forms contribute to the same owner-scoped profile. Member-reported information remains distinguishable from document-verified evidence.</p>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {(["past", "present", "goal"] as const).map((phase) => {
            const items = profile.filter((item) => item.phase === phase);
            return <section key={phase} className="min-w-0 rounded-xl border border-white/10 bg-black/15 p-4" aria-labelledby={`profile-${phase}`}>
              <h3 id={`profile-${phase}`} className="text-lg font-black text-white">{phaseCopy[phase].title}</h3>
              {items.length ? <ul className="mt-3 grid gap-3">{items.map((item) => <li key={item.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <p className="break-words font-bold text-white">{item.label}</p>
                <p className="mt-1 break-words text-sm leading-5 text-slate-300">{item.value}</p>
                <p className="mt-2 text-xs text-slate-500">{titleCase(item.category)} · {titleCase(item.verification_status)} · {Math.round(item.confidence * 100)}% confidence</p>
                <p className="mt-1 text-xs text-slate-500">Source: {titleCase(item.source_type)} · Updated {displayDate(item.updated_at)}</p>
                <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="text-xs font-bold text-cyan-200" onClick={() => { setEditingProfileId(item.id); setProfileDraft({ phase: item.phase, category: item.category, label: item.label, value: item.value, occurredOn: item.occurred_on || "" }); }}>Edit or correct</button><button type="button" className="text-xs font-bold text-red-200" onClick={() => void removeProfile(item)}>Remove</button></div>
              </li>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate-400">{phaseCopy[phase].empty}</p>}
            </section>;
          })}
        </div>
        <form className="mt-5 grid gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4 md:grid-cols-2" onSubmit={saveProfile}>
          <h3 className="font-black text-white md:col-span-2">{editingProfileId ? "Edit profile item" : "Add a profile item"}</h3>
          <label className="grid gap-1 text-sm text-slate-300">Phase<select className="beast-input" value={profileDraft.phase} onChange={(event) => setProfileDraft((current) => ({ ...current, phase: event.target.value as EducationCareerProfilePhase }))}><option value="past">Past</option><option value="present">Present</option><option value="goal">Goal</option></select></label>
          <label className="grid gap-1 text-sm text-slate-300">Category<select className="beast-input" value={profileDraft.category} onChange={(event) => setProfileDraft((current) => ({ ...current, category: event.target.value }))}>{profileCategories.map((category) => <option key={category} value={category}>{titleCase(category)}</option>)}</select></label>
          <label className="grid gap-1 text-sm text-slate-300">Label<input className="beast-input" required maxLength={200} value={profileDraft.label} onChange={(event) => setProfileDraft((current) => ({ ...current, label: event.target.value }))} /></label>
          <label className="grid gap-1 text-sm text-slate-300">Date, if applicable<input className="beast-input" type="date" value={profileDraft.occurredOn} onChange={(event) => setProfileDraft((current) => ({ ...current, occurredOn: event.target.value }))} /></label>
          <label className="grid gap-1 text-sm text-slate-300 md:col-span-2">Details<textarea className="beast-input min-h-24" required maxLength={4000} value={profileDraft.value} onChange={(event) => setProfileDraft((current) => ({ ...current, value: event.target.value }))} /></label>
          <div className="flex flex-wrap gap-2 md:col-span-2"><button className="beast-button-primary" type="submit">{editingProfileId ? "Save correction" : "Add to profile"}</button>{editingProfileId ? <button className="beast-button-secondary" type="button" onClick={() => { setEditingProfileId(""); setProfileDraft({ phase: "present", category: "role", label: "", value: "", occurredOn: "" }); }}>Cancel</button> : null}</div>
        </form>
      </section>

      <section id="paths" className="rounded-2xl border border-white/10 bg-[#111827] p-4 sm:p-6" aria-labelledby="paths-heading">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-violet-200">Paths &amp; Gap Analysis</p>
        <h2 id="paths-heading" className="mt-2 text-2xl font-black text-white">Compare more than one credible route</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">A path without current source evidence is labeled for research, never presented as a settled recommendation.</p>
        {rankedPaths.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{rankedPaths.map((path) => <article key={path.id} className="min-w-0 rounded-xl border border-white/10 bg-black/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words text-lg font-black text-white">{path.rank}. {path.title}</h3><span className="rounded-full border border-violet-300/20 px-2 py-1 text-xs font-bold text-violet-100">{titleCase(path.recommendation)}</span></div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{path.explanation}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{Object.entries(path.factors).filter(([, value]) => value).map(([key, value]) => <div key={key} className="rounded-lg bg-white/[0.035] p-3"><dt className="text-xs font-bold uppercase text-slate-500">{titleCase(key)}</dt><dd className="mt-1 text-slate-200">{value}</dd></div>)}</dl>
          <p className="mt-3 text-xs text-slate-500">Effective date: {path.sourceEffectiveOn || "Not supplied"} · Retrieved: {path.sourceRetrievedAt ? displayDate(path.sourceRetrievedAt) : "Not recorded"} · Freshness: {path.freshness} · Jurisdiction: {path.jurisdiction || "Not recorded"}</p>
          {path.sourceUrl ? <a className="mt-2 inline-flex break-all text-xs font-bold text-cyan-200" href={path.sourceUrl} target="_blank" rel="noreferrer">{path.sourceName || "Open source"}</a> : null}
        </article>)}</div> : <p className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-slate-400">No candidate paths are saved. Add at least two routes before choosing a preferred path.</p>}
        <form className="mt-5 grid gap-3 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] p-4 md:grid-cols-2" onSubmit={savePath}>
          <h3 className="font-black text-white md:col-span-2">Add a candidate path</h3>
          <label className="grid gap-1 text-sm text-slate-300">Path title<input className="beast-input" required value={pathDraft.title} onChange={(event) => setPathDraft((current) => ({ ...current, title: event.target.value }))} /></label>
          <label className="grid gap-1 text-sm text-slate-300">Path type<select className="beast-input" value={pathDraft.pathType} onChange={(event) => setPathDraft((current) => ({ ...current, pathType: event.target.value }))}>{["promotion", "federal", "contractor", "private_sector", "college", "graduate_degree", "certification", "trade", "licensure", "entrepreneurship", "alternative_occupation", "other"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
          <label className="grid gap-1 text-sm text-slate-300 md:col-span-2">Linked Beast Goal<select className="beast-input" value={pathDraft.goalId} onChange={(event) => setPathDraft((current) => ({ ...current, goalId: event.target.value }))}><option value="">No goal selected</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title} · {goal.status}</option>)}</select></label>
          <label className="grid gap-1 text-sm text-slate-300">Estimated time<input className="beast-input" value={pathDraft.time} onChange={(event) => setPathDraft((current) => ({ ...current, time: event.target.value }))} /></label>
          <label className="grid gap-1 text-sm text-slate-300">Estimated cost<input className="beast-input" value={pathDraft.cost} onChange={(event) => setPathDraft((current) => ({ ...current, cost: event.target.value }))} /></label>
          <label className="grid gap-1 text-sm text-slate-300">Why it may fit<textarea className="beast-input" value={pathDraft.rationale} onChange={(event) => setPathDraft((current) => ({ ...current, rationale: event.target.value }))} /></label>
          <label className="grid gap-1 text-sm text-slate-300">Risks or unknowns<textarea className="beast-input" value={pathDraft.risk} onChange={(event) => setPathDraft((current) => ({ ...current, risk: event.target.value }))} /></label>
          <button className="beast-button-primary w-fit md:col-span-2" type="submit">Save candidate path</button>
        </form>
      </section>

      <section id="roadmap" className="rounded-2xl border border-white/10 bg-[#111827] p-4 sm:p-6" aria-labelledby="roadmap-heading">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-indigo-200">Living Roadmap</p>
        <h2 id="roadmap-heading" className="mt-2 text-2xl font-black text-white">Member-approved steps that can change with life</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Material Guidance Counselor changes remain pending until you approve them. Roadmaps are versioned, pausable, resumable, reorderable, and archivable.</p>
        <div className="mt-5 grid gap-4">{roadmaps.map((roadmap) => <article key={roadmap.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black text-white">{roadmap.title}</h3><p className="mt-1 text-xs font-bold uppercase text-indigo-200">{roadmap.status} · Version {roadmap.version} · {roadmap.progress}%</p></div><div className="flex flex-wrap gap-2">{roadmap.status !== "active" ? <button className="beast-button-secondary" type="button" onClick={() => void transitionRoadmap(roadmap, "active")}>{roadmap.status === "paused" ? "Resume" : "Approve & activate"}</button> : <button className="beast-button-secondary" type="button" onClick={() => void transitionRoadmap(roadmap, "paused")}>Pause</button>}<button className="text-sm font-bold text-red-200" type="button" onClick={() => void transitionRoadmap(roadmap, "archived")}>Archive</button></div></div>
          <dl className="mt-4 grid gap-3 md:grid-cols-3"><div><dt className="text-xs font-bold uppercase text-slate-500">Destination</dt><dd className="mt-1 text-sm text-slate-200">{roadmap.destination || "Not defined"}</dd></div><div><dt className="text-xs font-bold uppercase text-slate-500">Starting point</dt><dd className="mt-1 text-sm text-slate-200">{roadmap.starting_point || "Not defined"}</dd></div><div><dt className="text-xs font-bold uppercase text-slate-500">Gap summary</dt><dd className="mt-1 text-sm text-slate-200">{roadmap.gap_summary || "Not assessed"}</dd></div></dl>
          {roadmap.pending_material_change ? <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">A material counselor proposal is waiting for your review. Activating it creates the next version.</p> : null}
          <ol className="mt-4 grid gap-2">{steps.filter((step) => step.roadmap_id === roadmap.id).map((step, index, siblings) => <li key={step.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3"><span className="font-black text-indigo-200">{index + 1}</span><div className="min-w-0"><p className="break-words font-bold text-white">{step.title}</p><p className="mt-1 text-xs text-slate-500">{titleCase(step.status)} · Target {step.target_date || "not set"}</p></div><div className="flex gap-1"><button type="button" disabled={index === 0} aria-label={`Move ${step.title} earlier`} className="h-9 w-9 rounded-lg border border-white/10 disabled:opacity-30" onClick={() => void moveStep(step, -1)}>↑</button><button type="button" disabled={index === siblings.length - 1} aria-label={`Move ${step.title} later`} className="h-9 w-9 rounded-lg border border-white/10 disabled:opacity-30" onClick={() => void moveStep(step, 1)}>↓</button></div></li>)}</ol>
        </article>)}</div>
        {!roadmaps.length ? <p className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-slate-400">No roadmap exists yet. Create a draft; it does not become authoritative until you approve it.</p> : null}
        <div className="mt-5 grid gap-4 lg:grid-cols-2"><form className="grid gap-3 rounded-xl border border-indigo-300/15 bg-indigo-300/[0.04] p-4" onSubmit={saveRoadmap}><h3 className="font-black text-white">Create roadmap draft</h3><label className="grid gap-1 text-sm text-slate-300">Linked Beast Goal<select className="beast-input" value={roadmapDraft.goalId} onChange={(event) => setRoadmapDraft((current) => ({ ...current, goalId: event.target.value }))}><option value="">No goal selected</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title} · {goal.status}</option>)}</select></label>{(["title", "destination", "startingPoint", "gapSummary"] as const).map((field) => <label key={field} className="grid gap-1 text-sm text-slate-300">{titleCase(field)}<textarea className="beast-input" required={field === "title"} value={roadmapDraft[field]} onChange={(event) => setRoadmapDraft((current) => ({ ...current, [field]: event.target.value }))} /></label>)}<button className="beast-button-primary w-fit" type="submit">Save draft</button></form><form className="grid content-start gap-3 rounded-xl border border-indigo-300/15 bg-indigo-300/[0.04] p-4" onSubmit={saveStep}><h3 className="font-black text-white">Add roadmap step</h3><label className="grid gap-1 text-sm text-slate-300">Roadmap<select className="beast-input" required value={stepDraft.roadmapId} onChange={(event) => setStepDraft((current) => ({ ...current, roadmapId: event.target.value }))}><option value="">Select roadmap</option>{roadmaps.map((roadmap) => <option key={roadmap.id} value={roadmap.id}>{roadmap.title}</option>)}</select></label><label className="grid gap-1 text-sm text-slate-300">Step<input className="beast-input" required value={stepDraft.title} onChange={(event) => setStepDraft((current) => ({ ...current, title: event.target.value }))} /></label><label className="grid gap-1 text-sm text-slate-300">Target date<input className="beast-input" type="date" value={stepDraft.targetDate} onChange={(event) => setStepDraft((current) => ({ ...current, targetDate: event.target.value }))} /></label><button className="beast-button-primary w-fit" type="submit">Add step</button></form></div>
      </section>

      <section id="research" className="rounded-2xl border border-white/10 bg-[#111827] p-4 sm:p-6" aria-labelledby="research-heading">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-green-200">Current Research</p><h2 id="research-heading" className="mt-2 text-2xl font-black text-white">Verify time-sensitive requirements</h2><p className="mt-2 text-sm leading-6 text-slate-300">Only this question is sent externally. Your private profile, salary, military history, goals, documents, and conversations stay inside Beast.</p>
        <form className="mt-4 grid gap-3" onSubmit={runResearch}><label className="grid gap-1 text-sm text-slate-300">Research question<textarea className="beast-input min-h-24" required maxLength={800} value={researchQuery} onChange={(event) => setResearchQuery(event.target.value)} placeholder="What are the current official requirements for…" /></label><label className="flex items-start gap-3 text-sm leading-6 text-slate-300"><input className="mt-1" type="checkbox" checked={researchConsent} onChange={(event) => setResearchConsent(event.target.checked)} />I approve sending only this question to the configured research provider for current web research.</label><button className="beast-button-primary w-fit" type="submit" disabled={researching}>{researching ? "Researching current sources…" : "Research current sources"}</button></form>
        {research ? <div className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4" role="status">{research.error ? <p className="text-sm text-amber-100">{research.error}</p> : <><div className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{research.answer}</div><h3 className="mt-4 font-black text-white">Sources</h3><ul className="mt-2 grid gap-2">{research.sources?.map((source) => <li key={source.url} className="rounded-lg bg-white/[0.035] p-3 text-xs text-slate-400"><a className="break-all font-bold text-cyan-200" href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p className="mt-1">{source.publisher} · Publication/effective date: {source.publicationOrEffectiveDate || "Not supplied"} · Retrieved {displayDate(source.retrievedAt)}</p><p className="mt-1">Jurisdiction: {source.jurisdiction || "Confirm on source"} · {source.primary ? "Primary/authoritative" : "Secondary—verify with authority"}</p><p className="mt-1">{source.limitations}</p></li>)}</ul></>}</div> : null}
      </section>

      <section id="documents" className="rounded-2xl border border-white/10 bg-[#111827] p-4 sm:p-6" aria-labelledby="documents-heading"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-200">Documents &amp; Evidence</p><h2 id="documents-heading" className="mt-2 text-2xl font-black text-white">Review before anything becomes authoritative</h2></div><Link className="beast-button-secondary" href="/dashboard/uploads?module=education">Open Education documents</Link></div>
        <form className="mt-5 grid gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4" onSubmit={extractDocument}><h3 className="font-black text-white">Analyze an uploaded document</h3><p className="text-sm leading-6 text-slate-400">Choose a document and provide its extracted text. Analysis runs locally and creates review proposals only; it never changes your profile automatically.</p><label className="grid gap-1 text-sm text-slate-300">Document<select className="beast-input" required value={documentDraft.documentId} onChange={(event) => setDocumentDraft((current) => ({ ...current, documentId: event.target.value }))}><option value="">Select uploaded document</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.title} ({document.file_name})</option>)}</select></label><label className="grid gap-1 text-sm text-slate-300">Document text<textarea className="beast-input min-h-28" required maxLength={250000} value={documentDraft.text} onChange={(event) => setDocumentDraft((current) => ({ ...current, text: event.target.value }))} placeholder="Paste text extracted from your résumé, transcript, credential, training record, or job announcement." /></label><label className="flex items-start gap-3 text-sm leading-6 text-slate-300"><input className="mt-1" type="checkbox" checked={documentDraft.consent} onChange={(event) => setDocumentDraft((current) => ({ ...current, consent: event.target.checked }))} />I authorize local extraction of proposed education and career information from this document. I understand every proposal still requires my review.</label><button className="beast-button-primary w-fit" type="submit" disabled={extracting}>{extracting ? "Analyzing…" : "Create review proposals"}</button></form>
        {extractions.length ? <ul className="mt-5 grid gap-3">{extractions.map((item) => <li key={item.id} className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="font-black text-white">{item.label}</p><p className="mt-1 text-sm text-slate-300">{item.value}</p><p className="mt-2 text-xs text-slate-500">Proposed {item.phase} / {titleCase(item.category)} · {item.confidence == null ? "Confidence unavailable" : `${Math.round(item.confidence * 100)}% confidence`}</p>{item.source_excerpt ? <blockquote className="mt-2 border-l-2 border-cyan-300/30 pl-3 text-xs text-slate-400">{item.source_excerpt}</blockquote> : null}<label className="mt-3 grid gap-1 text-xs text-slate-400">Optional merge target<select className="beast-input" value={mergeTargets[item.id] || ""} onChange={(event) => setMergeTargets((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">Choose existing profile item</option>{profile.map((profileItem) => <option key={profileItem.id} value={profileItem.id}>{profileItem.label} · {profileItem.value.slice(0, 80)}</option>)}</select></label><div className="mt-3 flex flex-wrap gap-2"><button className="beast-button-primary" type="button" onClick={() => void reviewExtraction(item, "approved")}>Accept as new</button><button className="beast-button-secondary" type="button" onClick={() => void editExtraction(item)}>Edit proposal</button><button className="beast-button-secondary" type="button" onClick={() => void reviewExtraction(item, "merged")}>Merge with selected</button><button className="beast-button-secondary" type="button" onClick={() => void reviewExtraction(item, "rejected")}>Reject</button></div></li>)}</ul> : <p className="mt-5 text-sm leading-6 text-slate-400">No document proposals await review. Uploaded evidence never changes this profile automatically.</p>}
      </section>

      <section id="outcomes" className="rounded-2xl border border-white/10 bg-[#111827] p-4 sm:p-6" aria-labelledby="outcomes-heading"><p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-200">Decision &amp; Outcome History</p><h2 id="outcomes-heading" className="mt-2 text-2xl font-black text-white">Learn from what happened without rewriting history</h2>
        {outcomes.length ? <ol className="mt-5 grid gap-3">{outcomes.map((outcome) => <li key={outcome.id} className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="font-black text-white">{outcome.title}</p><p className="mt-1 text-sm text-slate-300">{outcome.detail || "No additional detail recorded."}</p><p className="mt-2 text-xs text-slate-500">{titleCase(outcome.event_type)} · {displayDate(outcome.occurred_at)} · {titleCase(outcome.source_type)}</p></li>)}</ol> : <p className="mt-5 text-sm text-slate-400">No decisions or outcomes have been recorded yet.</p>}
        <form className="mt-5 grid gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4 md:grid-cols-2" onSubmit={saveOutcome}><label className="grid gap-1 text-sm text-slate-300">Event<select className="beast-input" value={outcomeDraft.eventType} onChange={(event) => setOutcomeDraft((current) => ({ ...current, eventType: event.target.value }))}>{["path_considered", "recommendation", "decision", "application", "enrollment", "credential_attempt", "credential_earned", "interview", "offer", "promotion", "rejection", "deferral", "direction_change", "reflection"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label><label className="grid gap-1 text-sm text-slate-300">Title<input className="beast-input" required value={outcomeDraft.title} onChange={(event) => setOutcomeDraft((current) => ({ ...current, title: event.target.value }))} /></label><label className="grid gap-1 text-sm text-slate-300 md:col-span-2">What happened and what did you learn?<textarea className="beast-input min-h-20" value={outcomeDraft.detail} onChange={(event) => setOutcomeDraft((current) => ({ ...current, detail: event.target.value }))} /></label><button className="beast-button-primary w-fit md:col-span-2" type="submit">Record outcome</button></form>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Shared BeastOS planning services"><Link className="rounded-xl border border-white/10 bg-white/[0.035] p-4 font-black text-white" href="/dashboard/goals?module=education">Goals <span aria-hidden="true">→</span></Link><Link className="rounded-xl border border-white/10 bg-white/[0.035] p-4 font-black text-white" href="/dashboard/uploads?module=education">Documents <span aria-hidden="true">→</span></Link><Link className="rounded-xl border border-white/10 bg-white/[0.035] p-4 font-black text-white" href="/dashboard/education/guidance-counselor">Discuss with Guidance Counselor <span aria-hidden="true">→</span></Link></section>
    </div>
  );
}
