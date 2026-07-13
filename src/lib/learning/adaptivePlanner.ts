import type {
  AdaptivePlan,
  AdaptiveProgressionDecision,
  LearningGoal,
  LearningMemory,
  MasteryProfile,
  WeaknessAnalysis,
  LearningCourse,
  LearningSession,
} from "./types";
import type { LearningActivityRunnerRow } from "./activityRunner";
import type { ConfidenceIntelligenceSnapshot } from "./confidenceIntelligence";
import type { LearningTimelineEvent } from "./learningTimeline";

export function buildAdaptiveLearningPlan({
  goals,
  mastery,
  memory,
  weakness,
  availableStudyMinutes,
  learningPace,
  completedWorkCount,
}: {
  goals: LearningGoal[];
  mastery: MasteryProfile;
  memory: LearningMemory;
  weakness: WeaknessAnalysis;
  availableStudyMinutes: number;
  learningPace: string;
  completedWorkCount: number;
}): AdaptivePlan {
  const primaryGoal = goals.find((goal) => goal.status === "Active") || goals[0];
  const reviewConcept = weakness.lowMasteryConcepts[0] || weakness.repeatedReviewNeeds[0] || memory.recentlyStudied[0];
  const newConcept = mastery.weakConcepts[1] || mastery.suggestedReviewTopics[0] || "next-concept";
  const sessionCount = Math.max(1, Math.floor(availableStudyMinutes / 30));
  const progressionDecision = decideAdaptiveProgression({
    goals,
    mastery,
    weakness,
    memory,
    availableStudyMinutes,
    learningPace,
  });

  return {
    updatedMilestones: [
      `Protect ${primaryGoal?.title || "current goal"} momentum.`,
      `Review ${reviewConcept}.`,
      `Complete ${sessionCount} focused session${sessionCount === 1 ? "" : "s"} this week.`,
    ],
    reorderedSessions: [reviewConcept, newConcept, ...memory.recentlyStudied].filter(Boolean),
    reviewSessions: weakness.repeatedReviewNeeds.slice(0, 3),
    nextRecommendedLesson: reviewConcept,
    progressionDecision,
    estimatedCompletion:
      completedWorkCount > 3 && learningPace.includes("Focused")
        ? "4-6 weeks"
        : "6-10 weeks",
  };
}

function averageSessionMinutes(sessions: LearningSession[]) {
  const durations = sessions
    .filter((session) => session.status === "Completed")
    .map((session) => Number(session.duration.match(/(\d+)/)?.[1] || 0))
    .filter((duration) => duration > 0);

  if (durations.length === 0) return null;
  return Math.round(durations.reduce((total, duration) => total + duration, 0) / durations.length);
}

function strongestCompletedConcept(mastery: MasteryProfile) {
  return (
    mastery.concepts
      .filter((concept) => concept.masteryPercent >= 85 && concept.confidence === "high")
      .sort((a, b) => b.masteryPercent - a.masteryPercent)[0]?.conceptId ||
    mastery.strongestConcepts[0]
  );
}

