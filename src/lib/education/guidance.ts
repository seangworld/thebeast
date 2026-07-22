import type {
  EducationDiscoveryAnswer,
  EducationGoalKind,
  EducationGuidancePlan,
  EducationProfile,
  EducationProgressEvent,
  EducationProgressSummary,
  EducationResourceProvider,
  EducationResourceRecommendation,
  EducationRoadmapMilestone,
} from "./types";

export const educationDiscoveryQuestions = [
  { id: "destination", prompt: "What do you want to be able to do, become, or achieve?" },
  { id: "starting-point", prompt: "What experience, education, or skills do you already have?" },
  { id: "motivation", prompt: "Why does this matter to you now?" },
  { id: "constraints", prompt: "What time, cost, location, accessibility, or family constraints should shape the plan?" },
] as const;

const providerCatalog: Record<Exclude<EducationResourceProvider, "Future provider">, Omit<EducationResourceRecommendation, "reason">> = {
  YouTube: { provider: "YouTube", title: "Explore expert explanations and practitioner perspectives", url: "https://www.youtube.com/results?search_query=", cost: "free", verificationNote: "Review creator credentials, publication date, sources, and conflicts before relying on a video." },
  "Khan Academy": { provider: "Khan Academy", title: "Strengthen academic and foundational skills", url: "https://www.khanacademy.org/search?page_search_query=", cost: "free", verificationNote: "Confirm the topic and level match the roadmap milestone." },
  Coursera: { provider: "Coursera", title: "Compare structured courses and professional certificates", url: "https://www.coursera.org/search?query=", cost: "free-or-paid", verificationNote: "Verify current price, instructor, institution, workload, and credential value with the provider." },
  "Microsoft Learn": { provider: "Microsoft Learn", title: "Use official Microsoft role and technology learning paths", url: "https://learn.microsoft.com/training/browse/?terms=", cost: "free", verificationNote: "Prefer current official paths and verify any exam objectives separately." },
  Books: { provider: "Books", title: "Find durable books and reference material", url: "https://search.worldcat.org/search?q=", cost: "varies", verificationNote: "Check edition date, author expertise, library availability, and whether the field changes quickly." },
  Certifications: { provider: "Certifications", title: "Verify relevant credentials with issuing organizations", url: "https://www.google.com/search?q=official+certification+", cost: "varies", verificationNote: "Use the issuing body's current objectives, prerequisites, renewal rules, and exam policies as authority." },
};

const goalSkills: Record<EducationGoalKind, readonly string[]> = {
  career: ["role-specific fundamentals", "evidence of applied skill", "professional communication"],
  education: ["prerequisite knowledge", "academic planning", "application and deadline management"],
  certification: ["official objective coverage", "scenario practice", "exam-readiness evidence"],
  skill: ["foundations", "deliberate practice", "observable project evidence"],
  "personal-growth": ["self-direction", "consistent practice", "reflection and transfer"],
};

function clean(value: string, fallback: string) {
  return value.trim() || fallback;
}

function queryUrl(base: string, goal: string) {
  return `${base}${encodeURIComponent(goal)}`;
}

