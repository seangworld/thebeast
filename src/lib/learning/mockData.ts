import type {
  LearnerProfile,
  LearningAchievement,
  LearningCourse,
  LearningGoal,
  LearningPlan,
  LearningProgress,
  LearningQuickAction,
  LearningSession,
  LearningSignal,
  StudySessionCommand,
} from "./types";

export const mockLearners: LearnerProfile[] = [
  {
    id: "current",
    name: "Current learner",
    role: "Primary profile",
    focus: "Certification, life skills, and practical projects",
    active: true,
  },
  {
    id: "family-placeholder",
    name: "Family member",
    role: "Additional learner",
    focus: "Multiple learner support reserved",
    active: false,
  },
];

export const mockLearningGoals: LearningGoal[] = [
  {
    id: "security-plus",
    learnerId: "current",
    title: "Security+",
    category: "Certification",
    target: "Build a certification-ready study plan",
    progress: 38,
    status: "Active",
    priority: "High",
  },
  {
    id: "comptia-a-plus",
    learnerId: "current",
    title: "CompTIA A+",
    category: "Certification",
    target: "Refresh hardware, networking, and troubleshooting",
    progress: 22,
    status: "Planned",
    priority: "Medium",
  },
  {
    id: "eighth-grade-math",
    learnerId: "current",
    title: "8th Grade Math",
    category: "Family learning",
    target: "Support mastery across algebra foundations",
    progress: 54,
    status: "Planned",
    priority: "Medium",
  },
  {
    id: "spanish",
    learnerId: "current",
    title: "Spanish",
    category: "Language",
    target: "Build daily vocabulary and listening rhythm",
    progress: 18,
    status: "Planned",
    priority: "Low",
  },
  {
    id: "woodworking",
    learnerId: "current",
    title: "Woodworking",
    category: "Hands-on skill",
    target: "Track projects, techniques, and tool safety",
    progress: 12,
    status: "Planned",
    priority: "Low",
  },
];

export const mockLearningCourses: LearningCourse[] = [
  {
    id: "sec-plus-foundations",
    goalId: "security-plus",
    title: "Security+ Foundations",
    category: "Cybersecurity",
    progress: 42,
    estimatedCompletion: "6 weeks",
    status: "In progress",
    priority: "High",
  },
  {
    id: "networking-basics",
    goalId: "comptia-a-plus",
    title: "Networking Basics",
    category: "IT fundamentals",
    progress: 28,
    estimatedCompletion: "4 weeks",
    status: "In progress",
    priority: "Medium",
  },
  {
    id: "spanish-daily",
    goalId: "spanish",
    title: "Spanish Daily Practice",
    category: "Language",
    progress: 15,
    estimatedCompletion: "Ongoing",
    status: "Queued",
    priority: "Low",
  },
];

export const mockLearningPlan: LearningPlan = {
  id: "security-plus-readiness",
  learnerId: "current",
  title: "Security+ readiness path",
  summary:
    "Certification study plan with review cadence and guided tutoring sessions.",
  primaryGoalId: "security-plus",
  currentCourseId: "sec-plus-foundations",
  weeklySessionTarget: 5,
};

export const mockLearningProgress: LearningProgress[] = [
  {
    id: "current-course",
    learnerId: "current",
    label: "Current Course",
    value: "42%",
    detail: "Security+ Foundations",
    icon: "LC",
    tone: "purple",
    numericValue: 42,
  },
  {
    id: "weekly-goal",
    learnerId: "current",
    label: "Weekly Goal",
    value: "3 / 5",
    detail: "Study blocks planned",
    icon: "WG",
    tone: "blue",
    numericValue: 60,
  },
  {
    id: "study-streak",
    learnerId: "current",
    label: "Study Streak",
    value: "7 days",
    detail: "Current rhythm",
    icon: "ST",
    tone: "green",
    numericValue: 7,
  },
  {
    id: "hours-studied",
    learnerId: "current",
    label: "Hours Studied",
    value: "4.5",
    detail: "This week",
    icon: "HR",
    tone: "yellow",
    numericValue: 4.5,
  },
  {
    id: "mastery",
    learnerId: "current",
    label: "Mastery",
    value: "72%",
    detail: "Foundation estimate",
    icon: "MY",
    tone: "purple",
    numericValue: 72,
  },
];

export const mockLearningSessions: LearningSession[] = [
  {
    id: "auth-access-control",
    learnerId: "current",
    courseId: "sec-plus-foundations",
    title: "Authentication and access control",
    courseTitle: "Security+ Foundations",
    when: "Today",
    duration: "35 min",
    status: "Scheduled",
  },
  {
    id: "subnetting-review",
    learnerId: "current",
    courseId: "networking-basics",
    title: "Subnetting review",
    courseTitle: "Networking Basics",
    when: "Tomorrow",
    duration: "25 min",
    status: "Scheduled",
  },
  {
    id: "spanish-listening",
    learnerId: "current",
    courseId: "spanish-daily",
    title: "Spanish listening block",
    courseTitle: "Spanish Daily Practice",
    when: "This week",
    duration: "20 min",
    status: "Completed",
  },
];

export const mockStudySessionCommand: StudySessionCommand = {
  id: "today-auth-access-control-command",
  sessionId: "auth-access-control",
  currentFocus: "Authentication and access control",
  estimatedTime: "35 min",
  warmUpPrompt:
    "List three ways a system can verify identity before granting access.",
  guidedPracticeStep:
    "Compare password, MFA, and role-based access examples against the Security+ objective.",
  reflectionCheckpoint:
    "Write one sentence on the difference between authentication and authorization.",
  progressFeedback:
    "Session complete. Today counts toward your study streak and strengthens the Security+ foundations path.",
};

export const mockLearningAchievements: LearningAchievement[] = [
  {
    id: "seven-day-streak",
    learnerId: "current",
    title: "7-day streak",
    detail: "Daily study rhythm",
    earned: true,
  },
  {
    id: "completed-course",
    learnerId: "current",
    title: "Completed course",
    detail: "Reserved for course completion",
    earned: false,
  },
  {
    id: "mastered-topic",
    learnerId: "current",
    title: "Mastered topic",
    detail: "Reserved for mastery tracking",
    earned: false,
  },
  {
    id: "certification-earned",
    learnerId: "current",
    title: "Certification earned",
    detail: "Reserved for credentials",
    earned: false,
  },
];

export const mockLearningSignals: LearningSignal[] = [
  {
    id: "goal-focus-signal",
    learnerId: "current",
    kind: "goal",
    title: "Primary goal selected",
    summary: "Security+ is staged as the first active learning direction.",
    severity: "info",
    timestamp: "2026-07-03T12:00:00.000Z",
    sourceId: "security-plus",
  },
];

export const mockLearningQuickActions: LearningQuickAction[] = [
  {
    id: "continue-learning",
    label: "Continue Learning",
    detail: "Resume the current course plan.",
    active: true,
  },
  {
    id: "browse-courses",
    label: "Browse Courses",
    detail: "Course library foundation.",
    active: false,
  },
  {
    id: "start-quiz",
    label: "Start Quiz",
    detail: "Quiz engine arrives later.",
    active: false,
  },
  {
    id: "review-notes",
    label: "Review Notes",
    detail: "Notes workspace reserved.",
    active: false,
  },
  {
    id: "view-progress",
    label: "View Progress",
    detail: "Progress history foundation.",
    active: true,
  },
  {
    id: "add-learning-goal",
    label: "Add Learning Goal",
    detail: "User-defined goals arrive later.",
    active: false,
  },
];
