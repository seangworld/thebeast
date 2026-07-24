"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardCard, ModuleBadge, ProgressiveSaveStatus, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { ExternalResourceCard } from "@/app/components/design/ExternalResourceCard";
import { buildEducationGuidancePlan, educationDiscoveryQuestions, type EducationGoalKind, type EducationProfile, type EducationResourceProvider } from "@/lib/education";
import { useProgressiveSave } from "@/lib/platform/useProgressiveSave";
import { createClient } from "@/lib/supabase/client";
import {
  defaultEducationResourceProviders,
  educationProfileUpsert,
  type EducationProfileDraft,
} from "@/lib/education/profilePersistence";
import {
  beastEducationGen2ArchitectureRules,
  beastEducationGen2Vision,
} from "@/lib/education/gen2Vision";

const goalKinds: { value: EducationGoalKind; label: string }[] = [
  { value: "career", label: "Career planning" },
  { value: "education", label: "Education planning" },
  { value: "certification", label: "Certification planning" },
  { value: "skill", label: "Skill development" },
  { value: "personal-growth", label: "Personal growth" },
];

const providers = defaultEducationResourceProviders;

type EducationCommandCenterProps = {
  ownerId: string;
  initialProfile: EducationProfileDraft;
  loadError?: boolean;
};