export function decideAdaptiveProgression({
  goals,
  mastery,
  weakness,
  memory,
  availableStudyMinutes = 0,
  learningPace = "",
  courses = [],
  sessions = [],
  activities = [],
  confidence,
  timeline = [],
}: {
  goals: LearningGoal[];
  mastery: MasteryProfile;
  weakness: WeaknessAnalysis;
  memory: LearningMemory;
  availableStudyMinutes?: number;
  learningPace?: string;
  courses?: LearningCourse[];
  sessions?: LearningSession[];
  activities?: LearningActivityRunnerRow[];
  confidence?: ConfidenceIntelligenceSnapshot;
  timeline?: LearningTimelineEvent[];
}): AdaptiveProgressionDecision {
  const primaryGoal = goals.find((goal) => goal.status === "Active") || goals[0];
  const lowCourse = courses
    .filter((course) => course.status !== "Completed")
    .sort((a, b) => a.progress - b.progress)[0];
  const completedActivities = activities.filter((activity) => activity.status === "Completed");
  const weakConcept =
    weakness.lowMasteryConcepts[0] ||
    completedActivities.find((activity) => (activity.session_weak_concepts?.length || 0) > 0)
      ?.session_weak_concepts?.[0] ||
    lowCourse?.title ||
    mastery.weakConcepts[0] ||
    memory.frequentlyMissed[0] ||
    primaryGoal?.title ||
    "the current goal";
  const reviewTopic =
    timeline.find((event) => event.type === "review_scheduled")?.title ||
    confidence?.dimensions.find((dimension) => dimension.level === "review-due")
      ?.learnerLanguage ||
    weakness.repeatedReviewNeeds[0] ||
    mastery.suggestedReviewTopics[0] ||
    memory.recentlyStudied[0] ||
    weakConcept;
  const masteredConcept = strongestCompletedConcept(mastery);
  const hasRetentionReview =
    confidence?.dimensions.some((dimension) => dimension.level === "review-due") ||
    timeline.some((event) => event.type === "review_scheduled");
  const hasReflectionConcern = completedActivities.some(
    (activity) =>
      activity.reflection_option === "I guessed" ||
      activity.reflection_option === "I'm frustrated" ||
      activity.reflection_confidence_adjustment === "lower-confidence" ||
      activity.reflection_confidence_adjustment === "reduce-pressure"
  );
  const hasDifficultyEvidence =
    weakness.lowMasteryConcepts.length > 0 ||
    weakness.slowProgressConcepts.length > 0 ||
    timeline.some((event) => event.type === "difficulty_detected") ||
    completedActivities.some((activity) => (activity.session_weak_concepts?.length || 0) > 0) ||
    Boolean(lowCourse && lowCourse.progress < 45);
  const averageMinutes = averageSessionMinutes(sessions);
  const strongConfidence =
    confidence?.dimensions.some(
      (dimension) => dimension.id === "knowledge" && dimension.level === "strong"
    ) || mastery.confidence === "high";
  const advancedEvidence =
    mastery.overallMasteryPercent >= 80 &&
    strongConfidence &&
    completedActivities.length >= 2 &&
    !hasRetentionReview &&
    !hasReflectionConcern;
  const learnerPace =
    advancedEvidence || learningPace.toLowerCase().includes("focused")
      ? "advanced"
      : hasReflectionConcern ||
          weakness.inconsistentStudyHabits ||
          (averageMinutes !== null && averageMinutes > 35) ||
          availableStudyMinutes < 45
        ? "slow"
        : "average";

  if (hasRetentionReview) {
    return {
      action: "review",
      learnerPace,
      nextFocus: reviewTopic,
      explanation:
        "A previous skill is due for a short follow-up before adding more new material.",
      mentorLanguage:
        "I want to check retention first so new learning has somewhere solid to attach.",
      shouldSkipMasteredContent: false,
      evidence: ["retention", "timeline", "confidence"].filter(Boolean),
    };
  }

  if (hasReflectionConcern || hasDifficultyEvidence) {
    return {
      action: "remediate",
      learnerPace,
      nextFocus: weakConcept,
      explanation:
        "Recent answers, reflection, or progress show this topic needs one smaller step before advancing.",
      mentorLanguage:
        "I am going to slow this down and reinforce the part that looks shaky before we move on.",
      shouldSkipMasteredContent: false,
      evidence: ["mastery", "reflection", "course progress", "timeline"],
    };
  }

  if (advancedEvidence && masteredConcept) {
    return {
      action: "skip_mastered_content",
      learnerPace,
      nextFocus: mastery.weakConcepts[0] || memory.recentlyStudied[0] || masteredConcept,
      explanation:
        `${masteredConcept} looks familiar enough to skip repeated basics and spend time on the next useful challenge.`,
      mentorLanguage:
        "You have enough evidence here that I will skip the familiar basics and move you into a stronger challenge.",
      shouldSkipMasteredContent: true,
      evidence: ["mastery", "confidence", "completed work"],
    };
  }

  if (mastery.overallMasteryPercent >= 70 && learnerPace === "advanced") {
    return {
      action: "accelerate",
      learnerPace,
      nextFocus: mastery.weakConcepts[0] || memory.recentlyStudied[0] || primaryGoal?.title || "the next challenge",
      explanation:
        "The evidence is strong enough to move faster while still checking for weak spots.",
      mentorLanguage:
        "I can move at a quicker pace here and still keep an eye on anything that needs review.",
      shouldSkipMasteredContent: false,
      evidence: ["mastery", "confidence", "pace"],
    };
  }

  return {
    action: "continue",
    learnerPace,
    nextFocus:
      mastery.weakConcepts[0] ||
      memory.recentlyStudied[0] ||
      lowCourse?.title ||
      primaryGoal?.title ||
      "the current goal",
    explanation:
      "The current evidence supports continuing with the next focused step.",
    mentorLanguage:
      "We will keep going with one focused step, then I will use the result to decide whether to review, reinforce, or advance.",
    shouldSkipMasteredContent: false,
    evidence: ["mastery", "confidence", "timeline"],
  };
}
