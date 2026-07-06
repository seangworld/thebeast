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
  quizAnswers: Record<string, string>;
  reflection: string;
  confidence: string;
  saving: boolean;
  completed: boolean;
  onPhaseChange: (phaseId: string, checked: boolean) => void;
  onQuizAnswer: (questionId: string, answer: string) => void;
  onReflectionChange: (value: string) => void;
  onConfidenceChange: (value: string) => void;
  onComplete: () => void;
};

export function LessonEngine({
  activity,
  courseTitle,
  checkedPhases,
  quizAnswers,
  reflection,
  confidence,
  saving,
  completed,
  onPhaseChange,
  onQuizAnswer,
  onReflectionChange,
  onConfidenceChange,
  onComplete,
}: LessonEngineProps) {
  const engine = buildLessonEngineDefinition(activity);
  const progress = getLessonEngineProgress({
    checkedPhases,
    phaseCount: engine.phases.length,
    reflection,
    confidence,
    quizAnswers,
    lesson: engine.lesson,
  });
  const readyToComplete = completed || progress.readyToComplete;
  const displayedCompletedSteps = completed
    ? progress.requiredSteps
    : progress.completedSteps;
  const effectiveMastered = completed || progress.mastered;
  const effectiveMasteryEstimate = completed ? 100 : progress.masteryEstimate;
  const effectiveRecommendation = completed
    ? engine.lesson.recommendedNextLesson
    : progress.nextRecommendation;
  const effectiveCoachingMessage = completed
    ? `Nice work. You are ready for: ${engine.lesson.recommendedNextLesson}.`
    : progress.coachingMessage;
  const masteryTone = effectiveMastered
    ? "border-green-400/35 bg-green-400/10 text-green-100"
    : progress.recommendedReview
      ? "border-yellow-400/35 bg-yellow-400/10 text-yellow-100"
      : "border-indigo-300/35 bg-indigo-300/10 text-indigo-100";

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Mode"
          value={engine.activityType === "Practice" ? "Guided Practice" : engine.activityType}
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
          label="Mastery"
          value={`${effectiveMasteryEstimate}%`}
          detail={effectiveMastered ? "Ready for next lesson" : "Review signal active"}
          icon="XP"
          tone="yellow"
        />
      </section>

      <DashboardCard accent="learning">
        <SectionHeader
          eyebrow="Adaptive Lesson"
          title={engine.title}
          description={engine.summary}
          action={<ModuleBadge module="learning" label={engine.lesson.subject} />}
        />
        <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-indigo-300/35 bg-indigo-300/10 p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Learning objective
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-indigo-100">
              {engine.lesson.learningObjective}
            </p>
          </div>
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Prerequisites
            </div>
            <ul className="mt-2 grid gap-2 text-sm leading-5 text-[#c7cfdb]">
              {engine.lesson.prerequisiteConcepts.map((concept) => (
                <li key={concept}>{concept}</li>
              ))}
            </ul>
          </div>
        </div>
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

      <DashboardCard accent="learning">
        <SectionHeader
          eyebrow="Lesson"
          title="Understand the idea"
          description={engine.lesson.explanation}
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {engine.lesson.examples.map((example) => (
            <div
              key={example.title}
              className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                {example.title}
              </div>
              <h3 className="mt-2 text-lg font-black text-white">
                {example.setup}
              </h3>
              <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm leading-5 text-[#c7cfdb]">
                {example.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="mt-3 rounded-lg border border-green-400/30 bg-green-400/10 p-3 text-sm font-bold text-green-100">
                {example.takeaway}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard accent="purple">
        <SectionHeader
          eyebrow="Guided Practice"
          title="Try it with support"
          description="Work each practice prompt before the quiz. The hint is there to help you think, not to rush you."
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {engine.lesson.guidedPractice.map((practice) => (
            <div
              key={practice.id}
              className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <h3 className="font-black text-white">{practice.prompt}</h3>
              <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                Hint: {practice.hint}
              </p>
              <p className="mt-3 text-xs font-bold uppercase text-indigo-100">
                Check yourself: {practice.expectedAnswer}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard accent="learning">
        <SectionHeader
          eyebrow="Quiz"
          title="Check understanding"
          description="Answer from memory first. Beast uses mistakes as a coaching signal."
        />
        <div className="mt-5 grid gap-4">
          {engine.lesson.quizQuestions.map((question, index) => {
            const selected = quizAnswers[question.id];
            const answered = Boolean(selected);
            const correct = selected === question.answer;

            return (
              <div
                key={question.id}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Question {index + 1}
                </div>
                <h3 className="mt-2 font-black text-white">{question.prompt}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={completed}
                      onClick={() => onQuizAnswer(question.id, option)}
                      className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
                        selected === option
                          ? "border-indigo-300/50 bg-indigo-300/15 text-indigo-100"
                          : "border-[#2a3242] bg-[#0f1419] text-[#dbe3ef] hover:border-indigo-300/35"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {answered ? (
                  <p
                    className={`mt-3 rounded-lg border p-3 text-sm font-semibold ${
                      correct
                        ? "border-green-400/35 bg-green-400/10 text-green-100"
                        : "border-yellow-400/35 bg-yellow-400/10 text-yellow-100"
                    }`}
                  >
                    {correct ? "Correct. " : "Review this. "}
                    {question.explanation}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </DashboardCard>

      <DashboardCard accent="green">
        <SectionHeader
          eyebrow="AI Coach"
          title="Get coached on the next best move"
          description={effectiveCoachingMessage}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {engine.lesson.aiCoachingPrompts.map((coach) => (
            <div
              key={coach.kind}
              className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                {coach.title}
              </div>
              <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                {coach.prompt}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard accent="purple">
        <SectionHeader
          eyebrow="Reflection"
          title="Teach Beast what changed"
          description={engine.lesson.reflectionPrompts[0]}
        />
        <div className="mt-5 grid gap-4">
          <div className="flex flex-wrap gap-2">
            {engine.lesson.reflectionPrompts.slice(1).map((prompt) => (
              <span
                key={prompt}
                className="rounded-full border border-[#2a3242] bg-[#0f1419] px-3 py-1 text-xs font-bold text-[#dbe3ef]"
              >
                {prompt}
              </span>
            ))}
          </div>
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

      <DashboardCard accent={effectiveMastered ? "green" : "yellow"}>
        <SectionHeader
          eyebrow="Mastery and Recommendation"
          title={effectiveMastered ? "Ready for the next lesson" : "Review before moving on"}
          description={effectiveCoachingMessage}
          action={
            <ModuleBadge
              module="learning"
              label={`${effectiveMasteryEstimate}% mastery`}
            />
          }
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className={`rounded-xl border p-4 ${masteryTone}`}>
            <div className="text-xs font-bold uppercase opacity-80">
              Mastery estimate
            </div>
            <div className="mt-2 text-3xl font-black">
              {effectiveMasteryEstimate}%
            </div>
          </div>
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Quiz signal
            </div>
            <p className="mt-2 text-lg font-black text-white">
              {progress.quizCorrect} / {progress.quizTotal} correct
            </p>
          </div>
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Next recommendation
            </div>
            <p className="mt-2 text-sm font-semibold leading-5 text-[#c7cfdb]">
              {effectiveRecommendation}
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
