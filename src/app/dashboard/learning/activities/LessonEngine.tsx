"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useConversationScroll } from "@/app/components/agents/useConversationScroll";
import {
  DashboardCard,
  ModuleBadge,
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

function speakerLabel(role: TutorMessage["role"], learnerName: string, tutorRole: string) {
  if (role === "learner") return learnerName;
  if (role === "mentor") return "Guidance Counselor";
  return tutorRole;
}

function messageBubbleClasses(role: TutorMessage["role"]) {
  if (role === "learner") {
    return "ml-auto rounded-[1.35rem] rounded-br-md bg-cyan-300 px-4 py-3 text-[#06232b] shadow-sm";
  }

  if (role === "mentor") {
    return "rounded-[1.35rem] rounded-bl-md bg-emerald-300/15 px-4 py-3 text-emerald-50 ring-1 ring-emerald-200/20";
  }

  return "rounded-[1.35rem] rounded-bl-md bg-indigo-300/15 px-4 py-3 text-indigo-50 ring-1 ring-indigo-200/20";
}

function speakerDotClasses(role: TutorMessage["role"]) {
  if (role === "learner") return "bg-cyan-300";
  if (role === "mentor") return "bg-emerald-300";
  return "bg-indigo-300";
}

function progressLanguage(value: number, completed: boolean) {
  if (completed) return "You wrapped this lesson. Your Guidance Counselor has the recap.";
  if (value >= 80) return "You look ready to move forward after one quick reflection.";
  if (value >= 55) return "You are getting there. One focused check should help this settle.";
  return "You are still early with this topic. We will keep the next step short and clear.";
}

function saveStatusLabel(saving: boolean, completed: boolean, ready: boolean) {
  if (saving) return "Saving...";
  if (completed) return "Saved";
  if (ready) return "Ready to finish";
  return "Saved";
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
  const [isResponding, setIsResponding] = useState(false);
  const restoredDraft = useRef(false);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const responsePendingRef = useRef(false);
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
  const tutorReadyToComplete =
    completed ||
    (messages.filter((message) => message.role === "learner").length >= 2 &&
      Boolean(reflection.trim()));
  const learnerMessageCount = messages.filter(
    (message) => message.role === "learner"
  ).length;
  // Shared behavior now owns the former container.scrollTo({ ... }) and distanceFromLatest <= 56 contracts.
  const {
    contentRef: conversationContentRef,
    handleScroll: handleConversationScroll,
    handleTouchMove: handleConversationTouchMove,
    handleTouchStart: handleConversationTouchStart,
    handleWheel: handleConversationWheel,
    scrollRef: conversationScrollRef,
    scrollToLatest,
    showJumpToLatest,
  } = useConversationScroll({
    conversationId: activity.id,
    messageCount: messages.length,
    streaming: isResponding,
  });

  const initialMessages = useMemo<TutorMessage[]>(
    () => [
      {
        id: "mentor-handoff",
        role: "mentor",
        body: `${tutorSelection.handoff} I will stay with you while ${tutorSelection.role} helps with the focused practice.`,
      },
      {
        id: "tutor-opening",
        role: "tutor",
        body: `Hi ${firstName}. I am your ${tutorSelection.role} for ${engine.lesson.title}. I will keep this practical, check understanding when it fits, and keep your Guidance Counselor in the loop as we go.`,
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
      return `Don't worry about the formula yet. ${activePractice.hint} Try that idea on this: ${activePractice.prompt}. Walk me through what you're thinking.`;
    }

    if (learnerAskedForAlternateExplanation(value)) {
      markPhase("coach");
      return teacherResponse;
    }

    if (learnerAskedForCheck(value) && activeQuestion) {
      markPhase("quiz");
      return `Convince me. ${activeQuestion.prompt} Tell me your answer and why you chose it.`;
    }

    if (learnerAskedToWrapUp(value)) {
      markPhase("reflection");
      markPhase("mastery");
      markPhase("recommendation");
      return `Nice work on ${currentConcept}. ${progressLanguage(progress.masteryEstimate, completed)} Here is what I recommend next: ${progress.nextRecommendation}`;
    }

    if (activePractice && !practiceAnswers[activePractice.id]) {
      return `${teacherResponse} When you are ready, try this in your own words: ${activePractice.prompt}`;
    }

    return teacherResponse;
  }

  function buildMentorCheckpoint(value: string, learnerMessageCount: number) {
    if (learnerAskedToWrapUp(value)) {
      return `Nice work, ${firstName}. I have the thread from here. Add a quick reflection if you have not yet, then we will close this lesson and set up the next step.`;
    }

    if (learnerMessageCount > 0 && learnerMessageCount % 2 === 0) {
      return `${firstName}, I am listening for whether this is starting to feel easier in your own words. ${progress.coachingMessage}`;
    }

    return null;
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
    if (!text || completed || responsePendingRef.current) return;

    responsePendingRef.current = true;
    scrollToLatest("smooth");
    setIsResponding(true);
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
      const learnerMessageCount =
        current.filter((message) => message.role === "learner").length + 1;
      const mentorCheckpoint = buildMentorCheckpoint(text, learnerMessageCount);

      if (!mentorCheckpoint) return [...current, learnerMessage, tutorMessage];

      const mentorMessage: TutorMessage = {
        id: messageId("mentor", current.length + 2),
        role: "mentor",
        body: mentorCheckpoint,
      };

      return [...current, learnerMessage, tutorMessage, mentorMessage];
    });
    setLearnerReply("");
    requestAnimationFrame(() => {
      responsePendingRef.current = false;
      setIsResponding(false);
      replyInputRef.current?.focus({ preventScroll: true });
    });
  }

  function handleReplyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    sendLearnerMessage();
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
    <div className="space-y-5">
      <DashboardCard accent="learning">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <section
            id="active-learning-conversation"
            className="flex min-h-[70svh] flex-col overflow-hidden rounded-2xl bg-[#0b1020] lg:min-h-[680px]"
            aria-label="Conversation-first learning session"
            aria-labelledby={`lesson-conversation-title-${activity.id}`}
          >
            <header className="border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-indigo-100">
                    Active learning conversation
                  </p>
                  <h2 id={`lesson-conversation-title-${activity.id}`} className="mt-1 text-xl font-black leading-tight text-white sm:text-2xl">
                    {engine.lesson.title}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[#9aa7b8]">
                    {courseTitle} - {activity.estimated_minutes} min
                  </p>
                </div>
                <ModuleBadge module="learning" label={tutorSelection.role} />
              </div>
            </header>

            <div className="relative min-h-0 flex-1">
              <div
                ref={conversationScrollRef}
                onScroll={handleConversationScroll}
                onWheel={handleConversationWheel}
                onTouchStart={handleConversationTouchStart}
                onTouchMove={handleConversationTouchMove}
                className="h-full space-y-5 overflow-y-auto overscroll-contain px-4 py-6 scroll-smooth motion-reduce:scroll-auto sm:px-6 sm:py-8"
                role="log"
                aria-label="Guidance Counselor Tutor and learner messages"
                aria-live="polite"
                aria-relevant="additions text"
              >
                <section ref={conversationContentRef} className="mx-auto max-w-3xl space-y-5">
                  {messages.map((message, index) => {
                    const groupedWithPrevious =
                      index > 0 && messages[index - 1]?.role === message.role;
                    return (
                      <div
                        key={message.id}
                        className={`flex transition-opacity duration-300 motion-reduce:transition-none ${message.role === "learner" ? "justify-end" : "justify-start"} ${groupedWithPrevious ? "-mt-3" : ""}`}
                      >
                        <div className={`max-w-[92%] sm:max-w-[78%] ${message.role === "learner" ? "text-right" : "text-left"}`}>
                          {!groupedWithPrevious ? (
                            <div className={`mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8] ${message.role === "learner" ? "justify-end" : ""}`}>
                              <span className={`h-2 w-2 rounded-full ${speakerDotClasses(message.role)}`} aria-hidden="true" />
                              <span>{speakerLabel(message.role, firstName, tutorSelection.role)}</span>
                            </div>
                          ) : null}
                          <div className={`${messageBubbleClasses(message.role)} transition duration-200 motion-safe:hover:shadow-md motion-reduce:transition-none`}>
                            <p className="text-sm font-semibold leading-6 sm:text-[0.9375rem] sm:leading-7">
                              {message.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isResponding ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-200" role="status">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-300 motion-reduce:animate-none" aria-hidden="true" />
                      Your learning specialist is responding
                    </div>
                  ) : null}
                </section>
              </div>
              {showJumpToLatest ? (
                <button
                  type="button"
                  onClick={() => scrollToLatest("smooth")}
                  className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-indigo-200/25 bg-[#151c2b]/95 px-4 py-2 text-xs font-black text-indigo-100 shadow-xl backdrop-blur transition hover:border-indigo-200/50 hover:bg-[#1a2334] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 motion-reduce:transition-none"
                  aria-label="Jump to latest Tutor response"
                >
                  Jump to latest
                </button>
              ) : null}
            </div>

            <form
              className="sticky bottom-0 border-t border-white/10 bg-[#0b1020]/95 p-3 shadow-[0_-18px_45px_rgba(5,8,16,0.24)] backdrop-blur-xl sm:p-4"
              onSubmit={(event) => {
                event.preventDefault();
                sendLearnerMessage();
              }}
            >
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Suggested learning prompts">
                {[
                  "Teach simply",
                  "Check me",
                  "Hint",
                  "Another way",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="beast-touch-chip shrink-0 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-black text-[#dbe3ef] transition duration-200 hover:-translate-y-px hover:border-indigo-200/25 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
                    disabled={completed || isResponding}
                    aria-label={`${prompt} prompt`}
                    onClick={() =>
                      sendLearnerMessage(
                        prompt === "Teach simply"
                          ? "Teach this in a simple way."
                          : prompt === "Check me"
                            ? "Check my understanding."
                            : prompt === "Hint"
                              ? "Give me a hint."
                              : "Explain this another way."
                      )
                    }
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-2 shadow-[0_12px_36px_rgba(0,0,0,0.2)] transition focus-within:border-indigo-300/45 focus-within:ring-2 focus-within:ring-indigo-300/10 motion-reduce:transition-none">
                <label className="block" htmlFor={`lesson-reply-${activity.id}`}>
                  <span className="sr-only">Message your specialist</span>
                  <textarea
                    id={`lesson-reply-${activity.id}`}
                    ref={replyInputRef}
                    value={learnerReply}
                    onChange={(event) => setLearnerReply(event.target.value)}
                    rows={2}
                    enterKeyHint="send"
                    className="min-h-16 w-full resize-none bg-transparent px-2 py-2 text-sm font-semibold leading-6 text-white outline-none placeholder:text-[#657187]"
                    placeholder="Ask a question, try an answer, or explain what you think."
                    disabled={completed}
                    onKeyDown={handleReplyKeyDown}
                    aria-describedby={`lesson-input-help-${activity.id} lesson-save-status-${activity.id}`}
                  />
                </label>
                <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-1 pt-2">
                  <span className="text-xs font-semibold text-[#7f8da3]">
                    Enter to send · Shift + Enter for a new line
                  </span>
                  <button
                    type="submit"
                    className="flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-indigo-300 px-3 text-sm font-black text-[#111827] transition hover:bg-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                    disabled={completed || isResponding || !learnerReply.trim()}
                    aria-label={isResponding ? "Sending message" : "Send message"}
                  >
                    <span aria-hidden="true">{isResponding ? "…" : "↑"}</span>
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <p id={`lesson-save-status-${activity.id}`} className="text-xs font-semibold text-[#7f8da3]" role="status" aria-live="polite">
                  {saveStatusLabel(saving, completed, tutorReadyToComplete)}
                </p>
                <p id={`lesson-input-help-${activity.id}`} className="sr-only">
                  Press Enter to send. Press Shift Enter for a new line.
                </p>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xs font-semibold text-[#7f8da3]">
                    {learnerMessageCount < 2
                      ? "Keep exploring"
                      : reflection.trim()
                        ? "Reflection captured"
                        : "Add a reflection to finish"}
                  </span>
                  <button
                    type="button"
                    onClick={finishLesson}
                    disabled={saving || completed || !tutorReadyToComplete}
                    className="beast-button-secondary shrink-0 transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                  >
                    {saving ? "Saving..." : completed ? "Finished" : "Finish lesson"}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <aside className="grid content-start gap-3 rounded-2xl border border-white/10 bg-[#111827] p-4 lg:sticky lg:top-20" aria-label="Guidance Counselor session snapshot">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase text-[#7f8da3]">
                  Guidance Counselor Snapshot
                </div>
                <h3 className="mt-1 font-black text-white">Current session</h3>
              </div>
              <span className="rounded-full bg-indigo-300/15 px-3 py-1 text-xs font-black text-indigo-100">
                {completed ? "Saved" : "Active"}
              </span>
            </div>

            {[
              ["Goal", engine.lesson.learningObjective],
              ["Specialist", tutorSelection.role],
              ["Confidence", confidenceLabel(confidence)],
              ["Guidance Counselor note", progress.coachingMessage],
              ["Progress", progressLanguage(progress.masteryEstimate, completed)],
              ["Next", progress.nextRecommendation],
              ["Save", saveStatusLabel(saving, completed, tutorReadyToComplete)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#0f1419] p-3">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  {label}
                </div>
                <p className="mt-1 text-sm font-semibold leading-5 text-[#dbe3ef]">
                  {value}
                </p>
              </div>
            ))}

            <div className="rounded-xl bg-[#0f1419] p-3">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Current concept
              </div>
              <p className="mt-1 text-sm font-semibold leading-5 text-[#dbe3ef]">
                {currentConcept}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#7f8da3]">
                {askedForHelp ? "Support used in this session." : "Hints are available when needed."}
              </p>
            </div>
          </aside>
        </div>
      </DashboardCard>
    </div>
  );
}
