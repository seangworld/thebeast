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

export type LearningMaterialType =
  | "Textbook"
  | "PDF"
  | "Notes"
  | "Slides"
  | "Video"
  | "Audio"
  | "Worksheet"
  | "Practice Exam"
  | "Lab"
  | "Reference"
  | "External Resource";

export type LearningDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type LearningMaterialUploadStatus = "Not uploaded" | "Uploaded" | "Processing" | "Ready" | "Needs Review";
export type LearningCompletionStatus = "Not started" | "In progress" | "Completed";

export type LearningLibraryMaterial = {
  id: string;
  title: string;
  type: LearningMaterialType;
  subject: string;
  topicIds: string[];
  description: string;
  author: string;
  source: string;
  difficulty: LearningDifficulty;
  estimatedStudyTime: string;
  tags: string[];
  uploadStatus: LearningMaterialUploadStatus;
  completionStatus: LearningCompletionStatus;
  favorite: boolean;
  archived: boolean;
};

export type LearningSubjectTopic = {
  id: string;
  title: string;
  childTopics?: LearningSubjectTopic[];
};

export type LearningSubject = {
  id: string;
  title: string;
  description: string;
  topics: LearningSubjectTopic[];
};

export type CourseActivityType =
  | "reading"
  | "video"
  | "exercise"
  | "project"
  | "discussion"
  | "reflection"
  | "assessment placeholder";

export type CourseActivity = {
  id: string;
  type: CourseActivityType;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
};

export type CourseTopic = {
  id: string;
  title: string;
  activities: CourseActivity[];
  reviewPrompt: string;
  completed: boolean;
};

export type CourseLesson = {
  id: string;
  title: string;
  estimatedMinutes: number;
  topics: CourseTopic[];
  completed: boolean;
};

export type CourseModule = {
  id: string;
  title: string;
  estimatedDuration: string;
  lessons: CourseLesson[];
  completed: boolean;
};

export type LearningBuiltCourse = {
  id: string;
  title: string;
  subject: string;
  estimatedDuration: string;
  progress: number;
  milestones: string[];
  prerequisiteIds: string[];
  modules: CourseModule[];
  completed: boolean;
};

export type LearningLessonModel = {
  id: string;
  courseId: string;
  title: string;
  lessonType: CourseActivityType;
  subject: string;
  estimatedCompletionTime: string;
  tags: string[];
  completionStatus: LearningCompletionStatus;
};

export type FlashcardMastery = "new" | "learning" | "review" | "mastered";

export type LearningFlashcard = {
  id: string;
  front: string;
  back: string;
  category: string;
  difficulty: LearningDifficulty;
  tags: string[];
  mastery: FlashcardMastery;
  reviewSchedulePlaceholder: string;
};

export type QuizQuestionType =
  | "multiple choice"
  | "true/false"
  | "matching"
  | "fill in blank"
  | "short answer placeholder"
  | "coding placeholder"
  | "essay placeholder";

export type LearningQuizQuestion = {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: string[];
  answerPlaceholder: string;
};

export type LearningQuiz = {
  id: string;
  title: string;
  subject: string;
  questions: LearningQuizQuestion[];
  attempts: number;
  score: number;
  reviewRequired: boolean;
};

export type PracticeExamSection = {
  id: string;
  title: string;
  questionPoolIds: string[];
  durationMinutes: number;
};

export type PracticeExamResult = {
  attempts: number;
  bestScore: number;
  lastCompletedAt?: string;
  reviewMode: boolean;
};

export type LearningPracticeExam = {
  id: string;
  title: string;
  subject: string;
  timed: boolean;
  durationMinutes: number;
  sections: PracticeExamSection[];
  completed: boolean;
  result: PracticeExamResult;
};

export type LearningStudyGuide = {
  id: string;
  title: string;
  subject: string;
  overview: string;
  keyConcepts: string[];
  vocabulary: string[];
  importantFacts: string[];
  commonMistakes: string[];
  reviewChecklist: string[];
  practiceTasks: string[];
  resources: string[];
  tags: string[];
};

export type SpacedRepetitionItem = {
  id: string;
  itemType: "flashcard" | "note" | "lesson" | "study guide";
  itemId: string;
  firstReview: string;
  nextReview: string;
  reviewIntervalDays: number;
  mastery: FlashcardMastery;
  priority: "High" | "Medium" | "Low";
};

export type SpacedRepetitionSchedule = {
  today: string;
  items: SpacedRepetitionItem[];
  overdueItems: SpacedRepetitionItem[];
  dueTodayItems: SpacedRepetitionItem[];
};

export type LearnerNote = {
  id: string;
  title: string;
  subject: string;
  richTextPlaceholder: string;
  tags: string[];
  attachmentPlaceholders: string[];
  favorite: boolean;
  pinned: boolean;
  linkedTopicIds: string[];
};

export type LearningBookmarkTarget =
  | "course"
  | "lesson"
  | "topic"
  | "resource"
  | "note"
  | "study guide";

export type LearningBookmark = {
  id: string;
  targetType: LearningBookmarkTarget;
  targetId: string;
  title: string;
  subject: string;
  favorite: boolean;
  tags: string[];
};

export type ResourceCollection = {
  id: string;
  title: string;
  subject: string;
  description: string;
  resourceIds: string[];
  materialIds: string[];
  courseIds: string[];
  noteIds: string[];
  studyGuideIds: string[];
  tags: string[];
};

