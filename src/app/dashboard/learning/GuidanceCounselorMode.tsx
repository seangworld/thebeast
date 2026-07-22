"use client";

import { useMemo, useState } from "react";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { buildGuidanceCounselorRoadmap } from "@/lib/learning/guidanceCounselor";
import type { GuidanceGoalType } from "@/lib/learning/types";

const goalTypes: GuidanceGoalType[] = [
  "Career",
  "College path",
  "Certification",
  "Trade",
  "Promotion",
  "Skill goal",
];

export default function GuidanceCounselorMode() {
  const [goalType, setGoalType] = useState<GuidanceGoalType>("Career");
  const [futureGoal, setFutureGoal] = useState("Cybersecurity analyst");
  const roadmap = useMemo(
    () => buildGuidanceCounselorRoadmap({ goalType, futureGoal }),
    [goalType, futureGoal]
  );

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Guidance Counselor"
        title="Detailed planning workspace"
        description="Explore a goal with transparent assumptions, readiness signals, verified requirements, and one useful next step."
        action={<ModuleBadge module="learning" label={roadmap.previewLabel} />}
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-4 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
          <label className="block">
            <span className="text-xs font-bold uppercase text-[#7f8da3]">
              Goal type
            </span>
            <select
              className="mt-2 w-full rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold text-white outline-none transition focus:border-indigo-300/60"
              value={goalType}
              onChange={(event) =>
                setGoalType(event.target.value as GuidanceGoalType)
              }
            >
              {goalTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#7f8da3]">
              Goal
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-[#596579] focus:border-indigo-300/60"
              value={futureGoal}
              onChange={(event) => setFutureGoal(event.target.value)}
              placeholder="Career, college, certification, trade, promotion, or skill"
            />
          </label>

          <div className="rounded-xl border border-indigo-300/35 bg-indigo-300/10 p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Starting point
            </div>
            <p className="mt-2 text-sm leading-5 text-indigo-100">
              {roadmap.startingPoint}
            </p>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Learning readiness
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {roadmap.learningReadinessSignals.map((signal) => (
                <li
                  className="rounded-full border border-[#2a3242] bg-[#111827] px-3 py-1 text-xs font-bold text-[#c7cfdb]"
                  key={signal}
                >
                  {signal}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Roadmap
              </div>
              <h3 className="mt-2 text-2xl font-black text-white">
                {roadmap.title}
              </h3>
            </div>
            <span className="rounded-full border border-indigo-300/40 bg-indigo-300/10 px-3 py-1 text-xs font-bold text-indigo-100">
              {roadmap.estimatedTimeline}
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <RoadmapList
              title="Education or training"
              items={roadmap.requiredEducationOrTraining}
            />
            <RoadmapList title="Skills to build" items={roadmap.skillsToBuild} />
            <RoadmapList
              title="Suggested milestones"
              items={roadmap.suggestedMilestones}
            />
            <RoadmapList
              title="Questions to consider"
              items={roadmap.questionsToConsider}
            />
          </div>

          <div className="mt-5 rounded-xl border border-green-400/30 bg-green-400/10 p-4">
            <div className="text-xs font-bold uppercase text-green-100">
              Next recommended action
            </div>
            <p className="mt-2 text-sm font-semibold leading-5 text-green-100">
              {roadmap.nextRecommendedAction}
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <RoadmapList title="Assumptions" items={roadmap.assumptions} />
            <RoadmapList
              title="Planning boundaries"
              items={roadmap.planningBoundaries}
            />
          </div>

          <div className="mt-5 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Curriculum model
            </div>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {roadmap.curriculumFramework.hierarchy.join(" -> ")}
            </p>
            <p className="mt-3 text-sm leading-5 text-[#a5b4c7]">
              New subjects use the same objective pattern without a code
              change. Examples:{" "}
              {roadmap.curriculumFramework.exampleSubjects.join(", ")}.
            </p>
            <p className="mt-3 text-sm font-semibold leading-5 text-indigo-100">
              {roadmap.tutorFlowPrinciple}
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function RoadmapList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase text-[#7f8da3]">{title}</div>
      <ul className="mt-2 grid gap-2 text-sm leading-5 text-[#c7cfdb]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