export function buildEducationGuidancePlan({
  profile,
  goalKind,
  goal,
  discoveryAnswers = [],
}: {
  profile: EducationProfile;
  goalKind: EducationGoalKind;
  goal: string;
  discoveryAnswers?: readonly EducationDiscoveryAnswer[];
}): EducationGuidancePlan {
  const target = clean(goal, "Clarify an education or growth goal");
  const answered = new Set(discoveryAnswers.filter((item) => item.answer.trim()).map((item) => item.questionId));
  const unansweredQuestions = educationDiscoveryQuestions.filter((question) => !answered.has(question.id)).map((question) => question.prompt);
  const knownStrengths = profile.strengths.filter(Boolean);
  const skillsToBuild = goalSkills[goalKind].filter((skill) => !knownStrengths.some((strength) => strength.toLowerCase().includes(skill.toLowerCase())));
  const roadmap: EducationRoadmapMilestone[] = [
    { id: "clarify", title: `Define success for ${target}`, reason: "A clear destination prevents expensive or irrelevant recommendations.", horizon: "now", status: unansweredQuestions.length ? "in-progress" : "complete" },
    { id: "verify", title: "Verify requirements with authoritative sources", reason: "Admissions, career, and certification requirements change.", horizon: "now", status: "not-started" },
    { id: "close-gap", title: `Build ${skillsToBuild[0] || "the first verified skill gap"}`, reason: "Progress starts with the smallest useful evidence-producing step.", horizon: "next", status: "not-started" },
    { id: "prove", title: "Create evidence and review the direction", reason: "Projects, records, feedback, and official results are stronger than completion clicks.", horizon: "later", status: "not-started" },
  ];
  const providers = profile.preferredFormats.length ? profile.preferredFormats : (["YouTube", "Khan Academy", "Coursera", "Microsoft Learn", "Books", "Certifications"] as const);
  const resources = providers.filter((provider): provider is Exclude<EducationResourceProvider, "Future provider"> => provider !== "Future provider").map((provider) => ({
    ...providerCatalog[provider],
    reason: `Compare this provider for the ${target} roadmap; BeastEducation does not rank or resell providers.`,
    url: queryUrl(providerCatalog[provider].url, target),
  }));

  return {
    profileId: profile.id,
    goalKind,
    goal: target,
    summary: `Guidance-first plan for ${target}, shaped around ${profile.weeklyHours || "the available"} weekly hours and the user's stated constraints.`,
    nextAction: unansweredQuestions[0] || roadmap.find((item) => item.status === "not-started")?.title || "Review progress with the Guidance Counselor.",
    discoveryComplete: unansweredQuestions.length === 0,
    unansweredQuestions,
    skillAnalysis: {
      currentStrengths: knownStrengths,
      skillsToBuild,
      evidenceNeeded: ["one authoritative requirement source", "one applied example or project", "one reflection or qualified feedback checkpoint"],
      unknowns: unansweredQuestions,
    },
    careerPlan: ["Compare real role requirements", "Identify transferable strengths", "Build credible evidence before applying"],
    educationPlan: ["Verify prerequisites and program outcomes", "Compare time, cost, support, and format", "Track applications, deadlines, and decisions"],
    certificationPlan: ["Confirm credential relevance", "Use current official objectives", "Schedule only after evidence-based readiness review"],
    roadmap,
    resources,
    teachingSupport: "Teaching, Tutor sessions, courses, and practice are supporting tools used only when the roadmap identifies a specific knowledge gap.",
    boundaries: [
      "BeastEducation provides guidance and planning, not official school, career, licensing, or financial advice.",
      "Recommendations do not guarantee admission, employment, promotion, certification, or personal outcomes.",
      "External providers own their content, pricing, credentials, availability, and quality claims.",
      "The user chooses providers; BeastEducation does not compete with, rank, or resell course platforms.",
    ],
  };
}

export function summarizeEducationProgress(roadmap: readonly EducationRoadmapMilestone[], events: readonly EducationProgressEvent[]): EducationProgressSummary {
  const completedIds = new Set(events.filter((event) => event.kind === "completed").map((event) => event.milestoneId));
  const completedMilestones = roadmap.filter((milestone) => milestone.status === "complete" || completedIds.has(milestone.id)).length;
  const orderedEvents = [...events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return {
    completedMilestones,
    totalMilestones: roadmap.length,
    percent: roadmap.length ? Math.round((completedMilestones / roadmap.length) * 100) : 0,
    latestMeaningfulUpdate: orderedEvents[0],
    nextMilestone: roadmap.find((milestone) => milestone.status !== "complete" && !completedIds.has(milestone.id)),
  };
}