export type LearningSearchItemType =
  | "course"
  | "lesson"
  | "library"
  | "flashcard"
  | "note"
  | "study guide"
  | "resource";

export type LearningSearchItem = {
  id: string;
  type: LearningSearchItemType;
  title: string;
  subject: string;
  tags: string[];
  difficulty?: LearningDifficulty;
  summary: string;
};

export type LearningSearchFilters = {
  query?: string;
  subject?: string;
  tag?: string;
  difficulty?: LearningDifficulty;
};

export type LearningDashboardContent = {
  library: LearningLibraryMaterial[];
  recentMaterials: LearningLibraryMaterial[];
  continueStudying: LearningLessonModel[];
  recommendedResources: LearningSearchItem[];
  flashcardsDue: LearningFlashcard[];
  upcomingReview: SpacedRepetitionItem[];
  bookmarkedItems: LearningBookmark[];
  studyCollections: ResourceCollection[];
  courseProgress: LearningBuiltCourse[];
};

export type OnboardingStepId =
  | "welcome"
  | "future-self"
  | "interests"
  | "education-level"
  | "learning-style"
  | "study-availability"
  | "preferred-pace"
  | "initial-goals"
  | "starter-dashboard";

export type LearningOnboardingStep = {
  id: OnboardingStepId;
  title: string;
  prompt: string;
  options: string[];
  skippable: boolean;
};

export type DailyLearningExperience = {
  todaysMission: string;
  nextAction: string;
  continueLearning: string;
  flashcardsDue: number;
  studyStreak: number;
  achievements: string[];
  recommendedSession: string;
  upcomingMilestone: string;
  celebration: string;
};

export type FocusModeSession = {
  lessonTitle: string;
  progressPercent: number;
  timerPlaceholder: string;
  notesPlaceholder: string;
  bookmarked: boolean;
  exitLabel: string;
};

export type LearningJourneyStepKind =
  | "goal"
  | "milestone"
  | "course"
  | "lesson"
  | "mastery"
  | "completion";

export type LearningJourneyStep = {
  id: string;
  kind: LearningJourneyStepKind;
  title: string;
  status: "complete" | "active" | "upcoming";
  progress: number;
};

export type LearningJourney = {
  id: string;
  title: string;
  active: boolean;
  steps: LearningJourneyStep[];
};

export type AchievementRarity = "Common" | "Uncommon" | "Rare" | "Founding";

export type PolishedAchievement = {
  id: string;
  title: string;
  description: string;
  rarity: AchievementRarity;
  earnedDate?: string;
  progress: number;
  locked: boolean;
  foundingBadge: boolean;
  celebrationMessage: string;
};

export type CertificateExperience = {
  title: string;
  learnerName: string;
  completionSummary: string;
  skillsEarned: string[];
  sharePlaceholder: string;
  downloadPlaceholder: string;
  verificationPlaceholder: string;
};

export type MotivationSnapshot = {
  dailyEncouragement: string;
  nextMilestone: string;
  celebrationMessage: string;
  streakReminder: string;
  goalReminder: string;
};

export type StudyHabitsSnapshot = {
  preferredStudyTimes: string[];
  averageSessionLength: string;
  consistency: number;
  weeklyMomentum: number;
  monthlyMomentum: number;
  bestLearningDay: string;
  favoriteSubjects: string[];
};

export type LearnerInsight = {
  id: string;
  title: string;
  detail: string;
  tone: "positive" | "neutral" | "warning";
};

export type GamificationProfile = {
  xp: number;
  level: number;
  nextLevelXp: number;
  skillLevels: { skill: string; level: number; progress: number }[];
  journeyCompletion: number;
  milestoneCelebrations: string[];
  dailyGoal: string;
  weeklyGoal: string;
};

export type LearningAccessibilityPreferences = {
  largerTextOption: boolean;
  highContrastPlaceholder: boolean;
  keyboardNavigation: string[];
  reducedMotionPlaceholder: boolean;
  screenReaderLabels: string[];
};

export type ExpandedLearnerProfile = {
  learnerName: string;
  bioPlaceholder: string;
  favoriteSubjects: string[];
  currentStreak: number;
  xp: number;
  level: number;
  achievements: number;
  certificates: number;
  skills: string[];
  currentJourney: string;
  learningStatistics: string[];
};

export type ParentExperiencePolish = {
  weeklyWins: string[];
  areasNeedingEncouragement: string[];
  recentAchievements: string[];
  studyConsistency: string;
  nextConversationSuggestions: string[];
};

export type BetaExperience = {
  badges: string[];
  versionHistory: string[];
  feedbackShortcut: string;
  whatsNew: string[];
};

export type LearningExperienceDashboard = {
  onboarding: LearningOnboardingStep[];
  daily: DailyLearningExperience;
  focusMode: FocusModeSession;
  journeys: LearningJourney[];
  achievements: PolishedAchievement[];
  certificate: CertificateExperience;
  motivation: MotivationSnapshot;
  habits: StudyHabitsSnapshot;
  insights: LearnerInsight[];
  gamification: GamificationProfile;
  accessibility: LearningAccessibilityPreferences;
  learnerProfile: ExpandedLearnerProfile;
  parentExperience: ParentExperiencePolish;
  beta: BetaExperience;
};
