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

type TutorStep =
  | "warmup"
  | "teach"
  | "visual"
  | "practice"
  | "question"
  | "reflect"
  | "mastery";

type SupportMode = "hint" | "alternate" | "example" | "visual" | "practice" | null;

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

function tutorStepTitle(step: TutorStep) {
  if (step === "warmup") return "Let's start with what you already know.";
  if (step === "teach") return "Let's build the idea together.";
  if (step === "visual") return "Show me the pattern.";
  if (step === "practice") return "Try one with me.";
  if (step === "question") return "One check before we continue.";
  if (step === "reflect") return "Lock in what changed.";
  return "Mastery check.";
}

function tutorStepMessage(step: TutorStep, learnerName: string, subject: string) {
  if (step === "warmup") {
    return `Good morning ${learnerName}. Your BeastLearning Guide sent this ${subject} lesson to the Tutor because instruction is the next useful step. Before we continue, tell me what you already know about this idea.`;
  }
  if (step === "teach") {
    return "Good. I’ll teach the next piece, then I’ll ask you one meaningful question.";
  }
  if (step === "visual") {
    return "Now interact with the example. Choose the parts that belong together.";
  }
  if (step === "practice") {
    return "Your turn. Work this one step at a time. Ask for help if you need it.";
  }
  if (step === "question") {
    return "Answer from memory. I’ll use your response to decide whether to move forward or remediate.";
  }
  if (step === "reflect") {
    return "Tell me what clicked or what still feels uncertain. I’ll use that to preserve your lesson context.";
  }
  return "Here is where you stand. If you are ready, I’ll save this lesson and recommend what comes next.";
}

