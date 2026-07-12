import type {
  GeneratedLearningPlan,
  LearningGoalBuilderDraft,
} from "./types";
import { getSampleActivityTitleForGoal } from "./sampleContentRegistry";

function clean(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function getGeneratedLearningSubject(draft: LearningGoalBuilderDraft) {
  return clean(draft.learningObjective, "Learning Path");
}

export function getGeneratedActivityTitle(draft: LearningGoalBuilderDraft) {
  const subject = getGeneratedLearningSubject(draft);
  const objective = clean(draft.learningObjective, subject);

  return getSampleActivityTitleForGoal(objective) || `Start ${objective}`;
}

export function buildGeneratedLearningActivityPayload({
  userId,
  learnerProfileId,
  courseId,
  planId,
  sessionId,
  draft,
  generatedPlan,
  sortOrder,
}: {
  userId: string;
  learnerProfileId: string;
  courseId: string;
  planId: string;
  sessionId: string;
  draft: LearningGoalBuilderDraft;
  generatedPlan: GeneratedLearningPlan;
  sortOrder: number;
}) {
  return {
    user_id: userId,
    learner_profile_id: learnerProfileId,
    course_id: courseId,
    plan_id: planId,
    session_id: sessionId,
    activity_type: "Lesson",
    title: getGeneratedActivityTitle(draft),
    difficulty:
      draft.currentLevel === "Intermediate" || draft.currentLevel === "Advanced"
        ? "Adaptive"
        : "Beginner",
    estimated_minutes:
      generatedPlan.recommendedSessions[0]?.duration.includes("45") ? 45 : 35,
    xp: 20,
    status: "Ready",
    sort_order: sortOrder,
  };
}
