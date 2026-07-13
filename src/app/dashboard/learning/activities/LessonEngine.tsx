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
  isPracticeAnswerCorrect,
} from "@/lib/learning/lessonEngine";
import type { LearningActivityRunnerRow } from "@/lib/learning/activityRunner";
import type { TutorSelection } from "@/lib/learning/tutorOrchestration";

type TutorMessage = {
  id: string;
  role: "mentor" | "tutor" | "learner";
  body: string;
};

type LessonEngineProps = {
  activity: LearningActivityRunnerRow;
  courseTitle: string;
  learnerName: string;
  checkedPhases: Record<string, boolean>;
  quizAnswers: Record<string, string>;
  practiceAnswers: Record<string, string>;
  reflection: string;
  confidence: string;
  tutorSelection: TutorSelection;
  saving: boolean;
  completed: boolean;
  onPhaseChange: (phaseId: string, checked: boolean) => void;
  onQuizAnswer: (questionId: string, answer: string) => void;
  onPracticeAnswer: (practiceId: string, answer: string) => void;
  onReflectionChange: (value: string) => void;
  onConfidenceChange: (value: string) => void;
  onComplete: () => void;
};

function confidenceLabel(value: string) {
  if (value === "Ready for more") return "ready for more";
  if (value === "Getting clearer") return "getting clearer";
  return "still building";
}

