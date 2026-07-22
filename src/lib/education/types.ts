import type { ExternalResourceRecommendation } from "../platform/externalResources";

export type EducationGoalKind = "career" | "education" | "certification" | "skill" | "personal-growth";

export type EducationResourceProvider =
  | "YouTube"
  | "Khan Academy"
  | "Coursera"
  | "Microsoft Learn"
  | "LinkedIn Learning"
  | "edX"
  | "O'Reilly"
  | "Udemy"
  | "Books"
  | "Professional organizations"
  | "Certifications"
  | "Schools"
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
  educationHistory?: readonly string[];
  certifications?: readonly string[];
  employmentHistory?: readonly string[];
  militaryExperience?: readonly string[];
  skills?: readonly string[];
  weaknesses?: readonly string[];
  preferredLearningStyle?: string;
  careerInterests?: readonly string[];
  careerAspirations?: readonly string[];
  longTermGoals?: readonly string[];
  meaningfulProgress?: readonly string[];
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

export type EducationResourceRecommendation = ExternalResourceRecommendation;

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
  schoolPlan: readonly string[];
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

export type EducationProfileSignal = {
  id: string;
  ownerId?: string;
  source: "conversation" | "progress" | "goal" | "calendar" | "money" | "document" | "external";
  occurredAt: string;
  kind: "situation" | "goal" | "interest" | "strength" | "constraint" | "progress" | "opportunity";
  value: string;
  confidence: "stated" | "observed" | "inferred";
};

export type EducationRecommendation = {
  id: string;
  title: string;
  action: string;
  reason: string;
  explanation: readonly string[];
  priority: number;
  confidence: "low" | "medium" | "high";
  evidenceIds: readonly string[];
  opportunity?: string;
  verifyBeforeActing?: string;
};

export type EducationGuidanceSnapshot = {
  whoTheUserIs: string;
  whereTheyAre: string;
  whereTheyWantToGo: string;
  whatChanged: readonly string[];
  bestNextStep: EducationRecommendation;
  recommendations: readonly EducationRecommendation[];
  interviewQuestions: readonly string[];
  recognizedMilestones: readonly string[];
  profileRefinements: readonly { field: keyof EducationProfile; value: string; evidenceId: string }[];
};
