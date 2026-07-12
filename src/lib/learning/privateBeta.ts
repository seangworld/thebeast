import type {
  LearningBetaReadiness,
  LearningCertificate,
  LearningCertificateDocument,
  LearningDashboardStage,
  LearningFeedbackItem,
  LearningGoal,
  LearningOnboardingMission,
  LearningPrivateBetaBadge,
  LearningPrivateBetaData,
  LearningSession,
  LearningTimelineItem,
  ParentLearnerRelationship,
} from "./types";

const privateBetaDate = "2026-07-04";

export const foundingStudentBadges: LearningPrivateBetaBadge[] = [
  {
    id: "founding-student",
    label: "Founding Student",
    earnedAt: privateBetaDate,
    permanent: true,
  },
  {
    id: "private-beta",
    label: "Early Access",
    earnedAt: privateBetaDate,
    permanent: true,
  },
];

const missionTemplate: Omit<LearningOnboardingMission, "status">[] = [
  {
    id: "create-profile",
    title: "Create profile",
    summary: "Tell BeastLearning who is studying and what context matters.",
    required: true,
    unlocks: ["Personalized dashboard", "Founding Student badge"],
  },
  {
    id: "choose-goals",
    title: "Choose goals",
    summary: "Pick the outcomes BeastLearning should organize around.",
    required: true,
    unlocks: ["Goal recommendations", "Learning paths"],
  },
  {
    id: "select-interests",
    title: "Select interests",
    summary: "Choose subjects, career paths, certifications, or skills.",
    required: true,
    unlocks: ["Specialist routing", "Suggested courses"],
  },
  {
    id: "learning-style",
    title: "Learning style",
    summary: "Set the preferred pace, session length, and coaching style.",
    required: true,
    unlocks: ["Study Coach", "Motivation Coach"],
  },
  {
    id: "study-schedule",
    title: "Study schedule",
    summary: "Define a realistic rhythm for weekly progress.",
    required: true,
    unlocks: ["Study blocks", "Streak tracking"],
  },
  {
    id: "first-plan",
    title: "Create first learning plan",
    summary: "Generate the first guided plan from the active goal.",
    required: true,
    unlocks: ["Plan dashboard", "Milestones"],
  },
  {
    id: "first-session",
    title: "Complete first study session",
    summary: "Start with one focused learning win.",
    required: false,
    unlocks: ["Activity history", "Achievement progress"],
  },
  {
    id: "first-achievement",
    title: "Unlock first achievement",
    summary: "Earn the first visible milestone in the lifelong learning record.",
    required: false,
    unlocks: ["Portfolio", "Certificate readiness"],
  },
];

function resolveMissionStatus(index: number, completedCount: number) {
  if (index < completedCount) return "complete";
  if (index === completedCount) return "active";
  if (index === completedCount + 1) return "available";

  return "locked";
}

export function buildLearningMissions(completedCount: number): LearningOnboardingMission[] {
  return missionTemplate.map((mission, index) => ({
    ...mission,
    status: resolveMissionStatus(index, completedCount),
  }));
}

export function resolveLearningDashboardStage(completionPercent: number): LearningDashboardStage {
  if (completionPercent >= 85) return "Power Learner";
  if (completionPercent >= 45) return "Active Learner";

  return "New Learner";
}

export function buildLearningBetaReadiness({
  completedMissionCount,
}: {
  completedMissionCount: number;
}): LearningBetaReadiness {
  const missions = buildLearningMissions(completedMissionCount);
  const completeMissions = missions.filter((mission) => mission.status === "complete");
  const completionPercent = Math.round((completeMissions.length / missions.length) * 100);
  const activeMission = missions.find((mission) => mission.status === "active");

  return {
    stage: resolveLearningDashboardStage(completionPercent),
    completionPercent,
    nextBestAction: activeMission?.title || "Continue today’s learning mission",
    unlockedCapabilities: completeMissions.flatMap((mission) => mission.unlocks),
    missions,
    badges: foundingStudentBadges,
  };
}

export function buildLearningTimeline({
  learnerName,
  goals,
  sessions,
}: {
  learnerName: string;
  goals: LearningGoal[];
  sessions: LearningSession[];
}): LearningTimelineItem[] {
  return [
    {
      id: "joined-beastlearning",
      type: "joined",
      title: `${learnerName} joined BeastLearning`,
      summary: "Learning record started.",
      occurredAt: privateBetaDate,
    },
    ...goals.slice(0, 3).map((goal) => ({
      id: `goal-${goal.id}`,
      type: "goal" as const,
      title: goal.title,
      summary: `${goal.status} goal at ${goal.progress}% progress.`,
      occurredAt: privateBetaDate,
    })),
    ...sessions.slice(0, 2).map((session) => ({
      id: `session-${session.id}`,
      type: "course" as const,
      title: session.title,
      summary: `${session.courseTitle} · ${session.status}`,
      occurredAt: privateBetaDate,
    })),
  ];
}

export function buildCertificateDocuments(
  certificates: LearningCertificate[]
): LearningCertificateDocument[] {
  return certificates.map((certificate) => ({
    ...certificate,
    completionMetadata: [
      `Award: ${certificate.certificateTitle}`,
      `Learner: ${certificate.learnerName}`,
      `Path: ${certificate.pathName}`,
      `Completed: ${certificate.completionDate}`,
      `Skills: ${certificate.skillsDemonstrated.join(", ")}`,
      `Certificate ID: ${certificate.certificateId}`,
      `Completion record: ${certificate.completionRecordId}`,
    ],
    downloadUrl: `/api/learning/certificates/${certificate.certificateId}`,
    generatedAt: privateBetaDate,
  }));
}

export const mockParentLearnerRelationships: ParentLearnerRelationship[] = [
  {
    id: "founding-parent-current",
    parentUserId: "parent-placeholder",
    learnerUserId: "current",
    learnerName: "Current learner",
    status: "accepted",
    invitedAt: privateBetaDate,
    acceptedAt: privateBetaDate,
  },
];

export const mockPersistedFeedback: LearningFeedbackItem[] = [
  {
    id: "feedback-private-beta-1",
    category: "suggestion",
    message: "Keep the first week focused on one clear mission at a time.",
    context: "Founding Student onboarding",
    submittedAt: privateBetaDate,
    status: "Reviewing",
  },
];

export function buildStaticPrivateBetaData({
  learnerName,
  goals,
  sessions,
  certificates,
}: {
  learnerName: string;
  goals: LearningGoal[];
  sessions: LearningSession[];
  certificates: LearningCertificate[];
}): LearningPrivateBetaData {
  return {
    readiness: buildLearningBetaReadiness({ completedMissionCount: 5 }),
    timeline: buildLearningTimeline({ learnerName, goals, sessions }),
    parentRelationships: mockParentLearnerRelationships,
    certificateDocuments: buildCertificateDocuments(certificates),
    feedback: mockPersistedFeedback,
    persistenceStatus: "limited",
  };
}
