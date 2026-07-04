import type {
  GeneratedLearningPlan,
  LearningGoalBuilderDraft,
} from "./types";

function clean(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getSessionCount(studyPace: string) {
  if (studyPace.includes("Light")) return 2;
  if (studyPace.includes("Focused")) return 5;
  if (studyPace.includes("Intensive")) return 7;
  return 3;
}

function getSessionDuration(studyPace: string) {
  if (studyPace.includes("Light")) return "25 min";
  if (studyPace.includes("Intensive")) return "45 min";
  return "35 min";
}

function getReadinessSummary(draft: LearningGoalBuilderDraft) {
  const filledFields = Object.values(draft).filter(
    (value) => value.trim().length > 0
  ).length;

  if (filledFields === 6) {
    return "Ready for a starter plan. The goal has motivation, outcome, timeline, level, and pace.";
  }

  if (filledFields >= 3) {
    return "Partially ready. Add the missing goal details before turning this into a durable plan.";
  }

  return "Not ready yet. Define the goal, outcome, timeline, current level, and pace first.";
}

function getLevelCheckpoint(currentLevel: string) {
  if (currentLevel === "Brand new" || currentLevel === "Beginner") {
    return "Confirm core vocabulary and first-principles understanding.";
  }

  if (currentLevel === "Advanced") {
    return "Validate advanced application, speed, and weak spots.";
  }

  return "Identify gaps between current understanding and the target outcome.";
}

export function generateLearningPlan(
  draft: LearningGoalBuilderDraft
): GeneratedLearningPlan {
  const objective = clean(draft.learningObjective, "New learning goal");
  const motivation = clean(draft.motivation, "Build confidence and momentum");
  const targetOutcome = clean(draft.targetOutcome, "Create a clear outcome");
  const timeline = clean(draft.timeline, "a flexible timeline");
  const currentLevel = clean(draft.currentLevel, "Not set");
  const studyPace = clean(draft.studyPace, "Steady: 3-4 sessions per week");
  const sessionCount = getSessionCount(studyPace);
  const sessionDuration = getSessionDuration(studyPace);

  return {
    title: `${objective} starter plan`,
    milestones: [
      `Map the baseline from ${currentLevel.toLowerCase()} to the target outcome.`,
      `Build the first study loop around ${motivation.toLowerCase()}.`,
      `Complete a focused practice block for ${objective}.`,
      `Review progress against "${targetOutcome}" before ${timeline}.`,
    ],
    recommendedSessions: [
      {
        id: "foundation-session",
        title: "Foundation scan",
        focus: `Define key concepts, known gaps, and resources for ${objective}.`,
        duration: sessionDuration,
        cadence: "Session 1",
      },
      {
        id: "guided-practice-session",
        title: "Guided practice",
        focus: `Practice toward "${targetOutcome}" with notes on friction points.`,
        duration: sessionDuration,
        cadence: "Session 2",
      },
      {
        id: "review-session",
        title: "Review and checkpoint",
        focus: "Summarize what stuck, what did not, and what needs repetition.",
        duration: sessionDuration,
        cadence: sessionCount > 2 ? "Session 3" : "Weekly review",
      },
    ],
    weeklyRhythm: [
      `${sessionCount} study sessions per week`,
      `${sessionDuration} per focused session`,
      "One short review after every practice block",
      "One weekly checkpoint before planning the next week",
    ],
    skillCheckpoints: [
      getLevelCheckpoint(currentLevel),
      `Explain the goal in plain language: ${objective}.`,
      `Demonstrate progress toward "${targetOutcome}".`,
      "Name the next blocker before adding more material.",
    ],
    suggestedNextAction: `Schedule the first ${sessionDuration} foundation scan for ${objective}.`,
    readinessSignal: {
      label: "Starter-ready",
      confidence: "reserved",
      summary: getReadinessSummary(draft),
    },
  };
}
