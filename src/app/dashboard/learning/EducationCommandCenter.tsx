"use client";

import { useCallback, useMemo, useState } from "react";
import { DashboardCard, ModuleBadge, ProgressiveSaveStatus, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { ExternalResourceCard } from "@/app/components/design/ExternalResourceCard";
import { buildEducationGuidancePlan, educationDiscoveryQuestions, type EducationGoalKind, type EducationProfile, type EducationResourceProvider } from "@/lib/education";
import { externalResourceProviders } from "@/lib/platform/externalResources";
import { useProgressiveSave } from "@/lib/platform/useProgressiveSave";
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

const providers = externalResourceProviders.list().map((provider) => provider.name === "Certification providers" ? "Certifications" : provider.name) as EducationResourceProvider[];

export default function EducationCommandCenter() {
  const [goalKind, setGoalKind] = useState<EducationGoalKind>("career");
  const [goal, setGoal] = useState("");
  const [currentSituation, setCurrentSituation] = useState("");
  const [background, setBackground] = useState("");
  const [strengths, setStrengths] = useState("");
  const [growthAreas, setGrowthAreas] = useState("");
  const [constraints, setConstraints] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedProviders, setSelectedProviders] = useState<EducationResourceProvider[]>(providers);
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
    window.localStorage.setItem("beast-education-progressive-draft", JSON.stringify(value));
  }, []);
  const saveState = useProgressiveSave({ value: draft, save: saveDraft });

  const toggleProvider = (provider: EducationResourceProvider) => setSelectedProviders((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider]);

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
            <div className="mt-2"><ProgressiveSaveStatus {...saveState} /></div>
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
              <input type="number" min="1" max="80" className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-medium normal-case text-white" value={weeklyHours} onChange={(event) => setWeeklyHours(Number(event.target.value) || 1)} />
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
