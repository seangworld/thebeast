"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { generateLearningPlan } from "@/lib/learning/planGenerator";
import type {
  LearningGoalBuilderDraft,
  LearningGoalBuilderStatus,
} from "@/lib/learning/types";

const STORAGE_KEY = "beastos.learning.goalBuilder.v1";

const emptyDraft: LearningGoalBuilderDraft = {
  learningObjective: "",
  motivation: "",
  targetOutcome: "",
  timeline: "",
  currentLevel: "",
  studyPace: "",
};

const fieldClasses =
  "mt-2 w-full rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-[#596579] focus:border-indigo-300/60 focus:bg-[#111827]";

function getDraftStatus(
  draft: LearningGoalBuilderDraft,
  completed: boolean
): LearningGoalBuilderStatus {
  if (completed) return "completed";

  return Object.values(draft).some((value) => value.trim().length > 0)
    ? "active"
    : "empty";
}

function isDraftComplete(draft: LearningGoalBuilderDraft) {
  return Object.values(draft).every((value) => value.trim().length > 0);
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-[#7f8da3]">{label}</span>
      {children}
    </label>
  );
}

export default function LearningGoalBuilder() {
  const [draft, setDraft] = useState<LearningGoalBuilderDraft>(emptyDraft);
  const [completed, setCompleted] = useState(false);
  const status = useMemo(() => getDraftStatus(draft, completed), [draft, completed]);
  const generatedPlan = useMemo(
    () => (completed ? generateLearningPlan(draft) : null),
    [completed, draft]
  );
  const ready = isDraftComplete(draft);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        draft?: LearningGoalBuilderDraft;
        completed?: boolean;
      };

      if (parsed.draft) {
        setDraft({
          ...emptyDraft,
          ...parsed.draft,
        });
      }

      setCompleted(Boolean(parsed.completed));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ draft, completed })
    );
  }, [draft, completed]);

  function updateDraft(field: keyof LearningGoalBuilderDraft, value: string) {
    setCompleted(false);
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetDraft() {
    setDraft(emptyDraft);
    setCompleted(false);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function completeDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    setCompleted(true);
  }

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Goal Builder"
        title="Create a learning goal"
        description="A local first-pass builder for shaping what to learn, why it matters, and how the study rhythm should feel."
        action={
          <ModuleBadge
            module="learning"
            label={
              status === "completed"
                ? "Completed"
                : status === "active"
                  ? "Active"
                  : "Empty"
            }
          />
        }
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <form className="grid gap-4" onSubmit={completeDraft}>
          <FieldLabel label="What do you want to learn?">
            <input
              className={fieldClasses}
              value={draft.learningObjective}
              onChange={(event) =>
                updateDraft("learningObjective", event.target.value)
              }
              placeholder="Security+, Spanish, algebra, woodworking"
            />
          </FieldLabel>

          <FieldLabel label="Why do you want to learn it?">
            <textarea
              className={`${fieldClasses} min-h-24 resize-y`}
              value={draft.motivation}
              onChange={(event) => updateDraft("motivation", event.target.value)}
              placeholder="Career move, family support, confidence, curiosity"
            />
          </FieldLabel>

          <div className="grid gap-4 lg:grid-cols-2">
            <FieldLabel label="Target outcome">
              <input
                className={fieldClasses}
                value={draft.targetOutcome}
                onChange={(event) =>
                  updateDraft("targetOutcome", event.target.value)
                }
                placeholder="Pass exam, finish course, build project"
              />
            </FieldLabel>

            <FieldLabel label="Timeline">
              <input
                className={fieldClasses}
                value={draft.timeline}
                onChange={(event) => updateDraft("timeline", event.target.value)}
                placeholder="30 days, 8 weeks, this semester"
              />
            </FieldLabel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FieldLabel label="Current level">
              <select
                className={fieldClasses}
                value={draft.currentLevel}
                onChange={(event) =>
                  updateDraft("currentLevel", event.target.value)
                }
              >
                <option value="">Select level</option>
                <option value="Brand new">Brand new</option>
                <option value="Beginner">Beginner</option>
                <option value="Some experience">Some experience</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </FieldLabel>

            <FieldLabel label="Preferred study pace">
              <select
                className={fieldClasses}
                value={draft.studyPace}
                onChange={(event) => updateDraft("studyPace", event.target.value)}
              >
                <option value="">Select pace</option>
                <option value="Light: 2 sessions per week">
                  Light: 2 sessions per week
                </option>
                <option value="Steady: 3-4 sessions per week">
                  Steady: 3-4 sessions per week
                </option>
                <option value="Focused: 5 sessions per week">
                  Focused: 5 sessions per week
                </option>
                <option value="Intensive: daily">Intensive: daily</option>
              </select>
            </FieldLabel>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!ready}
              className="rounded-xl border border-indigo-300/45 bg-indigo-300/15 px-4 py-3 text-sm font-black text-indigo-100 transition hover:bg-indigo-300/20 disabled:cursor-not-allowed disabled:border-[#2a3242] disabled:bg-[#111827] disabled:text-[#7f8da3]"
            >
              Generate Starter Plan
            </button>
            <button
              type="button"
              onClick={resetDraft}
              className="rounded-xl border border-[#2a3242] bg-[#0f1419] px-4 py-3 text-sm font-black text-[#c7cfdb] transition hover:border-indigo-300/45 hover:text-white"
            >
              Clear Draft
            </button>
          </div>
        </form>

        <div
          className={`rounded-xl border p-4 ${
            status === "completed"
              ? "border-green-400/35 bg-green-400/10"
              : status === "active"
                ? "border-indigo-300/45 bg-indigo-300/10"
                : "border-[#2a3242] bg-[#111827]"
          }`}
        >
          <div className="text-xs font-bold uppercase text-[#7f8da3]">
            {status === "completed"
              ? "Completed goal draft"
              : status === "active"
                ? "Active draft"
                : "Empty state"}
          </div>
          <h3 className="mt-2 text-xl font-black text-white">
            {draft.learningObjective || "No goal drafted yet"}
          </h3>
          <div className="mt-4 grid gap-3 text-sm leading-5 text-[#c7cfdb]">
            <p>
              <span className="font-bold text-white">Why: </span>
              {draft.motivation || "Add the reason this matters."}
            </p>
            <p>
              <span className="font-bold text-white">Outcome: </span>
              {draft.targetOutcome || "Define the finish line."}
            </p>
            <p>
              <span className="font-bold text-white">Timeline: </span>
              {draft.timeline || "Choose a target window."}
            </p>
            <p>
              <span className="font-bold text-white">Starting point: </span>
              {draft.currentLevel || "Pick a current level."}
            </p>
            <p>
              <span className="font-bold text-white">Pace: </span>
              {draft.studyPace || "Choose a study rhythm."}
            </p>
          </div>
        </div>

        {generatedPlan ? (
          <div className="rounded-xl border border-indigo-300/45 bg-[#111827] p-4 xl:col-start-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Generated starter plan
              </div>
              <span className="rounded-full border border-green-400/35 bg-green-400/10 px-2 py-1 text-xs font-bold text-green-100">
                {generatedPlan.readinessSignal.label}
              </span>
            </div>
            <h3 className="mt-2 text-xl font-black text-white">
              {generatedPlan.title}
            </h3>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {generatedPlan.readinessSignal.summary}
            </p>

            <div className="mt-4 grid gap-4">
              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Milestones
                </div>
                <ul className="mt-2 grid gap-2 text-sm leading-5 text-[#c7cfdb]">
                  {generatedPlan.milestones.map((milestone) => (
                    <li key={milestone}>{milestone}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Recommended sessions
                </div>
                <div className="mt-2 grid gap-2">
                  {generatedPlan.recommendedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3"
                    >
                      <div className="flex flex-wrap justify-between gap-2 text-xs font-bold uppercase text-[#7f8da3]">
                        <span>{session.cadence}</span>
                        <span>{session.duration}</span>
                      </div>
                      <div className="mt-1 font-black text-white">
                        {session.title}
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">
                        {session.focus}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Weekly rhythm
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {generatedPlan.weeklyRhythm.map((rhythm) => (
                    <span
                      key={rhythm}
                      className="rounded-full border border-indigo-300/30 bg-indigo-300/10 px-3 py-1 text-xs font-bold text-indigo-100"
                    >
                      {rhythm}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Skill checkpoints
                </div>
                <ul className="mt-2 grid gap-2 text-sm leading-5 text-[#c7cfdb]">
                  {generatedPlan.skillCheckpoints.map((checkpoint) => (
                    <li key={checkpoint}>{checkpoint}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-green-400/30 bg-green-400/10 p-3 text-sm font-bold leading-5 text-green-100">
                {generatedPlan.suggestedNextAction}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardCard>
  );
}
