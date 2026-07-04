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

export type StudySessionCommand = {
  id: string;
  sessionId: string;
  currentFocus: string;
  estimatedTime: string;
  warmUpPrompt: string;
  guidedPracticeStep: string;
  reflectionCheckpoint: string;
  progressFeedback: string;
};

export type StudySessionCommandStatus = "idle" | "started" | "completed";

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

export type LearningProgressTile = {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: "blue" | "green" | "yellow" | "red" | "purple";
};

export type LearningProgressSignals = {
  activeGoalsCount: number;
  currentStreakDays: number;
  sessionsCompleted: number;
  estimatedWeeklyStudyMinutes: number;
  progressPercentage: number;
  readinessScore: number;
  weakArea: string;
  recommendedNextAction: string;
  snapshotTiles: LearningProgressTile[];
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

export type GeneratedLearningSession = {
  id: string;
  title: string;
  focus: string;
  duration: string;
  cadence: string;
};

export type GeneratedLearningPlan = {
  title: string;
  milestones: string[];
  recommendedSessions: GeneratedLearningSession[];
  weeklyRhythm: string[];
  skillCheckpoints: string[];
  suggestedNextAction: string;
  readinessSignal: {
    label: string;
    confidence: "reserved";
    summary: string;
  };
};

export type LearningQuickAction = {
  id: string;
  label: string;
  detail: string;
  active: boolean;
};

export type LearningPathTemplate = {
  id: string;
  templateName: string;
  audience: string;
  goalType: string;
  milestones: string[];
  exampleSessions: string[];
  recommendedPace: string;
  suggestedNextStep: string;
};

export type GuidanceGoalType =
  | "Career"
  | "College path"
  | "Certification"
  | "Trade"
  | "Promotion"
  | "Skill goal";

export type GuidanceCounselorInput = {
  goalType: GuidanceGoalType;
  futureGoal: string;
};

export type GuidanceCounselorRoadmap = {
  title: string;
  startingPoint: string;
  requiredEducationOrTraining: string[];
  skillsToBuild: string[];
  suggestedMilestones: string[];
  estimatedTimeline: string;
  questionsToConsider: string[];
  nextRecommendedAction: string;
  previewLabel: string;
};

export type LearningAchievementTrigger =
  | "first_session"
  | "study_streak"
  | "sessions_completed"
  | "goals_created"
  | "goals_completed"
  | "path_progress"
  | "skills_mastered"
  | "founding_student";

export type LearningAchievementCatalogItem = {
  id: string;
  title: string;
  description: string;
  trigger: LearningAchievementTrigger;
  threshold: number;
};

export type LearningAchievementUnlock = LearningAchievementCatalogItem & {
  unlocked: boolean;
  progress: number;
};

export type LearningCertificate = {
  id: string;
  learnerName: string;
  pathName: string;
  completionDate: string;
  certificateId: string;
  language: string;
  verificationPlaceholder: string;
};

export type LearnerPortfolio = {
  learnerName: string;
  activeGoals: number;
  completedGoals: number;
  currentFocus: string;
  studyStreak: string;
  hoursStudied: string;
  achievements: number;
  certificates: number;
  skillsPlaceholder: string[];
  externalCertificationsPlaceholder: string[];
  recommendedNextAction: string;
};

export type ParentLearnerOverview = {
  learnerName: string;
  weeklyStudyActivity: string;
  activeGoals: string[];
  achievements: string[];
  suggestedEncouragement: string;
  areasNeedingAttention: string[];
  nextRecommendedParentAction: string;
};

export type ParentDashboard = {
  householdName: string;
  learners: ParentLearnerOverview[];
};

export type StudyPlannerBlock = {
  id: string;
  title: string;
  when: string;
  duration: string;
  module: "Learning";
};

export type StudyPlannerMilestone = {
  id: string;
  title: string;
  targetDate: string;
  status: "planned" | "in-progress" | "placeholder";
};

export type StudyPlanner = {
  weeklyRhythm: string[];
  upcomingBlocks: StudyPlannerBlock[];
  milestones: StudyPlannerMilestone[];
  examsAndDeadlines: StudyPlannerMilestone[];
  placeholderActions: string[];
};

export type LearningUploadCategory =
  | "textbook"
  | "PDF"
  | "syllabus"
  | "notes"
  | "slides"
  | "worksheet"
  | "practice exam";

export type LearningUploadStatus =
  | "queued"
  | "processing"
  | "ready"
  | "needs review"
  | "failed";

export type LearningUploadItem = {
  id: string;
  title: string;
  category: LearningUploadCategory;
  status: LearningUploadStatus;
  detail: string;
};

export type LearningSpecialistRole =
  | "Tutor"
  | "Study Coach"
  | "Guidance Counselor"
  | "Parent Assistant"
  | "Certification Coach"
  | "Reading Coach"
  | "Writing Coach"
  | "Language Coach";

export type LearningSpecialist = {
  id: string;
  role: LearningSpecialistRole;
  description: string;
  available: boolean;
};

export type LearningFeedbackCategory =
  | "feature idea"
  | "bug report"
  | "confusing experience"
  | "liked something"
  | "disliked something"
  | "general suggestion";

export type LearningFeedbackItem = {
  id: string;
  category: LearningFeedbackCategory;
  message: string;
  context?: string;
  submittedAt: string;
};

export type MasteryLevel = "unseen" | "introduced" | "practicing" | "proficient" | "mastered";

export type LearningSkill = {
  id: string;
  name: string;
  relatedSkillIds: string[];
};

export type LearningConcept = {
  id: string;
  name: string;
  skillId: string;
  topicId: string;
  prerequisiteIds: string[];
};

export type LearningTopic = {
  id: string;
  name: string;
  description: string;
};

export type LearningObjective = {
  id: string;
  conceptId: string;
  objective: string;
};

export type LearningDependency = {
  fromConceptId: string;
  toConceptId: string;
  type: "prerequisite";
};

export type LearningResourceType =
  | "video"
  | "article"
  | "book"
  | "exercise"
  | "project"
  | "practice test"
  | "external site";

export type LearningResource = {
  id: string;
  title: string;
  type: LearningResourceType;
  conceptId: string;
  level: MasteryLevel;
  urlPlaceholder: string;
};

export type KnowledgeGraphNode = {
  id: string;
  label: string;
  kind: "skill" | "concept" | "topic" | "objective";
  prerequisiteIds: string[];
};

export type LearningKnowledgeModel = {
  skills: LearningSkill[];
  concepts: LearningConcept[];
  topics: LearningTopic[];
  objectives: LearningObjective[];
  dependencies: LearningDependency[];
  resources: LearningResource[];
  nodes: KnowledgeGraphNode[];
};

export type ConceptMasteryInput = {
  conceptId: string;
  completedSessions: number;
  completedGoals: number;
  completedMilestones: number;
  quizzesPlaceholder: number;
  practicePlaceholder: number;
  studyStreakDays: number;
  lastStudiedDaysAgo: number;
};

export type ConceptMastery = {
  conceptId: string;
  masteryPercent: number;
  confidence: "low" | "medium" | "high";
};

export type MasteryProfile = {
  overallMasteryPercent: number;
  confidence: "low" | "medium" | "high";
  concepts: ConceptMastery[];
  weakConcepts: string[];
  strongestConcepts: string[];
  suggestedReviewTopics: string[];
};

export type DependencyGraphResult = {
  blockedConcepts: string[];
  unlockedConcepts: string[];
  suggestedSequence: string[];
  visualizationNodes: { id: string; label: string; status: "completed" | "blocked" | "available" }[];
  visualizationEdges: { from: string; to: string }[];
};

export type LearningMemory = {
  recentlyStudied: string[];
  recentlyMastered: string[];
  frequentlyMissed: string[];
  favoriteSubjects: string[];
  preferredSessionLength: string;
  learningPace: string;
  studyHistory: { date: string; conceptId: string; minutes: number }[];
};

export type WeaknessAnalysis = {
  neglectedTopics: string[];
  repeatedReviewNeeds: string[];
  lowMasteryConcepts: string[];
  slowProgressConcepts: string[];
  inconsistentStudyHabits: boolean;
  improvementSuggestions: string[];
};

export type AdaptivePlan = {
  updatedMilestones: string[];
  reorderedSessions: string[];
  reviewSessions: string[];
  nextRecommendedLesson: string;
  estimatedCompletion: string;
};

export type GeneratedStudySessionPlan = {
  conceptId: string;
  estimatedTime: string;
  warmUp: string;
  review: string;
  newLearning: string;
  practice: string;
  reflection: string;
  confidenceCheck: string;
};

export type ResourceRecommendationResult = {
  conceptId: string;
  resources: LearningResource[];
};

export type ProgressPrediction = {
  estimatedCompletionDate: string;
  likelihoodOfSuccess: number;
  readiness: number;
  scheduleHealth: "strong" | "steady" | "at-risk";
  studyConsistency: number;
};