export default function EducationCommandCenter({
  ownerId,
  initialProfile,
  loadError = false,
}: EducationCommandCenterProps) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [goalKind, setGoalKind] = useState<EducationGoalKind>(initialProfile.goalKind);
  const [goal, setGoal] = useState(initialProfile.goal);
  const [currentSituation, setCurrentSituation] = useState(initialProfile.currentSituation);
  const [background, setBackground] = useState(initialProfile.background);
  const [strengths, setStrengths] = useState(initialProfile.strengths);
  const [growthAreas, setGrowthAreas] = useState(initialProfile.growthAreas);
  const [constraints, setConstraints] = useState(initialProfile.constraints);
  const [weeklyHours, setWeeklyHours] = useState(initialProfile.weeklyHours);
  const [answers, setAnswers] = useState<Record<string, string>>(initialProfile.answers);
  const [selectedProviders, setSelectedProviders] = useState<EducationResourceProvider[]>(initialProfile.selectedProviders);
  useEffect(() => setHydrated(true), []);
  const profile: EducationProfile = useMemo(() => ({
    id: "education-profile-draft",
    ownerId: "current-user",
    currentSituation,
    educationHistory: background ? [background] : [],
    interests: goal ? [goal] : [],
    strengths: strengths.split(",").map((value) => value.trim()).filter(Boolean),
    weaknesses: growthAreas.split(",").map((value) => value.trim()).filter(Boolean),
    goals: goal ? [goal] : [],
    constraints: constraints.split(",").map((value) => value.trim()).filter(Boolean),
    preferredFormats: selectedProviders,
    weeklyHours,
  }), [background, constraints, currentSituation, goal, growthAreas, selectedProviders, strengths, weeklyHours]);
  const plan = useMemo(() => buildEducationGuidancePlan({
    profile,
    goalKind,
    goal,
    discoveryAnswers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
  }), [answers, goal, goalKind, profile]);
  const draft = useMemo(() => ({ goalKind, goal, currentSituation, background, strengths, growthAreas, constraints, weeklyHours, answers, selectedProviders }), [answers, background, constraints, currentSituation, goal, goalKind, growthAreas, selectedProviders, strengths, weeklyHours]);
  const saveDraft = useCallback(async (value: typeof draft) => {
    const supabase = createClient();
    const result = await supabase
      .from("education_profiles")
      .upsert(educationProfileUpsert(ownerId, value), { onConflict: "owner_id" })
      .select("owner_id")
      .single();
    if (result.error) {
      throw new Error("Save failed — retry. Your answers are still visible.");
    }
    router.refresh();
  }, [ownerId, router]);
  const saveState = useProgressiveSave({
    value: draft,
    save: saveDraft,
    delayMs: 800,
    enabled: hydrated,
  });

  const toggleProvider = (provider: EducationResourceProvider) => setSelectedProviders((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider]);

  if (!hydrated) {
    return (
      <DashboardCard accent="learning" className="overflow-hidden">
        <div className="grid gap-4" role="status" aria-busy="true">
          <p className="font-black text-white">Loading your Education Profile…</p>
          <div className="h-12 animate-pulse rounded-xl bg-white/[0.07]" />
          <div className="h-24 animate-pulse rounded-xl bg-white/[0.05]" />
        </div>
      </DashboardCard>
    );
  }

  if (loadError) {
    return (
      <DashboardCard accent="learning" className="overflow-hidden">
        <div role="alert">
          <p className="font-black text-white">
            We couldn’t load your saved Education Profile.
          </p>
          <p className="mt-2 text-sm text-[#aeb9ca]">
            Your saved answers were not replaced. Retry before making changes.
          </p>
          <button
            type="button"
            className="beast-button-secondary mt-4"
            onClick={() => router.refresh()}
          >
            Retry profile load
          </button>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard accent="learning" className="overflow-hidden">
      <SectionHeader
        eyebrow="Primary AI relationship"
        title="Guidance Counselor"
        description="Discover what fits, understand the gap, compare credible paths, and keep moving toward educational, professional, and personal growth."
        action={<ModuleBadge module="learning" label="Guidance first" />}
      />

      <section
        className="mt-5 rounded-xl border border-indigo-300/25 bg-indigo-300/5 p-4"
        aria-labelledby="beasteducation-gen2-focus"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-indigo-200">
              BE-201 · Gen2 vision
            </div>
            <h2 id="beasteducation-gen2-focus" className="mt-2 text-xl font-black text-white">
              Guidance for the whole educational journey
            </h2>
          </div>
          <span className="w-fit rounded-full border border-indigo-300/30 bg-indigo-300/10 px-3 py-1 text-xs font-black text-indigo-100">
            {beastEducationGen2Vision.primaryProfessional}
          </span>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[#c7cfdb]">
          {beastEducationGen2Vision.productPromise}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {beastEducationGen2Vision.focus.map((focus) => (
            <article
              key={focus.id}
              id={focus.id}
              className="scroll-mt-24 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <h3 className="font-black text-white">{focus.title}</h3>
              <p className="mt-2 text-sm leading-5 text-[#aeb9ca]">
                {focus.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="grid content-start gap-4 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-200">Education Profile</div>
            <p className="mt-2 text-sm leading-6 text-[#aeb9ca]">Tell the Counselor enough to guide well. You can start small and refine the profile over time.</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <ProgressiveSaveStatus {...saveState} />
              <button
                type="button"
                className="beast-button-secondary min-h-10 px-4 py-2 text-xs"
                disabled={saveState.status === "saving"}
                onClick={() => void saveState.saveNow()}
              >
                {saveState.status === "error" ? "Retry save" : "Save profile"}
              </button>
            </div>
          </div>
          <label className="grid gap-2 text-xs font-bold uppercase text-[#8d9aae]">Where would you like your life or career to go?
            <input className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold normal-case text-white" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="It is okay if you are still figuring this out" />
          </label>
          <label className="grid gap-2 text-xs font-bold uppercase text-[#8d9aae]">Planning focus
            <select className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold normal-case text-white" value={goalKind} onChange={(event) => setGoalKind(event.target.value as EducationGoalKind)}>{goalKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select>
          </label>
          <label className="grid gap-2 text-xs font-bold uppercase text-[#8d9aae]">Current situation
            <textarea className="min-h-20 min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-medium normal-case text-white" value={currentSituation} onChange={(event) => setCurrentSituation(event.target.value)} placeholder="Work, education, responsibilities, and where you are starting" />
          </label>
          <label className="grid gap-2 text-xs font-bold uppercase text-[#8d9aae]">Education, certifications, work, or military experience
            <textarea className="min-h-20 min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-medium normal-case text-white" value={background} onChange={(event) => setBackground(event.target.value)} placeholder="Share only what would help shape your path" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-2 text-xs font-bold uppercase text-[#8d9aae]">Strengths
              <input className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-medium normal-case text-white" value={strengths} onChange={(event) => setStrengths(event.target.value)} placeholder="Comma separated" />
            </label>
            <label className="grid min-w-0 gap-2 text-xs font-bold uppercase text-[#8d9aae]">Weekly hours
              <input type="number" min="0" max="168" className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-medium normal-case text-white" value={weeklyHours} onChange={(event) => setWeeklyHours(Math.max(0, Math.min(168, Number(event.target.value) || 0)))} />
            </label>
          </div>
          <label className="grid gap-2 text-xs font-bold uppercase text-[#8d9aae]">Skills or areas you want to strengthen
            <input className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-medium normal-case text-white" value={growthAreas} onChange={(event) => setGrowthAreas(event.target.value)} placeholder="Comma separated" />
          </label>
          <label className="grid gap-2 text-xs font-bold uppercase text-[#8d9aae]">Constraints
            <input className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-medium normal-case text-white" value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Time, cost, location, accessibility, family" />
          </label>
          <div>
            <div className="text-xs font-bold uppercase text-[#8d9aae]">Preferred resource sources</div>
            <div className="mt-2 flex flex-wrap gap-2">{providers.map((provider) => <button type="button" key={provider} aria-pressed={selectedProviders.includes(provider)} onClick={() => toggleProvider(provider)} className={`rounded-full border px-3 py-2 text-xs font-bold ${selectedProviders.includes(provider) ? "border-indigo-300/50 bg-indigo-300/15 text-indigo-100" : "border-[#2a3242] text-[#8d9aae]"}`}>{provider}</button>)}</div>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-xl border border-indigo-300/30 bg-indigo-300/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase text-indigo-200">Counselor recommendation</div><h2 className="mt-2 text-2xl font-black text-white">{plan.goal}</h2></div><span className="rounded-full border border-indigo-300/30 px-3 py-1 text-xs font-bold text-indigo-100">{plan.discoveryComplete ? "Profile ready" : "Discovery in progress"}</span></div>
            <p className="mt-3 text-sm leading-6 text-indigo-100">{plan.summary}</p>
            <div className="mt-4 rounded-lg bg-[#0f1419]/70 p-4"><div className="text-xs font-bold uppercase text-green-200">Next useful step</div><p className="mt-2 font-semibold text-green-100">{plan.nextAction}</p></div>
          </div>
          {!plan.discoveryComplete ? <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"><div className="text-xs font-bold uppercase text-[#8d9aae]">Discovery onboarding</div><div className="mt-3 grid gap-3">{educationDiscoveryQuestions.map((question) => <label key={question.id} className="grid gap-2 text-sm font-semibold text-[#c7cfdb]">{question.prompt}<input className="min-w-0 rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-normal text-white" value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} /></label>)}</div></div> : null}
          <div className="grid gap-3 md:grid-cols-2">{plan.roadmap.map((milestone) => <article key={milestone.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"><div className="text-xs font-bold uppercase text-[#8d9aae]">{milestone.horizon} · {milestone.status}</div><h3 className="mt-2 font-black text-white">{milestone.title}</h3><p className="mt-2 text-sm leading-5 text-[#aeb9ca]">{milestone.reason}</p></article>)}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"><div className="text-xs font-bold uppercase text-[#8d9aae]">Skill analysis</div><h3 className="mt-2 text-lg font-black text-white">Strengths, gaps, and evidence</h3><PlanList title="Current strengths" items={plan.skillAnalysis.currentStrengths} empty="Add strengths to the Education Profile." /><PlanList title="Skills to build" items={plan.skillAnalysis.skillsToBuild} /><PlanList title="Evidence to collect" items={plan.skillAnalysis.evidenceNeeded} /></div>
        <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"><div className="text-xs font-bold uppercase text-[#8d9aae]">External resource recommendations</div><p className="mt-2 text-sm text-[#aeb9ca]">Explore providers without turning BeastEducation into another course catalog.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{plan.resources.map((resource) => <ExternalResourceCard key={resource.id} recommendation={resource} />)}</div></div>
      </div>
      <div className="mt-5 rounded-xl border border-green-400/25 bg-green-400/10 p-4">
        <div className="text-xs font-bold uppercase text-green-100">
          Supporting capabilities stay available
        </div>
        <p className="mt-2 text-sm leading-6 text-green-100">
          {plan.teachingSupport}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {beastEducationGen2Vision.supportingCapabilities.map((capability) => (
            <div
              key={capability.id}
              className="rounded-lg border border-green-200/20 bg-[#0f1419]/60 p-3"
            >
              <div className="text-sm font-black text-white">{capability.title}</div>
              <p className="mt-1 text-xs leading-5 text-green-100">
                {capability.positioning}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs font-semibold leading-5 text-green-100">
          {beastEducationGen2ArchitectureRules[1]}
        </p>
      </div>
    </DashboardCard>
  );
}

function PlanList({ title, items, empty = "The Guidance Counselor will refine this after discovery." }: { title: string; items: readonly string[]; empty?: string }) {
  return <div className="mt-4"><div className="text-xs font-bold uppercase text-[#8d9aae]">{title}</div><ul className="mt-2 grid gap-2 text-sm text-[#c7cfdb]">{items.length ? items.map((item) => <li key={item}>• {item}</li>) : <li>{empty}</li>}</ul></div>;
}
