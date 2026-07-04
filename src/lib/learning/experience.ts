import { learningOnboardingSteps } from "./onboarding";
import { mockLearningCertificates } from "./certificates";
import { buildGamificationProfile } from "./gamification";
import { buildLearnerInsights } from "./insights";
import { buildLearningJourneys } from "./journeys";
import { buildMotivationSnapshot } from "./motivation";
import { buildStudyHabitsSnapshot } from "./studyHabits";
import type {
  ExpandedLearnerProfile,
  LearningAchievementUnlock,
  LearningExperienceDashboard,
  LearningGoal,
  LearningProgressSignals,
  ParentDashboard,
} from "./types";

function buildPolishedAchievements(achievements: LearningAchievementUnlock[]) {
  return achievements.map((achievement) => ({
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    rarity: achievement.id === "founding-student" ? "Founding" as const : achievement.threshold >= 7 ? "Rare" as const : "Common" as const,
    earnedDate: achievement.unlocked ? "2026-07-04" : undefined,
    progress: Math.round((achievement.progress / achievement.threshold) * 100),
    locked: !achievement.unlocked,
    foundingBadge: achievement.id === "founding-student",
    celebrationMessage: achievement.unlocked
      ? `${achievement.title} unlocked.`
      : `${achievement.title} is getting closer.`,
  }));
}

function buildExpandedLearnerProfile({
  learnerName,
  progress,
  gamification,
  achievements,
  currentJourney,
}: {
  learnerName: string;
  progress: LearningProgressSignals;
  gamification: ReturnType<typeof buildGamificationProfile>;
  achievements: LearningAchievementUnlock[];
  currentJourney: string;
}): ExpandedLearnerProfile {
  return {
    learnerName,
    bioPlaceholder: "Future learner bio and context notes will live here.",
    favoriteSubjects: ["Cybersecurity", "Math"],
    currentStreak: progress.currentStreakDays,
    xp: gamification.xp,
    level: gamification.level,
    achievements: achievements.filter((achievement) => achievement.unlocked).length,
    certificates: mockLearningCertificates.length,
    skills: gamification.skillLevels.map((skill) => skill.skill),
    currentJourney,
    learningStatistics: [
      `${progress.sessionsCompleted} sessions completed`,
      `${progress.estimatedWeeklyStudyMinutes} planned weekly minutes`,
      `${progress.progressPercentage}% journey progress`,
    ],
  };
}

export function buildLearningExperienceDashboard({
  learnerName,
  progress,
  goals,
  achievements,
  parentDashboard,
}: {
  learnerName: string;
  progress: LearningProgressSignals;
  goals: LearningGoal[];
  achievements: LearningAchievementUnlock[];
  parentDashboard: ParentDashboard;
}): LearningExperienceDashboard {
  const habits = buildStudyHabitsSnapshot();
  const gamification = buildGamificationProfile({
    progress,
    masteredConcepts: 1,
  });
  const motivation = buildMotivationSnapshot({ progress, habits });
  const journeys = buildLearningJourneys(goals);
  const activeJourney = journeys.find((journey) => journey.active) || journeys[0];

  return {
    onboarding: learningOnboardingSteps,
    daily: {
      todaysMission: "Review the weak area, complete one focused lesson, then stop clean.",
      nextAction: progress.recommendedNextAction,
      continueLearning: activeJourney?.title || "Starter path",
      flashcardsDue: 3,
      studyStreak: progress.currentStreakDays,
      achievements: achievements.filter((achievement) => achievement.unlocked).map((achievement) => achievement.title),
      recommendedSession: "35 min focused review",
      upcomingMilestone: activeJourney?.steps.find((step) => step.status === "active")?.title || "First milestone",
      celebration: motivation.celebrationMessage,
    },
    focusMode: {
      lessonTitle: "Access Control",
      progressPercent: progress.progressPercentage,
      timerPlaceholder: "35 min focus block",
      notesPlaceholder: "Capture the one thing that finally clicked.",
      bookmarked: true,
      exitLabel: "Exit focus mode",
    },
    journeys,
    achievements: buildPolishedAchievements(achievements),
    certificate: {
      title: mockLearningCertificates[0]?.pathName || "Completion Certificate",
      learnerName,
      completionSummary: "Completed a structured BeastLearning foundation path.",
      skillsEarned: ["Security Foundations", "Study Rhythm", "Review Discipline"],
      sharePlaceholder: "Share certificate placeholder",
      downloadPlaceholder: "Download certificate placeholder",
      verificationPlaceholder:
        mockLearningCertificates[0]?.verificationPlaceholder || "Future verification placeholder.",
    },
    motivation,
    habits,
    insights: buildLearnerInsights({ progress, habits, gamification }),
    gamification,
    accessibility: {
      largerTextOption: true,
      highContrastPlaceholder: true,
      keyboardNavigation: ["Focus mode controls", "Onboarding choices", "Dashboard cards"],
      reducedMotionPlaceholder: true,
      screenReaderLabels: ["Daily mission", "Journey progress", "Focus mode"],
    },
    learnerProfile: buildExpandedLearnerProfile({
      learnerName,
      progress,
      gamification,
      achievements,
      currentJourney: activeJourney?.title || "Starter journey",
    }),
    parentExperience: {
      weeklyWins: parentDashboard.learners[0]?.achievements || [],
      areasNeedingEncouragement:
        parentDashboard.learners[0]?.areasNeedingAttention || [],
      recentAchievements: achievements
        .filter((achievement) => achievement.unlocked)
        .map((achievement) => achievement.title)
        .slice(0, 3),
      studyConsistency: `${habits.consistency}% consistent`,
      nextConversationSuggestions: [
        parentDashboard.learners[0]?.nextRecommendedParentAction ||
          "Ask what felt easiest this week.",
        "Ask which session should be protected next.",
      ],
    },
    beta: {
      badges: ["Founding Student", "Founder", "Beta Tester"],
      versionHistory: [
        "v0.3 Intelligence Foundation",
        "v0.4 Content & Study Intelligence",
        "v0.5 Learning Experience",
      ],
      feedbackShortcut: "Open beta feedback",
      whatsNew: ["Daily mission", "Focus mode", "Journey roadmap", "Motivation engine"],
    },
  };
}
