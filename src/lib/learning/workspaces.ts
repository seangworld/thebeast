export const learningWorkspaceSlugs = [
  "learning-path",
  "courses",
  "lessons",
  "reviews",
  "achievements",
  "history",
  "certificates",
  "reports",
] as const;

export type LearningWorkspaceSlug = (typeof learningWorkspaceSlugs)[number];

export type LearningWorkspaceDefinition = {
  slug: LearningWorkspaceSlug;
  title: string;
  description: string;
  eyebrow: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction: { label: string; href: string };
};

export const learningWorkspaceDefinitions: Record<
  LearningWorkspaceSlug,
  LearningWorkspaceDefinition
> = {
  "learning-path": {
    slug: "learning-path",
    title: "Learning Path",
    eyebrow: "Your roadmap",
    description: "See the plans your Mentor is using to organize goals into a realistic learning sequence.",
    emptyTitle: "Your learning path is ready to take shape",
    emptyDescription: "Choose a goal and your Mentor will turn it into a focused, evidence-based path.",
    emptyAction: { label: "Choose a learning goal", href: "/dashboard/education/goals" },
  },
  courses: {
    slug: "courses",
    title: "Courses",
    eyebrow: "Active learning",
    description: "Track the courses connected to your current goals and see where to continue.",
    emptyTitle: "No courses are active yet",
    emptyDescription: "Your Mentor will connect courses after your first learning goal is established.",
    emptyAction: { label: "Set a learning goal", href: "/dashboard/education/goals" },
  },
  lessons: {
    slug: "lessons",
    title: "Lessons",
    eyebrow: "Focused work",
    description: "Continue ready lessons and return to unfinished learning without losing context.",
    emptyTitle: "No lessons are ready yet",
    emptyDescription: "Start with a goal so your Mentor can prepare the first useful learning activity.",
    emptyAction: { label: "Talk with your Mentor", href: "/dashboard/education#mentor-session" },
  },
  reviews: {
    slug: "reviews",
    title: "Reviews",
    eyebrow: "Retention",
    description: "Revisit concepts only when saved learning evidence shows that reinforcement is useful.",
    emptyTitle: "Your review queue is clear",
    emptyDescription: "Review work will appear when a completed activity has evidence that a concept needs reinforcement.",
    emptyAction: { label: "Continue learning", href: "/dashboard/education/lessons" },
  },
  achievements: {
    slug: "achievements",
    title: "Achievements",
    eyebrow: "Meaningful progress",
    description: "Recognize demonstrated milestones, completed work, and real learning progress.",
    emptyTitle: "Your first achievement is still ahead",
    emptyDescription: "Achievements are based on saved outcomes—not clicks or placeholder activity.",
    emptyAction: { label: "Continue your mission", href: "/dashboard/education#mentor-session" },
  },
  history: {
    slug: "history",
    title: "Learning Timeline",
    eyebrow: "Chronological history",
    description: "Follow lessons, courses, reviews, achievements, knowledge milestones, certificates, and completed missions in one chronological record.",
    emptyTitle: "No learning history is saved yet",
    emptyDescription: "Completed lessons and reflections will build a durable record here.",
    emptyAction: { label: "Start a lesson", href: "/dashboard/education/lessons" },
  },
  certificates: {
    slug: "certificates",
    title: "Certificates",
    eyebrow: "Verified completion",
    description: "Access certificates earned through completed and verified learning milestones.",
    emptyTitle: "No certificates have been earned yet",
    emptyDescription: "Certificates appear only after the required learning milestone is completed.",
    emptyAction: { label: "View your learning path", href: "/dashboard/education/learning-path" },
  },
  reports: {
    slug: "reports",
    title: "Learning Reports",
    eyebrow: "Professional reporting",
    description: "Review, print, and export progress, course, knowledge, achievement, weekly, and monthly summaries.",
    emptyTitle: "No report evidence is available yet",
    emptyDescription: "Reports will summarize your authenticated learning records after you begin learning.",
    emptyAction: { label: "Start a lesson", href: "/dashboard/education/lessons" },
  },
};

export function isLearningWorkspaceSlug(value: string): value is LearningWorkspaceSlug {
  return learningWorkspaceSlugs.includes(value as LearningWorkspaceSlug);
}
