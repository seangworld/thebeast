export type BeastEducationGen2Focus = {
  id:
    | "educational-planning"
    | "career-exploration"
    | "educational-roadmap"
    | "school-planning"
    | "certification-planning"
    | "long-term-educational-goals";
  title: string;
  description: string;
};

export type BeastEducationSupportingCapability = {
  id: "courses" | "lessons" | "practice" | "tutor-specialists";
  title: string;
  generation: "preserved-supporting" | "future-specialist";
  positioning: string;
};

export const beastEducationGen2Vision = {
  packageId: "BE-201",
  primaryProfessional: "Guidance Counselor",
  primaryExperience: "Long-term educational guidance and planning",
  productPromise:
    "Understand where the member is, explore where they could go, and maintain a realistic educational roadmap over time.",
  focus: [
    {
      id: "educational-planning",
      title: "Educational planning",
      description:
        "Connect the member's current situation, strengths, constraints, and options into a practical plan.",
    },
    {
      id: "career-exploration",
      title: "Career exploration",
      description:
        "Explore credible career directions and the education, experience, and evidence each path may require.",
    },
    {
      id: "educational-roadmap",
      title: "Educational roadmap",
      description:
        "Maintain a clear now-next-later path that adapts as goals, requirements, and progress change.",
    },
    {
      id: "school-planning",
      title: "School planning",
      description:
        "Compare verified programs, prerequisites, deadlines, costs, support, and fit without choosing for the member.",
    },
    {
      id: "certification-planning",
      title: "Certification planning",
      description:
        "Verify credential relevance and requirements before building an evidence-based preparation path.",
    },
    {
      id: "long-term-educational-goals",
      title: "Long-term educational goals",
      description:
        "Preserve continuity across semesters, career changes, credentials, and lifelong personal growth.",
    },
  ] satisfies readonly BeastEducationGen2Focus[],
  supportingCapabilities: [
    {
      id: "courses",
      title: "Courses",
      generation: "preserved-supporting",
      positioning:
        "Remain available when a roadmap identifies structured learning as useful.",
    },
    {
      id: "lessons",
      title: "Lessons",
      generation: "preserved-supporting",
      positioning:
        "Remain available as focused learning steps within a counselor-led roadmap.",
    },
    {
      id: "practice",
      title: "Practice and review",
      generation: "preserved-supporting",
      positioning:
        "Remain available to produce evidence, confidence, and readiness signals.",
    },
    {
      id: "tutor-specialists",
      title: "Tutor specialist agents",
      generation: "future-specialist",
      positioning:
        "Teaching is handed to future specialist agents only when the Guidance Counselor identifies a specific knowledge gap.",
    },
  ] satisfies readonly BeastEducationSupportingCapability[],
} as const;

export const beastEducationGen2ArchitectureRules = [
  "The Guidance Counselor owns the primary BeastEducation relationship.",
  "Educational and career planning lead the experience; courses and tutoring do not.",
  "Teaching remains available through preserved capabilities and future specialist agents.",
  "Existing courses, lessons, practice, review, Tutor orchestration, progress, and records are preserved.",
  "Supporting capabilities must connect back to a member-owned educational roadmap.",
] as const;