function confidenceLabel(value: string) {
  if (value === "Ready for more") return "ready for more";
  if (value === "Getting clearer") return "getting clearer";
  return "still building";
}

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
  const [step, setStep] = useState<TutorStep>(completed ? "mastery" : "warmup");
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [learnerWarmup, setLearnerWarmup] = useState("");
  const [supportMode, setSupportMode] = useState<SupportMode>(null);
  const [askedForHelp, setAskedForHelp] = useState(false);
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
  const activePractice =
    engine.lesson.guidedPractice.find(
      (practice) => !isPracticeAnswerCorrect(practice, practiceAnswers[practice.id] || "")
    ) || engine.lesson.guidedPractice[engine.lesson.guidedPractice.length - 1];
  const activePracticeAnswer = activePractice
    ? practiceAnswers[activePractice.id] || ""
    : "";
  const activePracticeAnswered = Boolean(activePracticeAnswer.trim());
  const activePracticeCorrect = activePractice
    ? isPracticeAnswerCorrect(activePractice, activePracticeAnswer)
    : true;
  const activeQuestion =
    engine.lesson.quizQuestions.find((question) => !quizAnswers[question.id]) ||
    engine.lesson.quizQuestions[engine.lesson.quizQuestions.length - 1];
  const activeQuizAnswer = activeQuestion ? quizAnswers[activeQuestion.id] : "";
  const activeQuizAnswered = Boolean(activeQuizAnswer);
  const activeQuizCorrect = activeQuestion
    ? activeQuizAnswer === activeQuestion.answer
    : true;
  const practiceComplete = engine.lesson.guidedPractice.every((practice) =>
    isPracticeAnswerCorrect(practice, practiceAnswers[practice.id] || "")
  );
  const quizComplete = engine.lesson.quizQuestions.every(
    (question) => quizAnswers[question.id] === question.answer
  );
  const reflectionComplete = Boolean(reflection.trim());
  const tutorReadyToComplete =
    completed || (practiceComplete && quizComplete && reflectionComplete);
  const learnerName = "Sean";
  const teacherQuestion =
    supportMode === "hint"
      ? "Give me a hint without revealing the answer."
      : supportMode === "alternate"
        ? "Explain this another way."
        : supportMode === "example"
          ? "Show me a worked example."
          : supportMode === "visual"
            ? "Help me understand the visual."
            : supportMode === "practice"
              ? "Help me practice without giving away the answer."
              : learnerWarmup;
  const teacherResponse = getLessonTeacherResponse({
    lesson: engine.lesson,
    question: teacherQuestion,
    quizPercent: progress.quizPercent,
    masteryEstimate: progress.masteryEstimate,
  });
  const progressPercent = completed
    ? 100
    : Math.min(
        100,
        Math.round(
          [
            Boolean(learnerWarmup.trim()),
            checkedPhases.lesson,
            visualFeedback.correct,
            practiceComplete,
            quizComplete,
            reflectionComplete,
          ].filter(Boolean).length * 16.7
        )
      );

  function markPhase(phaseId: string) {
    if (!checkedPhases[phaseId]) onPhaseChange(phaseId, true);
  }

  function goTo(nextStep: TutorStep) {
    if (nextStep === "teach") markPhase("assessment");
    if (nextStep === "visual") markPhase("lesson");
    if (nextStep === "question" && practiceComplete) markPhase("practice");
    if (nextStep === "reflect" && quizComplete) markPhase("quiz");
    if (nextStep === "mastery") {
      markPhase("coach");
      markPhase("reflection");
      markPhase("mastery");
      markPhase("recommendation");
    }
    setSupportMode(null);
    setStep(nextStep);
  }

  function requestSupport(mode: Exclude<SupportMode, null>) {
    setAskedForHelp(true);
    markPhase("coach");
    setSupportMode(mode);
  }

  function finishLesson() {
    [
      "assessment",
      "lesson",
      "practice",
      "quiz",
      "coach",
      "reflection",
      "mastery",
      "recommendation",
    ].forEach(markPhase);
    onComplete();
  }

  return (
    <div className="space-y-8">
      <DashboardCard accent="learning">
        <div className="grid gap-5 xl:grid-cols-[1fr_0.72fr] xl:items-center">
          <div>
            <p className="beast-kicker">Your Tutor</p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {engine.lesson.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c7cfdb]">
              {engine.lesson.learningObjective}
            </p>
          </div>
          <div className="grid gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-[#9aa7b8]">How far we are</span>
              <span className="font-black text-white">{progressPercent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#0f1419]">
              <div
                className="h-full rounded-full bg-indigo-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs font-bold uppercase text-[#7f8da3]">
              {activity.estimated_minutes} min · {courseTitle}
            </p>
          </div>
        </div>
      </DashboardCard>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricTile
          label="Tutor"
          value={completed ? "Complete" : "Live"}
          detail="Teaching now"
          icon="AI"
          tone="purple"
        />
        <MetricTile
          label="Mastery"
          value={`${completed ? 100 : progress.masteryEstimate}%`}
          detail={progress.mastered ? "Ready for more" : "Still practicing"}
          icon="M"
          tone="yellow"
        />
        <MetricTile
          label="Confidence"
          value={confidenceLabel(confidence)}
          detail={askedForHelp ? "Support used well" : "Help available anytime"}
          icon="C"
          tone="green"
        />
      </section>

      <DashboardCard accent="learning">
        <SectionHeader
          eyebrow="Tutor Session"
          title={tutorStepTitle(step)}
          description={tutorStepMessage(step, learnerName, engine.lesson.subject)}
          action={<ModuleBadge module="learning" label={engine.lesson.subject} />}
        />

        <div className="mt-6 grid gap-5 xl:grid-cols-[0.76fr_1.24fr]">
          <div className="rounded-2xl border border-indigo-300/35 bg-indigo-300/10 p-5">
            <div className="text-xs font-bold uppercase text-[#9aa7b8]">
              Tutor
            </div>
            <p className="mt-3 text-base font-semibold leading-7 text-indigo-50">
              {tutorStepMessage(step, learnerName, engine.lesson.subject)}
            </p>
            {supportMode ? (
              <div className="mt-4 rounded-xl border border-blue-300/35 bg-blue-300/10 p-4 text-sm leading-6 text-blue-100">
                {teacherResponse}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => requestSupport("hint")}
                className="beast-button-secondary"
                disabled={completed}
              >
                Hint
              </button>
              <button
                type="button"
                onClick={() => requestSupport("alternate")}
                className="beast-button-secondary"
                disabled={completed}
              >
                Another explanation
              </button>
              <button
                type="button"
                onClick={() => requestSupport("example")}
                className="beast-button-secondary"
                disabled={completed}
              >
                Example
              </button>
              <button
                type="button"
                onClick={() => requestSupport("practice")}
                className="beast-button-secondary"
                disabled={completed}
              >
                Practice with me
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a3242] bg-[#111827] p-5">
            {step === "warmup" ? (
              <div className="grid gap-4">
                <label className="block">
                  <span className="text-sm font-semibold text-[#c7cfdb]">
                    What do you already know?
                  </span>
                  <textarea
                    value={learnerWarmup}
                    onChange={(event) => setLearnerWarmup(event.target.value)}
                    rows={5}
                    className="beast-input mt-2 min-h-32 resize-y"
                    placeholder="Type what you know, even if you are not sure yet."
                    disabled={completed}
                  />
                </label>
                {learnerWarmup.trim() ? (
                  <div className="rounded-xl border border-green-400/35 bg-green-400/10 p-4 text-sm leading-6 text-green-100">
                    {teacherResponse}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => goTo("teach")}
                  className="beast-button w-fit"
                  disabled={completed || !learnerWarmup.trim()}
                >
                  Let&apos;s continue
                </button>
              </div>
            ) : null}

            {step === "teach" ? (
              <div className="grid gap-4">
                <p className="text-sm leading-6 text-[#dbe3ef]">
                  {engine.lesson.explanation}
                </p>
                <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Worked example
                  </div>
                  <h3 className="mt-2 text-lg font-black text-white">
                    {engine.lesson.examples[0]?.setup}
                  </h3>
                  <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm leading-5 text-[#c7cfdb]">
                    {engine.lesson.examples[0]?.steps.map((exampleStep) => (
                      <li key={exampleStep}>{exampleStep}</li>
                    ))}
                  </ol>
                  <p className="mt-3 rounded-lg border border-green-400/30 bg-green-400/10 p-3 text-sm font-bold text-green-100">
                    {engine.lesson.examples[0]?.takeaway}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goTo("visual")}
                  className="beast-button w-fit"
                  disabled={completed}
                >
                  I&apos;m ready to try one
                </button>
              </div>
            ) : null}

            {step === "visual" ? (
              <div className="grid gap-4">
                <div>
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    {engine.lesson.interactiveVisual.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                    {engine.lesson.interactiveVisual.prompt}
                  </p>
                </div>
                <div className="flex min-h-28 flex-wrap items-center gap-3 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
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
                            ? "border-indigo-300/50 bg-indigo-300/15 text-indigo-100"
                            : "border-[#2a3242] bg-[#111827] text-white hover:border-indigo-300/40"
                        }`}
                      >
                        {term.label}
                      </button>
                    );
                  })}
                </div>
                {selectedTermIds.length > 0 ? (
                  <div
                    className={`rounded-xl border p-4 ${
                      visualFeedback.correct
                        ? "border-green-400/35 bg-green-400/10 text-green-100"
                        : "border-yellow-400/35 bg-yellow-400/10 text-yellow-100"
                    }`}
                  >
                    <div className="text-sm font-black">{visualFeedback.title}</div>
                    <p className="mt-1 text-sm leading-5">{visualFeedback.message}</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => goTo("practice")}
                  className="beast-button w-fit"
                  disabled={completed || !visualFeedback.correct}
                >
                  Keep going
                </button>
              </div>
            ) : null}

            {step === "practice" && activePractice ? (
              <div className="grid gap-4">
                <h3 className="text-xl font-black text-white">
                  {activePractice.prompt}
                </h3>
                {supportMode === "hint" ? (
                  <p className="rounded-xl border border-yellow-400/35 bg-yellow-400/10 p-4 text-sm font-semibold leading-6 text-yellow-100">
                    {activePractice.hint}
                  </p>
                ) : null}
                <label className="block">
                  <span className="text-sm font-semibold text-[#c7cfdb]">
                    Your answer
                  </span>
                  <input
                    value={activePracticeAnswer}
                    onChange={(event) =>
                      onPracticeAnswer(activePractice.id, event.target.value)
                    }
                    disabled={completed}
                    className="beast-input mt-2"
                    placeholder="Type your answer"
                  />
                </label>
                {activePracticeAnswered ? (
                  <div
                    className={`rounded-xl border p-4 text-sm font-semibold leading-6 ${
                      activePracticeCorrect
                        ? "border-green-400/35 bg-green-400/10 text-green-100"
                        : "border-yellow-400/35 bg-yellow-400/10 text-yellow-100"
                    }`}
                  >
                    {activePracticeCorrect
                      ? "Yes. That answer works. You saw the structure and applied it."
                      : "Not yet. Check the relationship in the expression, then try again."}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    practiceComplete ? goTo("question") : setSupportMode(null)
                  }
                  className="beast-button w-fit"
                  disabled={completed || !activePracticeCorrect}
                >
                  {practiceComplete ? "Ask me the check" : "Give me the next practice"}
                </button>
              </div>
            ) : null}

            {step === "question" && activeQuestion ? (
              <div className="grid gap-4">
                <h3 className="text-xl font-black text-white">
                  {activeQuestion.prompt}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeQuestion.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={completed}
                      onClick={() => onQuizAnswer(activeQuestion.id, option)}
                      className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
                        activeQuizAnswer === option
                          ? "border-indigo-300/50 bg-indigo-300/15 text-indigo-100"
                          : "border-[#2a3242] bg-[#0f1419] text-[#dbe3ef] hover:border-indigo-300/35"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {activeQuizAnswered ? (
                  <div
                    className={`rounded-xl border p-4 text-sm font-semibold leading-6 ${
                      activeQuizCorrect
                        ? "border-green-400/35 bg-green-400/10 text-green-100"
                        : "border-yellow-400/35 bg-yellow-400/10 text-yellow-100"
                    }`}
                  >
                    {activeQuizCorrect ? "Yes. That makes sense. " : "Good try. Let's repair this together. "}
                    {activeQuestion.explanation}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    quizComplete ? goTo("reflect") : setSupportMode("alternate")
                  }
                  className="beast-button w-fit"
                  disabled={completed || !activeQuizAnswered}
                >
                  {quizComplete ? "Continue" : "Coach me through it"}
                </button>
              </div>
            ) : null}

            {step === "reflect" ? (
              <div className="grid gap-4">
                <label className="block">
                  <span className="text-sm font-semibold text-[#c7cfdb]">
                    What should I remember for next time?
                  </span>
                  <textarea
                    value={reflection}
                    onChange={(event) => onReflectionChange(event.target.value)}
                    disabled={completed}
                    rows={5}
                    className="beast-input mt-2 min-h-32 resize-y"
                    placeholder="Write one sentence about what clicked or what still needs review."
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[#c7cfdb]">
                    How confident do you feel?
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
                <button
                  type="button"
                  onClick={() => goTo("mastery")}
                  className="beast-button w-fit"
                  disabled={completed || !reflectionComplete}
                >
                  Show me where I stand
                </button>
              </div>
            ) : null}

            {step === "mastery" ? (
              <div className="grid gap-4">
                <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Tutor recommendation
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#c7cfdb]">
                    {completed
                      ? `Nice work. You are ready for: ${engine.lesson.recommendedNextLesson}.`
                      : progress.nextRecommendation}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Practice
                    </div>
                    <p className="mt-2 text-lg font-black text-white">
                      {progress.practiceCorrect}/{progress.practiceTotal}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Questions
                    </div>
                    <p className="mt-2 text-lg font-black text-white">
                      {progress.quizCorrect}/{progress.quizTotal}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Mastery
                    </div>
                    <p className="mt-2 text-lg font-black text-white">
                      {completed ? 100 : progress.masteryEstimate}%
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={finishLesson}
                  disabled={saving || completed || !tutorReadyToComplete}
                  className="beast-button w-fit disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : completed ? "Lesson saved" : "Save this lesson"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
