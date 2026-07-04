import type { PlatformRecommendation, PlatformSeverity } from "../platform/types";

export type LearningPriority = "High" | "Medium" | "Low";
export type LearningStatus = "Active" | "Planned" | "Paused" | "Completed";
export type LearningCourseStatus = "In progress" | "Planned" | "Queued" | "Completed";
export type LearningSessionStatus = "Scheduled" | "In progress" | "Completed" | "Skipped";
export type LearningSignalKind =
  | "goal"
  | "course"
  | "session"
  | "progress"
  | "achievement"
  | "recommendation";

export type LearnerProfile = {
  id: string;
  name: string;
  role: string;
  focus: string;
  active: boolean;
};

export type LearningGoal = {
  id: string;
  learnerId: string;
  title: string;
  category: string;
  target: string;
  progress: number;
  status: LearningStatus;
  priority: LearningPriority;
};

export type LearningCourse = {
  id: string;
  goalId?: string;
  title: string;
  category: string;
  progress: number;
  estimatedCompletion: string;
  status: LearningCourseStatus;
  priority: LearningPriority;
};

export type LearningPlan = {
  id: string;
  learnerId: string;
  title: string;
  summary: string;
  primaryGoalId?: string;
  currentCourseId?: string;
  weeklySessionTarget: number;
};

export type LearningSession = {
  id: string;
  learnerId: string;
  courseId?: string;
  title: string;
  courseTitle: string;
  when: string;
  duration: string;
  status: LearningSessionStatus;
};

export type LearningProgress = {
  id: string;
  learnerId: string;
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: "blue" | "green" | "yellow" | "red" | "purple";
  numericValue?: number;
};

export type LearningAchievement = {
  id: string;
  learnerId: string;
  title: string;
  detail: string;
  earned: boolean;
  earnedAt?: string;
};

export type LearningRecommendation = PlatformRecommendation & {
  module: "learning";
};

export type LearningSignal = {
  id: string;
  learnerId: string;
  kind: LearningSignalKind;
  title: string;
  summary: string;
  severity: PlatformSeverity;
  timestamp: string;
  sourceId?: string;
};

export type LearningGoalBuilderDraft = {
  learningObjective: string;
  motivation: string;
  targetOutcome: string;
  timeline: string;
  currentLevel: string;
  studyPace: string;
};

export type LearningGoalBuilderStatus = "empty" | "active" | "completed";

export type LearningQuickAction = {
  id: string;
  label: string;
  detail: string;
  active: boolean;
};
