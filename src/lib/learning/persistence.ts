import {
  buildCertificateDocuments,
  buildLearningBetaReadiness,
  buildLearningTimeline,
} from "./privateBeta";
import type {
  LearningCertificate,
  LearningFeedbackCategory,
  LearningFeedbackItem,
  LearningFeedbackStatus,
  LearningGoal,
  LearningPrivateBetaData,
  LearningSession,
} from "./types";

type LearningFeedbackRow = {
  id: string;
  category: LearningFeedbackCategory;
  message: string;
  context: string | null;
  status: LearningFeedbackStatus;
  created_at: string;
};

type LearningDataClient = {
  from: (table: string) => any;
};

export const learningTableNames = {
  profiles: "learning_profiles",
  goals: "learning_goals",
  plans: "learning_plans",
  sessions: "learning_sessions",
  progress: "learning_progress",
  mastery: "learning_mastery",
  achievements: "learning_achievements",
  certificates: "learning_certificates",
  studyHabits: "learning_study_habits",
  feedback: "learning_feedback",
  history: "learning_history",
  parentLinks: "learning_parent_links",
} as const;

export function mapFeedbackRow(row: LearningFeedbackRow): LearningFeedbackItem {
  return {
    id: row.id,
    category: row.category,
    message: row.message,
    context: row.context || undefined,
    submittedAt: row.created_at,
    status: row.status,
  };
}

export function buildFeedbackInsertPayload({
  userId,
  category,
  message,
  context,
}: {
  userId: string;
  category: LearningFeedbackCategory;
  message: string;
  context?: string;
}) {
  return {
    user_id: userId,
    category,
    message,
    context: context || null,
    status: "New" as LearningFeedbackStatus,
  };
}

export async function loadLearningPrivateBetaData({
  supabase,
  userId,
  learnerName,
  goals,
  sessions,
  certificates,
}: {
  supabase: LearningDataClient;
  userId: string;
  learnerName: string;
  goals: LearningGoal[];
  sessions: LearningSession[];
  certificates: LearningCertificate[];
}): Promise<LearningPrivateBetaData> {
  const completedMissionCount = Math.min(
    8,
    [
      Boolean(learnerName),
      goals.length > 0,
      goals.some((goal) => goal.status === "Active"),
      sessions.length > 0,
      sessions.some((session) => session.status === "Completed"),
      certificates.length > 0,
    ].filter(Boolean).length
  );
  const baseData: LearningPrivateBetaData = {
    readiness: buildLearningBetaReadiness({ completedMissionCount }),
    timeline: buildLearningTimeline({ learnerName, goals, sessions }),
    parentRelationships: [],
    certificateDocuments: buildCertificateDocuments(certificates),
    feedback: [],
    persistenceStatus: "connected",
  };

  try {
    const { data, error } = await supabase
      .from(learningTableNames.feedback)
      .select("id, category, message, context, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !data) return baseData;

    return {
      ...baseData,
      feedback: (data as LearningFeedbackRow[]).map((row) => mapFeedbackRow(row)),
    };
  } catch {
    return baseData;
  }
}
