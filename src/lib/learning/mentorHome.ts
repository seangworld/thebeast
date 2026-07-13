import {
  getLearningActivityRoute,
  getNewestReadyLearningActivity,
  type LearningActivityRunnerRow,
} from "./activityRunner";
import { buildLearningJourneys } from "./journeys";
import type {
  AdaptiveProgressionDecision,
  LearningCourse,
  LearningGoal,
  LearningProgressSignals,
  LearningRecommendation,
  LearningSession,
} from "./types";

export type MentorHomeAction = {
  label: string;
  href: string;
  detail: string;
};

export type MentorHomeMissionState =
  | "first_use"
  | "resume"
  | "next_activity"
  | "review"
  | "completed_queue";

export type MentorHomeMission = {
  state: MentorHomeMissionState;
  greeting: string;
  missionTitle: string;
  missionLabel: string;
  durationLabel: string;
  recommendationReason: string;
  currentGoalLabel: string;
  recentProgressLabel: string;
  weakAreaLabel: string;
  nextAfterLabel: string;
  journeyProgressLabel: string;
  journeyRemainingLabel: string;
  journeyMilestoneLabel: string;
  journeyUnlockLabel: string;
  primaryAction: MentorHomeAction;
  secondaryActions: MentorHomeAction[];
  hasSufficientLearnerData: boolean;
};

