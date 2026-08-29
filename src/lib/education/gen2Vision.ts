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
  generation: "on-hold" | "released";
  positioning: string;
  href?: string;
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
      generation: "on-hold",
      positioning:
        "Historical records remain preserved, but course delivery is not an active BeastEducation capability.",
    },
    {
      id: "lessons",
      title: "Lessons",
      generation: "on-hold",
      positioning:
        "Historical lesson records remain preserved; lesson delivery is explicitly on hold.",
    },
    {
      id: "practice",
      title: "Practice and review",
      generation: "on-hold",
      positioning:
        "Practice, diagnostics, remediation, and mastery checks are explicitly on hold.",
    },
    {
      id: "tutor-specialists",
      title: "AI Tutor & Homework Helper",
      generation: "released",
      positioning:
        "Riley Chen is available now for age-appropriate explanations, guided homework help, shown-work review, practice, and short quizzes.",
      href: "/dashboard/education/tutor",
    },
  ] satisfies readonly BeastEducationSupportingCapability[],
} as const;

export const beastEducationGen2ArchitectureRules = [
  "The Guidance Counselor owns the primary BeastEducation relationship.",
  "The Guidance Counselor owns education and career direction; the AI Tutor teaches and reviews schoolwork without taking over the long-term plan.",
  "The bounded AI Tutor and Homework Helper are released; unrelated course, lesson, diagnostic, and mastery-delivery systems remain on hold.",
  "Historical teaching records remain preserved, while only the released AI Tutor is exposed as an active instructional capability.",
  "Every active planning capability connects back to a member-owned profile, goal, path, or roadmap.",
] as const;
