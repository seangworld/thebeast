"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  learnerName: string;
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
  if (step === "reflect") return "Tell me what changed for you.";
  return "Let's see what you've learned.";
}

function tutorStepMessage(step: TutorStep, learnerName: string, subject: string) {
  if (step === "warmup") {
    return `Good morning ${learnerName}. Your BeastLearning Mentor sent this ${subject} lesson to the Tutor because instruction is the next useful step. Before we continue, tell me what you already know about this idea.`;
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
    return "Answer from memory. If it is not quite there yet, we will slow down and work through it together.";
  }
  if (step === "reflect") {
    return "Tell me what clicked or what still feels uncertain. I’ll remember it so the next lesson fits you better.";
  }
  return "Here is what your work shows. If you are ready, I’ll save this lesson and help your Mentor choose what comes next.";
}

function confidenceLabel(value: string) {
  if (value === "Ready for more") return "ready for more";
  if (value === "Getting clearer") return "getting clearer";
  return "still building";
}

function adaptiveTutorMessage({
  progress,
  practiceComplete,
  quizComplete,
  askedForHelp,
}: {
  progress: ReturnType<typeof getLessonEngineProgress>;
  practiceComplete: boolean;
  quizComplete: boolean;
  askedForHelp: boolean;
}) {
  if (progress.mastered) {
    return `You are showing enough understanding to keep moving. I will still use your reflection to help your Mentor choose the next lesson.`;
  }

  if (!practiceComplete) {
    return askedForHelp
      ? "You asked for support, so I am keeping this at practice pace and giving you another chance to build the pattern."
      : "I am keeping this at practice pace until you have tried the skill with support.";
  }

  if (!quizComplete) {
    return "Your practice is in place. I am using the check-in question to see whether this is ready to become long-term understanding.";
  }

  if (progress.recommendedReview) {
    return "Your work is close, but a careful review will help this stick before your Mentor moves you forward.";
  }

  return "Your answers, practice, confidence, and reflection are all helping me adapt the next step.";
}

function buildPracticeHintLadder({
  hint,
  prompt,
  level,
}: {
  hint: string;
  prompt: string;
  level: number;
}) {
  const gentleHint =
    hint || "Start by naming what the question is asking you to find.";
  const focusedHint =
    "Now compare the important parts of the question. What belongs together, and what should stay separate?";
  const coachedHint = `Try saying the first step out loud for: ${prompt}`;

  if (level <= 1) return gentleHint;
  if (level === 2) return focusedHint;
  return `${gentleHint} ${focusedHint} ${coachedHint}`;
}