function firstNameFor(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function messageId(prefix: string, index: number) {
  return `${prefix}-${index}-${Date.now()}`;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function learnerAskedForCheck(value: string) {
  const text = normalizeText(value);
  return (
    text.includes("check") ||
    text.includes("quiz") ||
    text.includes("test me") ||
    text.includes("understand")
  );
}

function learnerAskedForHint(value: string) {
  const text = normalizeText(value);
  return text.includes("hint") || text.includes("help") || text.includes("stuck");
}

function learnerAskedForAlternateExplanation(value: string) {
  const text = normalizeText(value);
  return text.includes("another way") || text.includes("confusing") || text.includes("explain");
}

function learnerAskedToWrapUp(value: string) {
  const text = normalizeText(value);
  return (
    text.includes("done") ||
    text.includes("ready") ||
    text.includes("mentor") ||
    text.includes("save")
  );
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
  tutorSelection,
  saving,
  completed,
  onPhaseChange,
  onQuizAnswer,
  onPracticeAnswer,
  onReflectionChange,
  onConfidenceChange,
  onComplete,
}: LessonEngineProps) {
  const [learnerReply, setLearnerReply] = useState("");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [askedForHelp, setAskedForHelp] = useState(false);
  const restoredDraft = useRef(false);
  const engine = buildLessonEngineDefinition(activity);
  const draftKey = `beastlearning:tutor-chat:${activity.id}`;
  const firstName = firstNameFor(learnerName);
  const progress = getLessonEngineProgress({
    checkedPhases,
    phaseCount: engine.phases.length,
    reflection,
    confidence,
    quizAnswers,
    practiceAnswers,
    lesson: engine.lesson,
  });
  const activePractice =
    engine.lesson.guidedPractice.find(
      (practice) => !isPracticeAnswerCorrect(practice, practiceAnswers[practice.id] || "")
    ) || engine.lesson.guidedPractice[0];
  const activeQuestion =
    engine.lesson.quizQuestions.find((question) => !quizAnswers[question.id]) ||
    engine.lesson.quizQuestions[0];
  const currentConcept =
    engine.lesson.objectiveIds?.[0] ||
    engine.lesson.scopeId ||
    engine.lesson.prerequisiteConcepts[0] ||
    engine.lesson.subject;
  const tutorContext = {
    learnerProfile: `${learnerName} is working in BeastLearning and reports ${confidenceLabel(confidence)} confidence.`,
    mentorContext: `The Mentor selected ${activity.title}. ${tutorSelection.reason}`,
    course: courseTitle,
    lesson: engine.lesson.title,
    currentConcept,
    masteryState: `${progress.masteryEstimate}% estimated mastery`,
    lessonPlan: engine.lesson.learningObjective,
    tutorRole: tutorSelection.role,
    sessionContext: tutorSelection.contextSummary,
  };
  const tutorReadyToComplete =
    completed ||
    (messages.filter((message) => message.role === "learner").length >= 2 &&
      Boolean(reflection.trim()));

  const initialMessages = useMemo<TutorMessage[]>(
    () => [
      {
        id: "mentor-handoff",
        role: "mentor",
        body: `${tutorSelection.handoff} Stay inside this lesson scope, then bring the result back to me.`,
      },
      {
        id: "tutor-opening",
        role: "tutor",
        body: `Hi ${firstName}. I am your ${tutorSelection.role} for ${engine.lesson.title}. I will teach conversationally, check understanding when it fits, and return structured outcomes to your Mentor.`,
      },
    ],
    [engine.lesson.title, firstName, tutorSelection.handoff, tutorSelection.role]
  );

  useEffect(() => {
    if (completed || restoredDraft.current || typeof window === "undefined") return;

    try {
      const storedDraft = window.localStorage.getItem(draftKey);
      if (!storedDraft) {
        setMessages(initialMessages);
        restoredDraft.current = true;
        return;
      }

      const parsedDraft = JSON.parse(storedDraft) as {
        messages?: TutorMessage[];
        askedForHelp?: boolean;
        reflection?: string;
        confidence?: string;
      };

      setMessages(
        Array.isArray(parsedDraft.messages) && parsedDraft.messages.length > 0
          ? parsedDraft.messages
          : initialMessages
      );
      if (typeof parsedDraft.askedForHelp === "boolean") {
        setAskedForHelp(parsedDraft.askedForHelp);
      }
      if (typeof parsedDraft.reflection === "string") {
        onReflectionChange(parsedDraft.reflection);
      }
      if (typeof parsedDraft.confidence === "string") {
        onConfidenceChange(parsedDraft.confidence);
      }
      restoredDraft.current = true;
    } catch {
      window.localStorage.removeItem(draftKey);
      setMessages(initialMessages);
      restoredDraft.current = true;
    }
  }, [
    completed,
    draftKey,
    initialMessages,
    onConfidenceChange,
    onReflectionChange,
  ]);

  useEffect(() => {
    if (completed || typeof window === "undefined" || messages.length === 0) return;

    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        messages,
        askedForHelp,
        reflection,
        confidence,
      })
    );
  }, [askedForHelp, completed, confidence, draftKey, messages, reflection]);

  function markPhase(phaseId: string) {
    if (!checkedPhases[phaseId]) onPhaseChange(phaseId, true);
  }

  function buildTutorReply(value: string) {
    markPhase("lesson");

    const teacherResponse = getLessonTeacherResponse({
      lesson: engine.lesson,
      question: value,
      quizPercent: progress.quizPercent,
      masteryEstimate: progress.masteryEstimate,
    });

    if (learnerAskedForHint(value) && activePractice) {
      setAskedForHelp(true);
      markPhase("coach");
      return `${activePractice.hint} Try that idea on this: ${activePractice.prompt}`;
    }

    if (learnerAskedForAlternateExplanation(value)) {
      markPhase("coach");
      return teacherResponse;
    }

    if (learnerAskedForCheck(value) && activeQuestion) {
      markPhase("quiz");
      return `Let me check the idea naturally. ${activeQuestion.prompt} Tell me your answer and why you chose it.`;
    }

    if (learnerAskedToWrapUp(value)) {
      markPhase("reflection");
      markPhase("mastery");
      markPhase("recommendation");
      return `Here is what I will hand back to your Mentor: you worked on ${currentConcept}, your current mastery signal is ${progress.masteryEstimate}%, and the next recommendation is ${progress.nextRecommendation}.`;
    }

    if (activePractice && !practiceAnswers[activePractice.id]) {
      return `${teacherResponse} When you are ready, try this in your own words: ${activePractice.prompt}`;
    }

    return teacherResponse;
  }

  function captureEvidence(value: string) {
    const text = value.trim();
    if (!text) return;

    if (activePractice && !practiceAnswers[activePractice.id]) {
      onPracticeAnswer(activePractice.id, text);
      markPhase("practice");
    }

    if (activeQuestion && !quizAnswers[activeQuestion.id]) {
      const matchingOption = activeQuestion.options.find(
        (option) => normalizeText(option) === normalizeText(text)
      );
      if (matchingOption) {
        onQuizAnswer(activeQuestion.id, matchingOption);
        markPhase("quiz");
      }
    }

    onReflectionChange(text);
  }

  function sendLearnerMessage(value = learnerReply) {
    const text = value.trim();
    if (!text || completed) return;

    captureEvidence(text);

    setMessages((current) => {
      const learnerMessage: TutorMessage = {
        id: messageId("learner", current.length),
        role: "learner",
        body: text,
      };
      const tutorMessage: TutorMessage = {
        id: messageId("tutor", current.length + 1),
        role: "tutor",
        body: buildTutorReply(text),
      };

      return [...current, learnerMessage, tutorMessage];
    });
    setLearnerReply("");
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
            <p className="beast-kicker">Lesson-scoped Tutor</p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {engine.lesson.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c7cfdb]">
              The Tutor behaves like a focused conversation: it can teach,
              ask, hint, explain another way, and check mastery, but it stays
              inside this lesson and hands progress back to the Mentor.
            </p>
          </div>
          <div className="grid gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-[#9aa7b8]">Mastery signal</span>
              <span className="font-black text-white">
                {completed ? 100 : progress.masteryEstimate}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#0f1419]">
              <div
                className="h-full rounded-full bg-indigo-300"
                style={{ width: `${completed ? 100 : progress.masteryEstimate}%` }}
              />
            </div>
            <p className="text-xs font-bold uppercase text-[#7f8da3]">
              {activity.estimated_minutes} min - {courseTitle} - {tutorSelection.role}
            </p>
          </div>
        </div>
      </DashboardCard>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricTile
          label="Scope"
          value={currentConcept}
          detail="Current concept"
          icon="S"
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
          detail={askedForHelp ? "Support used" : "Ask anytime"}
          icon="C"
          tone="green"
        />
      </section>

      <DashboardCard accent="learning">
        <SectionHeader
          eyebrow="Tutor Conversation"
          title="Ask, answer, or think out loud."
          description="The Tutor uses Mentor-provided context, course, lesson, concept, mastery state, and lesson plan to respond inside this lesson scope."
          action={<ModuleBadge module="learning" label={tutorSelection.role} />}
        />

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section
            className="grid min-h-[620px] content-between gap-5 rounded-2xl border border-indigo-300/35 bg-[#0b1020] p-4 sm:p-5"
            aria-label="Lesson-scoped Tutor conversation"
          >
            <div className="grid gap-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-3xl rounded-2xl border p-4 ${
                    message.role === "learner"
                      ? "ml-auto border-cyan-300/35 bg-cyan-300/10"
                      : message.role === "mentor"
                        ? "border-green-300/30 bg-green-300/10"
                        : "border-indigo-300/30 bg-indigo-300/10"
                  }`}
                >
                  <div className="text-xs font-black uppercase text-[#c7cfdb]">
                    {message.role === "learner" ? firstName : message.role}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white">
                    {message.body}
                  </p>
                </div>
              ))}
              {!completed && messages.length > initialMessages.length ? (
                <div className="max-w-3xl rounded-2xl border border-green-400/30 bg-green-400/10 p-4">
                  <div className="text-xs font-black uppercase text-green-100">
                    I saved our place
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-green-50">
                    If you leave and come back on this device, I will restore
                    this Tutor conversation instead of making you restart.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 border-t border-[#2a3242] pt-4">
              <div className="flex flex-wrap gap-2">
                {[
                  "Teach this in a simple way.",
                  "Check my understanding.",
                  "Give me a hint.",
                  "Explain this another way.",
                  "Save this for my Mentor.",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="beast-button-secondary"
                    disabled={completed}
                    onClick={() => sendLearnerMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-[#c7cfdb]">
                  Message the Tutor
                </span>
                <textarea
                  value={learnerReply}
                  onChange={(event) => setLearnerReply(event.target.value)}
                  rows={4}
                  className="beast-input mt-2 min-h-28 resize-y"
                  placeholder="Ask a question, try an answer, or explain what you think."
                  disabled={completed}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      sendLearnerMessage();
                    }
                  }}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => sendLearnerMessage()}
                  className="beast-button"
                  disabled={completed || !learnerReply.trim()}
                >
                  Send to Tutor
                </button>
                <button
                  type="button"
                  onClick={finishLesson}
                  disabled={saving || completed || !tutorReadyToComplete}
                  className="beast-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : completed ? "Lesson saved" : "Save for Mentor"}
                </button>
              </div>
            </div>
          </section>

          <aside className="grid content-start gap-4">
            <div className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-black uppercase text-[#7f8da3]">
                Tutor context
              </div>
              <div className="mt-3 grid gap-3">
                {Object.entries(tutorContext).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-3">
                    <div className="text-xs font-bold uppercase text-indigo-100">
                      {label.replace(/([A-Z])/g, " $1")}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-black uppercase text-[#7f8da3]">
                How I am adapting
              </div>
              <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                {progress.coachingMessage}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#9aa7b8]">
                {progress.continuity.handoffSummary}
              </p>
            </div>
          </aside>
        </div>
      </DashboardCard>
    </div>
  );
}
