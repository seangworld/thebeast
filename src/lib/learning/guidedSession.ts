import type { LearningActivityRunnerRow } from "./activityRunner";
import type { LessonEngineProgress } from "./lessonEngine";
import type { LearnerReflectionOutcome } from "./reflectionEngine";
import type { TutorSelection } from "./tutorOrchestration";

export type GuidedLearningSessionState =
  | "not_started"
  | "in_progress"
  | "paused"
  | "completed"
  | "remediation_required"
  | "mastery_check_required"
  | "review_due";

export type GuidedLearningSession = {
  state: GuidedLearningSessionState;
  objective: string;
  mentorIntroduction: string;
  goalConnection: string;
  tutorHandoff: string;
  expectedTime: string;
  mentorReturn: string;
  recap: {
    completed: string;
    strengths: string[];
    weakConcepts: string[];
    meaning: string;
    nextStep: string;
  };
};

type GuidedLearningSessionInput = {
  activity: LearningActivityRunnerRow;
  courseTitle: string;
  goalTitle?: string;
  progress: LessonEngineProgress;
  tutorSelection: TutorSelection;
  hasDraft: boolean;
  reflectionOutcome?: LearnerReflectionOutcome;
};

function getState(input: GuidedLearningSessionInput): GuidedLearningSessionState {
  if (input.activity.status === "Completed") return "completed";
  if (input.progress.recommendedReview) return "remediation_required";
  if (input.progress.readyToComplete) return "mastery_check_required";
  if (input.hasDraft || input.activity.status === "In progress") return "paused";
  if (input.activity.status === "Ready" || input.activity.status === "Queued") {
    return "not_started";
  }

  return "in_progress";
}

export function buildGuidedLearningSession(
  input: GuidedLearningSessionInput
): GuidedLearningSession {
  const expectedTime =
    input.activity.estimated_minutes > 0
      ? `${input.activity.estimated_minutes} minutes`
      : "15 minutes";
  const objective = input.activity.title;
  const goalConnection = input.goalTitle
    ? `This supports your goal: ${input.goalTitle}.`
    : `This connects to your current ${input.courseTitle} path.`;
  const state = getState(input);
  const weakConcepts =
    input.progress.completionReviewReasons.length > 0
      ? input.progress.completionReviewReasons
      : input.progress.recommendedReview
        ? ["Review is recommended before advancing."]
      : [];
  const practicePercent =
    input.progress.practiceTotal > 0
      ? Math.round((input.progress.practiceCorrect / input.progress.practiceTotal) * 100)
      : 100;
  const strengths = [
    practicePercent >= 70 ? "Practice evidence is moving in the right direction." : "",
    input.progress.quizPercent >= 70 ? "Check-in answers show usable recall." : "",
    input.progress.masteryEstimate >= 70 ? "Overall mastery signal is strengthening." : "",
  ].filter(Boolean);
  const nextStep =
    input.reflectionOutcome?.nextAction || input.progress.nextRecommendation;

  return {
    state,
    objective,
    expectedTime,
    mentorIntroduction: `Today we are working on ${objective}. I selected this because it is the next useful step in ${input.courseTitle}.`,
    goalConnection,
    tutorHandoff: input.tutorSelection.handoff,
    mentorReturn: `Your ${input.tutorSelection.role} will hand the result back to me so I can choose the next step.`,
    recap: {
      completed:
        state === "completed"
          ? `${objective} is saved.`
          : `${objective} has current progress saved for this device and account.`,
      strengths:
        strengths.length > 0 ? strengths : ["You stayed with the session long enough to create learning evidence."],
      weakConcepts:
        weakConcepts.length > 0 ? weakConcepts : ["No urgent weak concept was identified from this session."],
      meaning: input.progress.mastered
        ? "This result suggests you are ready to continue."
        : "This result suggests the Mentor should reinforce or review before moving too quickly.",
      nextStep,
    },
  };
}
