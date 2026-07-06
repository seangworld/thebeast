"use client";

import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildLessonEngineDefinition,
  getLessonEngineProgress,
} from "@/lib/learning/lessonEngine";
import type { LearningActivityRunnerRow } from "@/lib/learning/activityRunner";

type LessonEngineProps = {
  activity: LearningActivityRunnerRow;
  courseTitle: string;
  checkedPhases: Record<string, boolean>;
  reflection: string;
  confidence: string;
  saving: boolean;
  completed: boolean;
  onPhaseChange: (phaseId: string, checked: boolean) => void;
  onReflectionChange: (value: string) => void;
  onConfidenceChange: (value: string) => void;
  onComplete: () => void;
};

export function LessonEngine({
  activity,
  courseTitle,
  checkedPhases,
  reflection,
  confidence,
  saving,
  completed,
  onPhaseChange,
  onReflectionChange,
  onConfidenceChange,
  onComplete,
}: LessonEngineProps) {
  const engine = buildLessonEngineDefinition(activity);
  const progress = getLessonEngineProgress({
    checkedPhases,
    phaseCount: engine.phases.length,
    reflection,
  });
  const readyToComplete = completed || progress.readyToComplete;
  const displayedCompletedSteps = completed
    ? progress.requiredSteps
    : progress.completedSteps;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Engine"
          value={engine.activityType}
          detail={courseTitle}
          icon="E"
          tone="purple"
        />
        <MetricTile
          label="Progress"
          value={`${completed ? 100 : progress.percent}%`}
          detail={`${displayedCompletedSteps} of ${progress.requiredSteps} steps`}
          icon="P"
          tone="green"
        />
        <MetricTile
          label="Time"
          value={`${activity.estimated_minutes} min`}
          detail={activity.difficulty}
          icon="T"
          tone="blue"
        />
        <MetricTile
          label="XP"
          value={String(activity.xp)}
          detail={activity.status}
          icon="XP"
          tone="yellow"
        />
      </section>

      <DashboardCard accent="learning">
        <SectionHeader
          eyebrow="Learning Engine"
          title={engine.title}
          description={engine.summary}
          action={<ModuleBadge module="learning" label={engine.activityType} />}
        />
        <div className="mt-5 grid gap-3">
          {engine.phases.map((phase, index) => {
            const checked = completed || Boolean(checkedPhases[phase.id]);

            return (
              <label
                key={phase.id}
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  checked
                    ? "border-green-400/35 bg-green-400/10"
                    : "border-[#2a3242] bg-[#111827]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={completed}
                  onChange={(event) =>
                    onPhaseChange(phase.id, event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-indigo-300"
                />
                <span>
                  <span className="text-xs font-bold uppercase text-[#7f8da3]">
                    {index + 1}. {phase.label}
                  </span>
                  <span className="mt-1 block font-black text-white">
                    {phase.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[#c7cfdb]">
                    {phase.prompt}
                  </span>
                  <span className="mt-2 block text-xs font-bold uppercase text-indigo-100">
                    Check: {phase.check}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </DashboardCard>

      <DashboardCard accent="purple">
        <SectionHeader
          eyebrow="Reflection"
          title="Teach Beast what changed"
          description={engine.reflectionPrompt}
        />
        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-[#c7cfdb]">
              Reflection
            </span>
            <textarea
              value={reflection}
              onChange={(event) => onReflectionChange(event.target.value)}
              disabled={completed}
              rows={5}
              className="beast-input mt-2 min-h-32 resize-y"
              placeholder="Write one sentence about what clicked, what was hard, or what Beast should remember."
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#c7cfdb]">
              Confidence
            </span>
            <select
              value={confidence}
              onChange={(event) => onConfidenceChange(event.target.value)}
              disabled={completed}
              className="beast-input mt-2"
            >
              <option>Still building</option>
              <option>Getting clearer</option>
              <option>Ready for more</option>
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onComplete}
              disabled={saving || completed || !readyToComplete}
              className="beast-button disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : completed
                  ? "Completed"
                  : engine.completionLabel}
            </button>
            <p className="text-sm font-semibold text-[#9aa7b8]">
              {completed
                ? "This activity is complete."
                : `${displayedCompletedSteps} of ${progress.requiredSteps} engine steps complete - Confidence: ${confidence}`}
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
