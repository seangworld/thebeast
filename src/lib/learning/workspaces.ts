export const learningWorkspaceSlugs = [
  "educational-roadmap",
  "career-planning",
  "schools",
  "scholarships",
  "certifications",
  "skills",
  "tutor",
  "lesson-history",
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

export type PlanningWorkspaceSlug =
  | "career-planning"
  | "schools"
  | "scholarships";

export type PlanningWorkspaceDefinition = {
  slug: PlanningWorkspaceSlug;
  guidingQuestion: string;
  contextTitle: string;
  contextDescription: string;
  focusAreas: readonly {
    title: string;
    description: string;
  }[];
  verificationNote: string;
};

export const planningWorkspaceDefinitions: Record<
  PlanningWorkspaceSlug,
  PlanningWorkspaceDefinition
> = {
  "career-planning": {
    slug: "career-planning",
    guidingQuestion: "Who could I become?",
    contextTitle: "Directions grounded in your goals",
    contextDescription:
      "Saved goals are starting points for exploration—not career assignments or proof that a role fits.",
    focusAreas: [
      {
        title: "Possible directions",
        description:
          "Connect interests, strengths, preferred environments, and constraints to roles worth investigating.",
      },
      {
        title: "Role reality",
        description:
          "Separate required qualifications from preferences using current role and occupational evidence.",
      },
      {
        title: "Progression and proof",
        description:
          "Map foundational roles, transferable experience, skill gaps, and credible evidence for the next step.",
      },
    ],
    verificationNote:
      "Verify role requirements with current employer postings, government occupational sources, and applicable professional or licensing bodies.",
  },
  schools: {
    slug: "schools",
    guidingQuestion: "Where could I learn?",
    contextTitle: "What your goals need from a school",
    contextDescription:
      "Saved goals shape comparison criteria. They are not school recommendations, admissions decisions, or verified program matches.",
    focusAreas: [
      {
        title: "Program fit",
        description:
          "Compare curriculum, learning format, location, schedule, support, and alignment with the intended outcome.",
      },
      {
        title: "Entry and transfer",
        description:
          "Check admissions, prerequisites, transfer credit, articulation agreements, and application deadlines.",
      },
      {
        title: "Credibility and total cost",
        description:
          "Verify accreditation, total price, completion outcomes, aid terms, and what happens if plans change.",
      },
    ],
    verificationNote:
      "Use official admissions pages, current academic catalogs, transfer agreements, program departments, and recognized accreditor directories.",
  },
  scholarships: {
    slug: "scholarships",
    guidingQuestion: "How could I fund it?",
    contextTitle: "What the funding plan needs to support",
    contextDescription:
      "Saved goals clarify the purpose of funding. They do not establish scholarship eligibility, award amounts, or deadlines.",
    focusAreas: [
      {
        title: "Find credible funding",
        description:
          "Start with schools, government aid sources, recognized foundations, employers, and verified community organizations.",
      },
      {
        title: "Check fit and timing",
        description:
          "Confirm eligibility, covered costs, deadlines, required materials, renewal terms, and award restrictions.",
      },
      {
        title: "Plan the remaining gap",
        description:
          "Track confirmed aid separately from pending applications and compare it with the verified total cost.",
      },
    ],
    verificationNote:
      "Confirm every opportunity on the sponsor’s official page and the school’s financial-aid office; never rely on an aggregator alone.",
  },
};

export function isPlanningWorkspaceSlug(
  value: LearningWorkspaceSlug
): value is PlanningWorkspaceSlug {
  return value in planningWorkspaceDefinitions;
}

export const learningWorkspaceDefinitions: Record<
  LearningWorkspaceSlug,
  LearningWorkspaceDefinition
> = {
  "educational-roadmap": {
    slug: "educational-roadmap",
    title: "Educational Roadmap",
    eyebrow: "Lifelong planning",
    description: "Review the evolving education and career plan your Guidance Counselor maintains with you.",
    emptyTitle: "Your lifelong roadmap is ready to begin",
    emptyDescription: "Talk with your Guidance Counselor to connect your current stage, interests, possible pathways, and long-term goals.",
    emptyAction: { label: "Talk with your Guidance Counselor", href: "/dashboard/education" },
  },
  "career-planning": {
    slug: "career-planning",
    title: "Career Planning",
    eyebrow: "Explore possibilities",
    description: "Explore credible career directions, real role requirements, fit, and the education each option may require.",
    emptyTitle: "No career direction has been explored yet",
    emptyDescription: "Start with your interests, strengths, priorities, and constraints—no career will be chosen for you.",
    emptyAction: { label: "Explore with your Guidance Counselor", href: "/dashboard/education" },
  },
  schools: {
    slug: "schools",
    title: "Schools",
    eyebrow: "School planning",
    description: "Compare verified programs, prerequisites, deadlines, accreditation, support, cost, and fit.",
    emptyTitle: "No schools are being compared yet",
    emptyDescription: "Schools will appear after your roadmap identifies a program type and the criteria that matter to you.",
    emptyAction: { label: "Review your roadmap", href: "/dashboard/education/educational-roadmap" },
  },
  scholarships: {
    slug: "scholarships",
    title: "Scholarships",
    eyebrow: "Funding opportunities",
    description: "Track scholarships and aid opportunities with current eligibility, evidence, requirements, and deadlines.",
    emptyTitle: "No scholarship opportunities are saved yet",
    emptyDescription: "Your Guidance Counselor can help identify what to verify once your school and pathway plans are clearer.",
    emptyAction: { label: "Discuss school planning", href: "/dashboard/education" },
  },
  certifications: {
    slug: "certifications",
    title: "Certifications",
    eyebrow: "Credential planning",
    description: "Evaluate relevant credentials, current official requirements, prerequisites, renewal rules, and readiness evidence.",
    emptyTitle: "No certification is recommended yet",
    emptyDescription: "A credential belongs here only after its relevance to your intended outcome is verified.",
    emptyAction: { label: "Discuss certification goals", href: "/dashboard/education" },
  },
  skills: {
    slug: "skills",
    title: "Skills",
    eyebrow: "Capabilities and evidence",
    description: "Understand current strengths, skills to build, evidence needed, and gaps connected to your roadmap.",
    emptyTitle: "No skill evidence is recorded yet",
    emptyDescription: "Skills will appear as your goals, work, learning, projects, and verified outcomes add evidence.",
    emptyAction: { label: "Review your goals", href: "/dashboard/education" },
  },
  tutor: {
    slug: "tutor",
    title: "Tutor",
    eyebrow: "Supporting specialist",
    description: "Use teaching support when your Guidance Counselor identifies a specific learning need in the roadmap.",
    emptyTitle: "No Tutor session is needed right now",
    emptyDescription: "Tutor support becomes available when a concrete knowledge or practice gap is identified.",
    emptyAction: { label: "Return to Guidance Counselor", href: "/dashboard/education" },
  },
  "lesson-history": {
    slug: "lesson-history",
    title: "Lesson History",
    eyebrow: "Supporting learning record",
    description: "Review completed lessons and reflections without making lesson activity the center of BeastEducation.",
    emptyTitle: "No lesson history is saved yet",
    emptyDescription: "Completed lessons and reflections will build a durable supporting record here.",
    emptyAction: { label: "Return to Guidance Counselor", href: "/dashboard/education" },
  },
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
