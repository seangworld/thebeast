export type EducationGoalKind = "career" | "education" | "certification" | "skill" | "personal-growth";

export type EducationResourceProvider =
  | "YouTube"
  | "Khan Academy"
  | "Coursera"
  | "Microsoft Learn"
  | "Books"
  | "Certifications"
  | "Future provider";

export type EducationProfile = {
  id: string;
  ownerId: string;
  currentSituation: string;
  interests: readonly string[];
  strengths: readonly string[];
  goals: readonly string[];
  constraints: readonly string[];
  preferredFormats: readonly EducationResourceProvider[];
  weeklyHours: number;
  targetDate?: string;
};

export type EducationDiscoveryAnswer = {
  questionId: string;
  answer: string;
};

export type EducationSkillAnalysis = {
  currentStrengths: readonly string[];
  skillsToBuild: readonly string[];
  evidenceNeeded: readonly string[];
  unknowns: readonly string[];
};

export type EducationRoadmapMilestone = {
  id: string;
  title: string;
  reason: string;
  horizon: "now" | "next" | "later";
  status: "not-started" | "in-progress" | "complete";
};

export type EducationResourceRecommendation = {
  provider: EducationResourceProvider;
  title: string;
  reason: string;
  url: string;
  cost: "free" | "free-or-paid" | "varies";
  verificationNote: string;
};

export type EducationGuidancePlan = {
  profileId: string;
  goalKind: EducationGoalKind;
  goal: string;
  summary: string;
  nextAction: string;
  discoveryComplete: boolean;
  unansweredQuestions: readonly string[];
  skillAnalysis: EducationSkillAnalysis;
  careerPlan: readonly string[];
  educationPlan: readonly string[];
  certificationPlan: readonly string[];
  roadmap: readonly EducationRoadmapMilestone[];
  resources: readonly EducationResourceRecommendation[];
  teachingSupport: string;
  boundaries: readonly string[];
};

export type EducationProgressEvent = {
  id: string;
  profileId: string;
  milestoneId: string;
  occurredAt: string;
  kind: "started" | "evidence-added" | "completed" | "replanned";
  summary: string;
};

export type EducationProgressSummary = {
  completedMilestones: number;
  totalMilestones: number;
  percent: number;
  latestMeaningfulUpdate?: EducationProgressEvent;
  nextMilestone?: EducationRoadmapMilestone;
};
