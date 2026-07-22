"use client";

import { useMemo, useState } from "react";
import { DashboardCard, ModuleBadge, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { buildEducationGuidancePlan, educationDiscoveryQuestions, type EducationGoalKind, type EducationProfile, type EducationResourceProvider } from "@/lib/education";

const goalKinds: { value: EducationGoalKind; label: string }[] = [
  { value: "career", label: "Career planning" },
  { value: "education", label: "Education planning" },
  { value: "certification", label: "Certification planning" },
  { value: "skill", label: "Skill development" },
  { value: "personal-growth", label: "Personal growth" },
];

const providers: EducationResourceProvider[] = ["YouTube", "Khan Academy", "Coursera", "Microsoft Learn", "Books", "Certifications"];

export default function EducationCommandCenter() {
  const [goalKind, setGoalKind] = useState<EducationGoalKind>("career");
  const [goal, setGoal] = useState("Cybersecurity analyst");
  const [currentSituation, setCurrentSituation] = useState("");
  const [strengths, setStrengths] = useState("");
  const [constraints, setConstraints] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedProviders, setSelectedProviders] = useState<EducationResourceProvider[]>(providers);
  const profile: EducationProfile = useMemo(() => ({
    id: "education-profile-draft",
    ownerId: "current-user",
    currentSituation,
    interests: goal ? [goal] : [],
    strengths: strengths.split(",").map((value) => value.trim()).filter(Boolean),
    goals: goal ? [goal] : [],
    constraints: constraints.split(",").map((value) => value.trim()).filter(Boolean),
    preferredFormats: selectedProviders,
    weeklyHours,
  }), [constraints, currentSituation, goal, selectedProviders, strengths, weeklyHours]);
  const plan = useMemo(() => buildEducationGuidancePlan({
    profile,
    goalKind,
    goal,
    discoveryAnswers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
  }), [answers, goal, goalKind, profile]);

  const toggleProvider = (provider: EducationResourceProvider) => setSelectedProviders((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider]);

  return (
    <DashboardCard accent="learning" className="overflow-hidden">
      <SectionHeader
        eyebrow="Primary AI relationship"
        title="Guidance Counselor"
        description="Discover what fits, understand the gap, compare credible paths, and keep moving toward educational, professional, and personal growth."
        action={<ModuleBadge module="learning" label="Guidance first" />}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="grid content-start gap-4 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-200">Education Profile</div>
            <p className="mt-2 text-sm leading-6 text-[#aeb9ca]">Tell the Counselor enough to guide well. You can start small and refine the profile over time.</p>
          </div>
          <label className="grid gap-2 text-xs font-bold uppercase text-[#8d9aae]">What are you working toward?
            <input className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold normal-case text-white" value={goal} onChange={(event) => setGoal(event.target.value)} />
          </label>
          <label className="grid gap-2 text-xs font-bold uppercase text-[#8d9aae]">Planning focus
            <select className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold normal-case text-white" value={goalKind} onChange={(event) => setGoalKind(event.target.value as EducationGoalKind)}>{goalKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select>
          </label>
          <label className="grid gap-2 text-xs font-bold uppercase text-[#8d9aae]">Current situation
            <textarea className="min-h-20 min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-medium normal-case text-white" value={currentSituation} onChange={(event) => setCurrentSituation(event.target.value)} placeholder="Work, education, responsibilities, and where you are starting" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-2 text-xs font-bold uppercase text-[#8d9aae]">Strengths
              <input className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-medium normal-case text-white" value={strengths} onChange={(event) => setStrengths(event.target.value)} placeholder="Comma separated" />
            </label>
            <label className="grid min-w-0 gap-2 text-xs font-bold uppercase text-[#8d9aae]">Weekly hours
              <input type="number" min="1" max="80" className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-medium normal-case text-white" value={weeklyHours} onChange={(event) => setWeeklyHours(Number(event.target.value) || 1)} />
            </label>
          </div>
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
        <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"><div className="text-xs font-bold uppercase text-[#8d9aae]">External resource recommendations</div><p className="mt-2 text-sm text-[#aeb9ca]">Explore providers without turning BeastEducation into another course catalog.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{plan.resources.map((resource) => <a key={resource.provider} href={resource.url} target="_blank" rel="noreferrer" className="min-w-0 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4 transition hover:border-indigo-300/40"><div className="text-xs font-bold uppercase text-indigo-200">{resource.provider} · {resource.cost}</div><h3 className="mt-2 font-black text-white">{resource.title}</h3><p className="mt-2 text-sm leading-5 text-[#aeb9ca]">{resource.reason}</p><p className="mt-2 text-xs leading-5 text-[#78869a]">{resource.verificationNote}</p></a>)}</div></div>
      </div>
      <div className="mt-5 rounded-xl border border-green-400/25 bg-green-400/10 p-4"><div className="text-xs font-bold uppercase text-green-100">Teaching supports the plan</div><p className="mt-2 text-sm leading-6 text-green-100">{plan.teachingSupport}</p></div>
    </DashboardCard>
  );
}

function PlanList({ title, items, empty = "The Guidance Counselor will refine this after discovery." }: { title: string; items: readonly string[]; empty?: string }) {
  return <div className="mt-4"><div className="text-xs font-bold uppercase text-[#8d9aae]">{title}</div><ul className="mt-2 grid gap-2 text-sm text-[#c7cfdb]">{items.length ? items.map((item) => <li key={item}>• {item}</li>) : <li>{empty}</li>}</ul></div>;
}
