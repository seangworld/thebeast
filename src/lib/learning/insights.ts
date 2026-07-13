import type {
  GamificationProfile,
  LearnerInsight,
  LearningProgressSignals,
  MasteryProfile,
  ProgressPrediction,
  StudyHabitsSnapshot,
} from "./types";

function readableList(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function formatTopic(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readinessLabel(score: number) {
  if (score >= 80) return "ready for a challenge";
  if (score >= 60) return "ready with review";
  if (score >= 40) return "still building";
  return "early";
}

export function buildLearnerInsights({
  progress,
  habits,
  gamification,
  mastery,
  prediction,
}: {
  progress: LearningProgressSignals;
  habits: StudyHabitsSnapshot;
  gamification: GamificationProfile;
  mastery?: MasteryProfile;
  prediction?: ProgressPrediction;
}): LearnerInsight[] {
  const strongestSubjects = habits.favoriteSubjects.length
    ? habits.favoriteSubjects.slice(0, 2)
    : mastery?.strongestConcepts.slice(0, 2).map(formatTopic) || [];
  const improvingSkill = [...gamification.skillLevels]
    .sort((a, b) => b.progress - a.progress)[0];
  const weakestTopic = mastery?.weakConcepts[0]
    ? formatTopic(mastery.weakConcepts[0])
    : progress.weakArea;
  const retentionTopic =
    mastery?.suggestedReviewTopics.find(
      (topic) => !mastery.strongestConcepts.includes(topic)
    ) || progress.weakArea;
  const readinessScore = prediction?.readiness ?? progress.readinessScore;
  const studyTime =
    progress.estimatedWeeklyStudyMinutes > 0
      ? `${progress.estimatedWeeklyStudyMinutes} minutes`
      : habits.averageSessionLength;

  return [
    {
      id: "strongest-subjects",
      title: "Strongest subjects",
      detail: strongestSubjects.length
        ? `${readableList(strongestSubjects)} look strongest right now. Keep one short review in the mix so those gains stay solid.`
        : "There is not enough subject history yet to name a strongest area. Complete a lesson and a check-in first.",
      tone: "positive",
    },
    {
      id: "weakest-subject",
      title: "Weakest subject",
      detail: `${weakestTopic} needs the most support. Start there before adding harder material.`,
      tone: "warning",
    },
    {
      id: "improving-skill",
      title: "Improving skill",
      detail: improvingSkill
        ? `${improvingSkill.skill} is moving in the right direction. You are ${improvingSkill.progress}% of the way through the current level.`
        : "Your next improving skill will appear after a few more practice attempts.",
      tone: "positive",
    },
    {
      id: "declining-retention",
      title: "Retention watch",
      detail: `${formatTopic(retentionTopic)} should come back for a short review soon. That keeps old learning from getting shaky while you move forward.`,
      tone: "warning",
    },
    {
      id: "study-recommendation",
      title: "Study recommendation",
      detail:
        habits.weeklyMomentum >= habits.monthlyMomentum
          ? `Your rhythm improved this week. Use ${habits.averageSessionLength} for one focused review, then continue with the next lesson.`
          : `Your weekly rhythm dipped. Keep the next session short: review ${weakestTopic}, then stop before it turns into a grind.`,
      tone: habits.weeklyMomentum >= habits.monthlyMomentum ? "positive" : "warning",
    },
    {
      id: "estimated-readiness",
      title: "Estimated readiness",
      detail: `You look ${readinessLabel(readinessScore)} right now at about ${readinessScore}% readiness. That estimate is based on completed work, study time, and recent practice, including ${studyTime} of study evidence.`,
      tone: readinessScore >= 60 ? "positive" : "neutral",
    },
  ];
}
