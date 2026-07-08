"use client";

import { useMemo, useState } from "react";
import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildLessonEngineDefinition,
  getLessonEngineProgress,
  getLessonTeacherResponse,
  getTeachingVisualSelectionFeedback,
  isPracticeAnswerCorrect,
} from "@/lib/learning/lessonEngine";
import type { LearningActivityRunnerRow } from "@/lib/learning/activityRunner";

type LessonEngineProps = {
  activity: LearningActivityRunnerRow;
  courseTitle: string;
  checkedPhases: Record<string, boolean>;
  quizAnswers: Record<string, string>;
  practiceAnswers: Record<string, string>;
  reflection: string;
  confidence: string;
  saving: boolean;
  completed: boolean;
  onPhaseChange: (phaseId: string, checked: boolean) => void;
  onQuizAnswer: (questionId: string, answer: string) => void;
  onPracticeAnswer: (practiceId: string, answer: string) => void;
  onReflectionChange: (value: string) => void;
  onConfidenceChange: (value: string) => void;
  onComplete: () => void;
};

export function LessonEngine({
  activity,
  courseTitle,
  checkedPhases,
  quizAnswers,
  practiceAnswers,
  reflection,
  confidence,
  saving,
  completed,
  onPhaseChange,
  onQuizAnswer,
  onPracticeAnswer,
  onReflectionChange,
  onConfidenceChange,
  onComplete,
}: LessonEngineProps) {
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [teacherQuestion, setTeacherQuestion] = useState("");
  const engine = buildLessonEngineDefinition(activity);
  const progress = getLessonEngineProgress({
    checkedPhases,
    phaseCount: engine.phases.length,
    reflection,
    confidence,
    quizAnswers,
    practiceAnswers,
    lesson: engine.lesson,
  });
  const visualFeedback = useMemo(
    () =>
      getTeachingVisualSelectionFeedback({
        lesson: engine.lesson,
        selectedTermIds,
      }),
    [engine.lesson, selectedTermIds]
  );
  const teacherResponse = getLessonTeacherResponse({
    lesson: engine.lesson,
    question: teacherQuestion,
    quizPercent: progress.quizPercent,
    masteryEstimate: progress.masteryEstimate,
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
  const termTone: Record<string, string> = {
    blue: "border-blue-300/45 bg-blue-300/15 text-blue-100",
    green: "border-green-300/45 bg-green-300/15 text-green-100",
    yellow: "border-yellow-300/45 bg-yellow-300/15 text-yellow-100",
  };

  return (
    <div className="space-y-8">
      <DashboardCard accent="learning">
        <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr] xl:items-center">
          <div>
            <p className="beast-kicker">Mission</p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {engine.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c7cfdb]">
              {engine.lesson.learningObjective}
            </p>
          </div>
          <div className="grid gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-[#9aa7b8]">Progress</span>
              <span className="font-black text-white">
                {completed ? 100 : progress.percent}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#0f1419]">
              <div
                className="h-full rounded-full bg-indigo-300"
                style={{ width: `${completed ? 100 : progress.percent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-[#c7cfdb]">
              <span>{activity.estimated_minutes} min</span>
              <span>{activity.difficulty}</span>
              <span>{displayedCompletedSteps} of {progress.requiredSteps} steps</span>
            </div>
          </div>
        </div>
      </DashboardCard>

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
          eyebrow="Interactive Teaching Area"
          title={engine.lesson.interactiveVisual.title}
          description={engine.lesson.interactiveVisual.prompt}
        />
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.85fr]">
          <div className="rounded-2xl border border-indigo-300/30 bg-[#111827] p-5">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Expression
            </div>
            <div className="mt-3 flex min-h-28 flex-wrap items-center gap-3 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
              {engine.lesson.interactiveVisual.terms.map((term) => {
                const selected = selectedTermIds.includes(term.id);

                return (
                  <button
                    key={term.id}
                    type="button"
                    disabled={completed}
                    onClick={() =>
                      setSelectedTermIds((current) =>
                        current.includes(term.id)
                          ? current.filter((id) => id !== term.id)
                          : [...current, term.id]
                      )
                    }
                    className={`min-w-16 rounded-xl border px-4 py-3 text-xl font-black transition ${
                      selected
                        ? termTone[term.color]
                        : "border-[#2a3242] bg-[#111827] text-white hover:border-indigo-300/40"
                    }`}
                  >
                    {term.label}
                  </button>
                );
              })}
            </div>
            <div
              className={`mt-4 rounded-xl border p-4 ${
                visualFeedback.correct
                  ? "border-green-400/35 bg-green-400/10 text-green-100"
                  : "border-yellow-400/35 bg-yellow-400/10 text-yellow-100"
              }`}
            >
              <div className="text-sm font-black">{visualFeedback.title}</div>
              <p className="mt-1 text-sm leading-5">{visualFeedback.message}</p>
            </div>
          </div>
          <div className="grid gap-3">
            {engine.lesson.interactiveVisual.targetGroups.map((group) => (
              <div
                key={group.group}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  {group.label}
                </div>
                <div className="mt-2 text-lg font-black text-white">
                  {group.combinedLabel}
                </div>
                <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                  {group.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
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

        <DashboardCard accent="blue">
          <SectionHeader
            eyebrow="AI Teacher"
            title="Ask without leaving the lesson"
            description="The teacher stays inside this concept and uses your current progress."
          />
          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-[#c7cfdb]">
                Ask about this lesson
              </span>
              <textarea
                value={teacherQuestion}
                onChange={(event) => setTeacherQuestion(event.target.value)}
                rows={4}
                className="beast-input mt-2 min-h-24 resize-y"
                placeholder="Example: Why can't I combine 4x and 7?"
              />
            </label>
            <div className="rounded-xl border border-blue-300/35 bg-blue-300/10 p-4 text-sm leading-6 text-blue-100">
              {teacherResponse}
            </div>
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Context: {engine.lesson.subject} - {engine.lesson.title} - Quiz {progress.quizPercent}% - Mastery {progress.masteryEstimate}%
            </div>
          </div>
        </DashboardCard>
      </section>

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
              <label className="mt-4 block">
                <span className="text-sm font-semibold text-[#c7cfdb]">
                  Your answer
                </span>
                <input
                  value={practiceAnswers[practice.id] || ""}
                  onChange={(event) =>
                    onPracticeAnswer(practice.id, event.target.value)
                  }
                  disabled={completed}
                  className="beast-input mt-2"
                  placeholder="Type your simplified expression"
                />
              </label>
              {practiceAnswers[practice.id]?.trim() ? (
                <p
                  className={`mt-3 rounded-lg border p-3 text-sm font-semibold ${
                    isPracticeAnswerCorrect(practice, practiceAnswers[practice.id])
                      ? "border-green-400/35 bg-green-400/10 text-green-100"
                      : "border-yellow-400/35 bg-yellow-400/10 text-yellow-100"
                  }`}
                >
                  {isPracticeAnswerCorrect(practice, practiceAnswers[practice.id])
                    ? "Correct. "
                    : "Try again. "}
                  Expected: {practice.expectedAnswer}
                </p>
              ) : null}
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
                : `${displayedCompletedSteps} of ${progress.requiredSteps} engine steps complete - Practice: ${progress.practiceCorrect}/${progress.practiceTotal} - Confidence: ${confidence}`}
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
              Practice signal
            </div>
            <p className="mt-2 text-lg font-black text-white">
              {progress.practiceCorrect} / {progress.practiceTotal} correct
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
