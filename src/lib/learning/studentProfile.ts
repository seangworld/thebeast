import type {
  GuidanceGoalType,
  LearningGoal,
  LearningProgressSignals,
  LearningSession,
} from "./types";

export type StudentProfileStage =
  | "first_use"
  | "exploring"
  | "active_learning"
  | "planning"
  | "review";

export type StudentSupportNeed =
  | "placement"
  | "goal_clarity"
  | "study_rhythm"
  | "confidence"
  | "remediation"
  | "career_planning"
  | "certification_planning"
  | "accessibility";

export type StudentProfileSource =
  | "manual"
  | "mentor_observation"
  | "guidance_counselor"
  | "learning_activity"
  | "beastos_profile_reference";

export type StudentProfileField<T> = {
  value: T;
  source: StudentProfileSource;
  updatedAt?: string;
};

export type StudentProfileInput = {
  learnerId: string;
  displayName?: string;
  academicLevel?: string;
  interests?: string[];
  activeGoals?: LearningGoal[];
  learningPreferences?: string[];
  availableTime?: string;
  supportNeeds?: StudentSupportNeed[];
  guidanceGoalType?: GuidanceGoalType;
  progressSignals?: LearningProgressSignals;
  recentSessions?: LearningSession[];
  profileReferences?: string[];
};

export type StudentProfile = {
  learnerId: string;
  displayName: string;
  stage: StudentProfileStage;
  academicLevel?: StudentProfileField<string>;
  interests: StudentProfileField<string[]>;
  activeGoalTitles: StudentProfileField<string[]>;
  learningPreferences: StudentProfileField<string[]>;
  availableTime?: StudentProfileField<string>;
  supportNeeds: StudentSupportNeed[];
  guidanceGoalType?: GuidanceGoalType;
  mentorSummary: string;
  guidanceCounselorSummary: string;
  readinessSummary: string;
  privacyBoundaries: string[];
  profileReferences: string[];
};

export const studentProfileOwnershipRules = [
  "BeastOS owns identity, shared profile intelligence, permissions, and durable profile facts.",
  "BeastEducation owns learning-session evidence, Mentor observations, guidance planning context, and student-learning intelligence.",
  "Student Profile stores learning context for Mentor and Guidance Counselor behavior; it is not a duplicate Beast Profile.",
  "Missing profile context should produce a first-use or insufficient-data state rather than fabricated history.",
];

function cleanList(values?: string[]) {
  return Array.from(
    new Set((values || []).map((value) => value.trim()).filter(Boolean))
  );
}

function firstName(value?: string) {
  return (value || "").trim().split(/\s+/)[0] || "there";
}

function activeGoalTitles(goals?: LearningGoal[]) {
  return (goals || [])
    .filter((goal) => goal.status === "Active" || goal.status === "Planned")
    .sort((a, b) => {
      const priorityRank = { High: 0, Medium: 1, Low: 2 };
      return priorityRank[a.priority] - priorityRank[b.priority];
    })
    .map((goal) => goal.title);
}

function inferSupportNeeds(input: StudentProfileInput): StudentSupportNeed[] {
  const supportNeeds = new Set<StudentSupportNeed>(input.supportNeeds || []);
  const goals = input.activeGoals || [];
  const hasGoals = goals.length > 0;
  const sessions = input.recentSessions || [];

  if (!hasGoals) supportNeeds.add("goal_clarity");
  if (!input.progressSignals && sessions.length === 0) supportNeeds.add("placement");
  if (input.progressSignals?.weakArea) supportNeeds.add("remediation");
  if ((input.progressSignals?.readinessScore || 0) < 60) supportNeeds.add("confidence");
  if (input.guidanceGoalType === "Career" || input.guidanceGoalType === "Promotion") {
    supportNeeds.add("career_planning");
  }
  if (goals.some((goal) => goal.category.toLowerCase().includes("certification"))) {
    supportNeeds.add("certification_planning");
  }
  if (input.availableTime) supportNeeds.add("study_rhythm");

  return Array.from(supportNeeds);
}

function inferStage(input: StudentProfileInput, supportNeeds: StudentSupportNeed[]): StudentProfileStage {
  const hasLearningEvidence =
    (input.activeGoals?.length || 0) > 0 ||
    Boolean(input.progressSignals) ||
    (input.recentSessions?.length || 0) > 0;

  if (!hasLearningEvidence) return "first_use";
  if (supportNeeds.includes("career_planning") || supportNeeds.includes("certification_planning")) {
    return "planning";
  }
  if ((input.progressSignals?.readinessScore || 0) < 60) return "review";
  if ((input.recentSessions || []).some((session) => session.status === "In progress")) {
    return "active_learning";
  }
  return "exploring";
}

function buildReadinessSummary(input: StudentProfileInput) {
  if (!input.progressSignals) {
    return "Not enough learning evidence yet. Start with a goal, placement, or first lesson.";
  }

  const { readinessScore, weakArea, recommendedNextAction } = input.progressSignals;
  if (readinessScore >= 80) {
    return `Strong readiness. Keep momentum with ${recommendedNextAction}.`;
  }

  if (readinessScore >= 60) {
    return `Steady readiness. Watch ${weakArea} and continue with ${recommendedNextAction}.`;
  }

  return `Readiness needs support. Focus on ${weakArea} before adding harder work.`;
}

export function buildStudentProfile(input: StudentProfileInput): StudentProfile {
  const displayName = input.displayName?.trim() || "Current learner";
  const goals = activeGoalTitles(input.activeGoals);
  const interests = cleanList(input.interests);
  const preferences = cleanList(input.learningPreferences);
  const supportNeeds = inferSupportNeeds(input);
  const stage = inferStage(input, supportNeeds);
  const profileReferences = cleanList(input.profileReferences);
  const readinessSummary = buildReadinessSummary(input);
  const learnerFirstName = firstName(displayName);
  const primaryGoal = goals[0] || "a first learning goal";
  const preferenceText =
    preferences.length > 0 ? preferences.join(", ") : "a style your Mentor will learn over time";

  return {
    learnerId: input.learnerId,
    displayName,
    stage,
    academicLevel: input.academicLevel
      ? {
          value: input.academicLevel,
          source: "beastos_profile_reference",
        }
      : undefined,
    interests: {
      value: interests,
      source: interests.length > 0 ? "manual" : "mentor_observation",
    },
    activeGoalTitles: {
      value: goals,
      source: goals.length > 0 ? "learning_activity" : "manual",
    },
    learningPreferences: {
      value: preferences,
      source: preferences.length > 0 ? "beastos_profile_reference" : "mentor_observation",
    },
    availableTime: input.availableTime
      ? {
          value: input.availableTime,
          source: "beastos_profile_reference",
        }
      : undefined,
    supportNeeds,
    guidanceGoalType: input.guidanceGoalType,
    mentorSummary:
      stage === "first_use"
        ? `${learnerFirstName} is new here. Ask one goal question before recommending a lesson.`
        : `${learnerFirstName} is working toward ${primaryGoal}. Use ${preferenceText} and the latest learning evidence to choose the next step.`,
    guidanceCounselorSummary:
      goals.length > 0
        ? `Plan around ${goals.slice(0, 3).join(", ")} and confirm requirements before committing to a path.`
        : "Start by clarifying the learner's desired outcome, current level, timeline, and constraints.",
    readinessSummary,
    privacyBoundaries: studentProfileOwnershipRules,
    profileReferences,
  };
}
