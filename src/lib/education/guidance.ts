import type {
  EducationDiscoveryAnswer,
  EducationGoalKind,
  EducationGuidancePlan,
  EducationProfile,
  EducationProgressEvent,
  EducationProgressSummary,
  EducationResourceProvider,
  EducationRoadmapMilestone,
} from "./types";
import { createExternalResourceRecommendation, externalResourceProviders } from "../platform/externalResources";

export const educationDiscoveryQuestions = [
  { id: "story", prompt: "Tell me about yourself and what is shaping your life right now." },
  { id: "destination", prompt: "What do you want to be able to do, become, or achieve?" },
  { id: "starting-point", prompt: "What experience, education, or skills do you already have?" },
  { id: "interests", prompt: "What kinds of work, ideas, or activities hold your interest?" },
  { id: "motivation", prompt: "Why does this matter to you now?" },
  { id: "constraints", prompt: "What time, cost, location, accessibility, or family constraints should shape the plan?" },
] as const;

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
  const providers = profile.preferredFormats.length ? profile.preferredFormats : (["YouTube", "Khan Academy", "Coursera", "Microsoft Learn", "Books", "Certifications", "Schools"] as const);
  const resources = providers.flatMap((providerName) => {
    if (providerName === "Future provider") return [];
    const registeredProvider = externalResourceProviders.findByName(providerName === "Certifications" ? "Certification providers" : providerName);
    if (!registeredProvider) return [];
    return [createExternalResourceRecommendation({
      id: `beasteducation:${registeredProvider.id}:${target.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      moduleId: "beasteducation",
      agentId: "beasteducation.guidance-counselor",
      providerId: registeredProvider.id,
      title: registeredProvider.description,
      whyRecommended: `Compare this provider for the ${target} roadmap; BeastEducation does not rank or resell providers.`,
      query: target,
    })];
  });

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
    schoolPlan: ["Compare accredited programs and verified outcomes", "Review admissions, transfer, cost, support, and location constraints", "Keep the final school choice with the user"],
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