type MentorHomeInput = {
  learnerName: string;
  learningGoals: LearningGoal[];
  learningCourses: LearningCourse[];
  learningSessions: LearningSession[];
  learningActivities: LearningActivityRunnerRow[];
  learningRecommendations: LearningRecommendation[];
  progressSignals: LearningProgressSignals;
  adaptiveProgression?: AdaptiveProgressionDecision;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function getActiveGoal(goals: LearningGoal[]) {
  return (
    goals.find((goal) => goal.status === "Active") ||
    goals.find((goal) => goal.status === "Planned") ||
    goals[0]
  );
}

function getLowestProgressCourse(courses: LearningCourse[]) {
  const activeCourses = courses.filter((course) => course.status !== "Completed");
  return [...(activeCourses.length > 0 ? activeCourses : courses)].sort(
    (a, b) => a.progress - b.progress
  )[0];
}

function getLastCompletedSession(sessions: LearningSession[]) {
  return [...sessions].reverse().find((session) => session.status === "Completed");
}

function getLastCompletedActivity(activities: LearningActivityRunnerRow[]) {
  return activities
    .filter((activity) => activity.status === "Completed")
    .sort((a, b) => {
      const aTime = activityTime(a.completed_at || a.created_at);
      const bTime = activityTime(b.completed_at || b.created_at);
      return bTime - aTime;
    })[0];
}

function activityTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatActivityDuration(activity?: LearningActivityRunnerRow | null) {
  if (!activity) return "15 minutes";
  return activity.estimated_minutes > 0
    ? `${activity.estimated_minutes} minutes`
    : "15 minutes";
}

function buildSecondaryActions(): MentorHomeAction[] {
  return [
    {
      label: "My plan",
      href: "#mentor-plan",
      detail: "See the current path without choosing from a dashboard.",
    },
    {
      label: "Courses",
      href: "#courses",
      detail: "Browse available course access when you need it.",
    },
    {
      label: "Certificates",
      href: "#certificates",
      detail: "Review completion and certification evidence.",
    },
    {
      label: "History",
      href: "#wins",
      detail: "Look back at saved progress and achievements.",
    },
  ];
}

function progressionLabel(decision?: AdaptiveProgressionDecision) {
  if (!decision) return "Recommended";

  if (decision.action === "review") return "Review first";
  if (decision.action === "remediate") return "Reinforce";
  if (decision.action === "accelerate") return "Move faster";
  if (decision.action === "skip_mastered_content") return "Skip familiar basics";
  return "Continue";
}

function withAdaptiveReason(baseReason: string, decision?: AdaptiveProgressionDecision) {
  if (!decision) return baseReason;
  return `${baseReason} ${decision.mentorLanguage} Reason: ${decision.explanation}`;
}

function getActiveJourneySummary(goals: LearningGoal[]) {
  const journeys = buildLearningJourneys(goals);
  const activeJourney = journeys.find((journey) => journey.active) || journeys[0];

  if (!activeJourney) {
    return {
      progress: "Journey Progress will appear after you choose a learning goal.",
      remaining: "No remaining-work estimate yet.",
      milestone: "Choose a learning goal",
      unlock: "No unlocks yet.",
    };
  }

  return {
    progress: activeJourney.progressLabel,
    remaining: activeJourney.remainingWorkLabel,
    milestone: activeJourney.nextMilestoneLabel,
    unlock:
      activeJourney.unlockMessage ||
      (activeJourney.estimateIsHonest
        ? "Checkpoint status will update after the next meaningful completion."
        : "This path is still being built, so I cannot give you an honest finish estimate yet."),
  };
}

export function buildMentorHomeMission(
  input: MentorHomeInput
): MentorHomeMission {
  const learnerFirstName = firstName(input.learnerName);
  const activeGoal = getActiveGoal(input.learningGoals);
  const lowestCourse = getLowestProgressCourse(input.learningCourses);
  const unfinishedSession = input.learningSessions.find(
    (session) => session.status === "In progress"
  );
  const openActivity = getNewestReadyLearningActivity(input.learningActivities);
  const lastCompletedSession = getLastCompletedSession(input.learningSessions);
  const lastCompletedActivity = getLastCompletedActivity(input.learningActivities);
  const completedOnlyQueue =
    input.learningActivities.length > 0 &&
    input.learningActivities.every((activity) => activity.status === "Completed");
  const hasSufficientLearnerData =
    input.learningGoals.length > 0 ||
    input.learningCourses.length > 0 ||
    input.learningSessions.length > 0 ||
    input.learningActivities.length > 0;
  const currentGoalLabel =
    activeGoal?.title || lowestCourse?.title || "No active goal selected yet";
  const recentProgressLabel =
    lastCompletedSession?.title ||
    lastCompletedActivity?.title ||
    (hasSufficientLearnerData
      ? "No completed learning session is saved yet."
      : "No prior learning history is available yet.");
  const weakAreaLabel =
    lowestCourse && input.learningCourses.length > 0
      ? `${lowestCourse.title} (${lowestCourse.progress}% progress)`
      : "Not enough course evidence yet";
  const secondaryActions = buildSecondaryActions();
  const adaptiveProgression = input.adaptiveProgression;
  const journeySummary = getActiveJourneySummary(input.learningGoals);

  if (!hasSufficientLearnerData) {
    return {
      state: "first_use",
      greeting: `Hi ${learnerFirstName}. I am your Mentor.`,
      missionTitle: "Set your first learning direction",
      missionLabel: "First step",
      durationLabel: "10 minutes",
      recommendationReason:
        "I do not know your starting point yet, so we will begin with your goal and one simple first question.",
      currentGoalLabel,
      recentProgressLabel,
      weakAreaLabel,
      nextAfterLabel:
        "After this, I can guide you into placement, goal setup, or the first focused lesson.",
      journeyProgressLabel: journeySummary.progress,
      journeyRemainingLabel: journeySummary.remaining,
      journeyMilestoneLabel: journeySummary.milestone,
      journeyUnlockLabel: journeySummary.unlock,
      primaryAction: {
        label: "Set learning context",
        href: "/dashboard/profile",
        detail: "Tell me what you want to learn so I can choose the right first step.",
      },
      secondaryActions: secondaryActions.filter(
        (action) => action.label === "Courses" || action.label === "Certificates"
      ),
      hasSufficientLearnerData,
    };
  }

  if (unfinishedSession) {
    return {
      state: "resume",
      greeting: `Welcome back, ${learnerFirstName}. I found an unfinished session.`,
      missionTitle: unfinishedSession.title,
      missionLabel: "Resume",
      durationLabel: unfinishedSession.duration,
      recommendationReason:
        "You have a session still in progress, so resuming it is the clearest next step before I recommend new work.",
      currentGoalLabel,
      recentProgressLabel,
      weakAreaLabel,
      nextAfterLabel:
        adaptiveProgression?.mentorLanguage ||
        "After you save this session, I will use the result to choose the next lesson or review.",
      journeyProgressLabel: journeySummary.progress,
      journeyRemainingLabel: journeySummary.remaining,
      journeyMilestoneLabel: journeySummary.milestone,
      journeyUnlockLabel: journeySummary.unlock,
      primaryAction: {
        label: "Resume session",
        href: openActivity ? getLearningActivityRoute(openActivity.id) : "#mentor-session",
        detail: "Continue the unfinished learning work.",
      },
      secondaryActions,
      hasSufficientLearnerData,
    };
  }

  if (openActivity) {
    return {
      state: "next_activity",
      greeting: `Hi ${learnerFirstName}. I picked one mission for today.`,
      missionTitle: openActivity.title,
      missionLabel:
        openActivity.status === "Queued"
          ? progressionLabel(adaptiveProgression)
          : "Today's adaptive mission",
      durationLabel: formatActivityDuration(openActivity),
      recommendationReason: withAdaptiveReason(
        lastCompletedActivity || lastCompletedSession
          ? `Your last saved work was ${recentProgressLabel}, so this is the next available activity in your learning path.`
          : `This is the next available activity for ${currentGoalLabel}. I am using assigned learning activity data, not invented history.`,
        adaptiveProgression
      ),
      currentGoalLabel,
      recentProgressLabel,
      weakAreaLabel,
      nextAfterLabel:
        adaptiveProgression?.shouldSkipMasteredContent
          ? "After this, I will keep skipping familiar basics when your evidence supports it."
          : adaptiveProgression?.nextFocus
            ? `After this, I will decide whether to continue, review, remediate, or advance around ${adaptiveProgression.nextFocus}.`
            : input.learningRecommendations[0]?.recommendedAction ||
              "After this, your Mentor will review the result and choose the next useful step.",
      journeyProgressLabel: journeySummary.progress,
      journeyRemainingLabel: journeySummary.remaining,
      journeyMilestoneLabel: journeySummary.milestone,
      journeyUnlockLabel: journeySummary.unlock,
      primaryAction: {
        label: "Start mission",
        href: getLearningActivityRoute(openActivity.id),
        detail: "Bring in the Tutor for this focused activity.",
      },
      secondaryActions,
      hasSufficientLearnerData,
    };
  }

  if (completedOnlyQueue) {
    return {
      state: "completed_queue",
      greeting: `Nice work, ${learnerFirstName}. Your assigned activity queue is complete.`,
      missionTitle: "Choose the next useful step with your Mentor",
      missionLabel: "Next planning moment",
      durationLabel: "10 minutes",
      recommendationReason:
        withAdaptiveReason(
          "All currently assigned activities are completed, so I am not sending you back into a finished queue.",
          adaptiveProgression
        ),
      currentGoalLabel,
      recentProgressLabel,
      weakAreaLabel,
      nextAfterLabel:
        lowestCourse && lowestCourse.progress < 100
          ? `Next, I will look for a focused review or lesson connected to ${lowestCourse.title}.`
          : "Next, I will help you select a new goal, course, or certification path.",
      journeyProgressLabel: journeySummary.progress,
      journeyRemainingLabel: journeySummary.remaining,
      journeyMilestoneLabel: journeySummary.milestone,
      journeyUnlockLabel: journeySummary.unlock,
      primaryAction: {
        label: "Review next step",
        href: "#mentor-plan",
        detail: "Use the Mentor plan area to decide what should come after the completed queue.",
      },
      secondaryActions,
      hasSufficientLearnerData,
    };
  }

  return {
    state: "review",
    greeting: `Hi ${learnerFirstName}. I can see enough to recommend a review.`,
      missionTitle: input.progressSignals.recommendedNextAction,
    missionLabel: progressionLabel(adaptiveProgression),
    durationLabel:
      input.progressSignals.estimatedWeeklyStudyMinutes > 0 ? "20 minutes" : "15 minutes",
    recommendationReason: withAdaptiveReason(
      lowestCourse && lowestCourse.progress < 100
        ? `${lowestCourse.title} has the lowest mapped progress in your current course data, so I am making that the next review focus.`
        : input.learningRecommendations[0]?.reason ||
          "Your current learning data suggests a short Mentor review before starting new work.",
      adaptiveProgression
    ),
    currentGoalLabel,
    recentProgressLabel,
    weakAreaLabel,
    nextAfterLabel:
      adaptiveProgression?.nextFocus
        ? `Next decision point: ${adaptiveProgression.nextFocus}.`
        : input.learningRecommendations[0]?.recommendedAction ||
          "After review, I will help choose the next activity or course.",
    journeyProgressLabel: journeySummary.progress,
    journeyRemainingLabel: journeySummary.remaining,
    journeyMilestoneLabel: journeySummary.milestone,
    journeyUnlockLabel: journeySummary.unlock,
    primaryAction: {
      label: "Review with Mentor",
      href: "#mentor-session",
      detail: "Use the Mentor home to confirm the next focused step.",
    },
    secondaryActions,
    hasSufficientLearnerData,
  };
}