export function LessonEngine({
  activity,
  courseTitle,
  learnerName,
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
  const [hintLevel, setHintLevel] = useState(0);
  const restoredDraft = useRef(false);
  const engine = buildLessonEngineDefinition(activity);
  const draftKey = `beastlearning:tutor-draft:${activity.id}`;
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
  const firstName = learnerName.trim().split(/\s+/)[0] || "there";
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
  const adaptiveMessage = adaptiveTutorMessage({
    progress,
    practiceComplete,
    quizComplete,
    askedForHelp,
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
  const resumeSignals = [
    Boolean(learnerWarmup.trim()),
    Object.keys(practiceAnswers).length > 0,
    Object.keys(quizAnswers).length > 0,
    Boolean(reflection.trim()),
  ].filter(Boolean).length;

  useEffect(() => {
    if (completed || restoredDraft.current || typeof window === "undefined") return;

    try {
      const storedDraft = window.localStorage.getItem(draftKey);
      if (!storedDraft) {
        restoredDraft.current = true;
        return;
      }

      const parsedDraft = JSON.parse(storedDraft) as {
        step?: TutorStep;
        learnerWarmup?: string;
        selectedTermIds?: string[];
        practiceAnswers?: Record<string, string>;
        quizAnswers?: Record<string, string>;
        reflection?: string;
        confidence?: string;
      };

      if (parsedDraft.step) setStep(parsedDraft.step);
      if (parsedDraft.learnerWarmup) setLearnerWarmup(parsedDraft.learnerWarmup);
      if (Array.isArray(parsedDraft.selectedTermIds)) {
        setSelectedTermIds(parsedDraft.selectedTermIds);
      }
      Object.entries(parsedDraft.practiceAnswers || {}).forEach(([practiceId, answer]) =>
        onPracticeAnswer(practiceId, answer)
      );
      Object.entries(parsedDraft.quizAnswers || {}).forEach(([questionId, answer]) =>
        onQuizAnswer(questionId, answer)
      );
      if (typeof parsedDraft.reflection === "string") {
        onReflectionChange(parsedDraft.reflection);
      }
      if (typeof parsedDraft.confidence === "string") {
        onConfidenceChange(parsedDraft.confidence);
      }
      restoredDraft.current = true;
    } catch {
      window.localStorage.removeItem(draftKey);
      restoredDraft.current = true;
    }
  }, [
    completed,
    draftKey,
    onConfidenceChange,
    onPracticeAnswer,
    onQuizAnswer,
    onReflectionChange,
  ]);

  useEffect(() => {
    if (completed || typeof window === "undefined") return;

    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        step,
        learnerWarmup,
        selectedTermIds,
        practiceAnswers,
        quizAnswers,
        reflection,
        confidence,
      })
    );
  }, [
    completed,
    confidence,
    draftKey,
    learnerWarmup,
    practiceAnswers,
    quizAnswers,
    reflection,
    selectedTermIds,
    step,
  ]);

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
    setHintLevel(0);
    setStep(nextStep);
  }

  function requestSupport(mode: Exclude<SupportMode, null>) {
    setAskedForHelp(true);
    markPhase("coach");
    if (mode === "hint") {
      setHintLevel((current) => Math.min(3, current + 1));
    }
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
    if (typeof window !== "undefined") window.localStorage.removeItem(draftKey);
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
          value={completed ? "Saved" : "Here"}
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
          detail={askedForHelp ? "You used support well" : "You can ask for help anytime"}
          icon="C"
          tone="green"
        />
      </section>

      <DashboardCard accent="learning">
        <SectionHeader
          eyebrow="Tutoring Together"
          title={tutorStepTitle(step)}
          description={tutorStepMessage(step, firstName, engine.lesson.subject)}
          action={<ModuleBadge module="learning" label={engine.lesson.subject} />}
        />

        <div className="mt-6 grid gap-5 xl:grid-cols-[0.76fr_1.24fr]">
          <div className="rounded-2xl border border-indigo-300/35 bg-indigo-300/10 p-5">
            <div className="text-xs font-bold uppercase text-[#9aa7b8]">
              Tutor
            </div>
            <p className="mt-3 text-base font-semibold leading-7 text-indigo-50">
              {tutorStepMessage(step, firstName, engine.lesson.subject)}
            </p>
            {supportMode ? (
              <div className="mt-4 rounded-xl border border-blue-300/35 bg-blue-300/10 p-4 text-sm leading-6 text-blue-100">
                {teacherResponse}
              </div>
            ) : null}
            <div className="mt-4 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                How I&apos;m adapting
              </div>
              <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                {adaptiveMessage}
              </p>
            </div>
            {!completed && resumeSignals > 0 ? (
              <div className="mt-4 rounded-xl border border-green-400/30 bg-green-400/10 p-4">
                <div className="text-xs font-bold uppercase text-green-100">
                  I saved our place
                </div>
                <p className="mt-2 text-sm leading-6 text-green-50">
                  If you leave and come back on this device, I will bring you
                  back to this part of the lesson instead of making you restart.
                </p>
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
                Explain another way
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
                    {buildPracticeHintLadder({
                      hint: activePractice.hint,
                      prompt: activePractice.prompt,
                      level: hintLevel,
                    })}
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
                      : "Good attempt. Let's work through the relationship in the expression together, then try again."}
                  </div>
                ) : null}
                {activePracticeAnswered && !activePracticeCorrect ? (
                  <div className="rounded-xl border border-blue-300/35 bg-blue-300/10 p-4 text-sm leading-6 text-blue-100">
                    <strong className="text-white">Tutor plan:</strong> I am
                    slowing down here because this is the skill your Mentor sent
                    us to strengthen. Ask for another hint, then try the same
                    idea again before we move to the check-in.
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
                  {practiceComplete ? "Ask me one check" : "Let's try another one"}
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
                {activeQuizAnswered && !activeQuizCorrect ? (
                  <div className="rounded-xl border border-yellow-400/35 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100">
                    <strong className="text-white">Before we move on:</strong>{" "}
                    {engine.lesson.reviewRecommendation} I will keep this as
                    review until the answer and your confidence line up.
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
                  {quizComplete ? "I'm ready to reflect" : "Coach me through it"}
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
                    What I noticed
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#c7cfdb]">
                    {completed
                      ? `Nice work. You are ready for: ${engine.lesson.recommendedNextLesson}.`
                      : progress.coachingMessage}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#9aa7b8]">
                    I used your practice, check-in answer, confidence, and reflection
                    to decide whether this should become new learning or review.
                    I will hand that back to your Mentor so your longer plan keeps
                    fitting you.
                  </p>
                  <p className="mt-3 rounded-lg border border-indigo-300/30 bg-indigo-300/10 p-3 text-sm font-semibold leading-6 text-indigo-100">
                    {progress.continuity.handoffSummary}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Practice tries
                    </div>
                    <p className="mt-2 text-lg font-black text-white">
                      {progress.practiceCorrect}/{progress.practiceTotal}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Check-in questions
                    </div>
                    <p className="mt-2 text-lg font-black text-white">
                      {progress.quizCorrect}/{progress.quizTotal}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Understanding
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
                  {saving ? "Saving..." : completed ? "Lesson saved" : "Let's see what you've learned"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
