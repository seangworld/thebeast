import { createAdminClient } from "../supabase/admin";
import { mockLearningCertificates } from "./certificates";
import { mockLearningGoals, mockLearningSessions } from "./mockData";
import { buildStaticPrivateBetaData } from "./privateBeta";
import type {
  LearnerProfile,
  LearningFeedbackCategory,
  LearningFeedbackItem,
  LearningFeedbackStatus,
  LearningPrivateBetaData,
} from "./types";

type LearningFeedbackRow = {
  id: string;
  category: LearningFeedbackCategory;
  message: string;
  context: string | null;
  status: LearningFeedbackStatus;
  created_at: string;
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
  learner,
}: {
  learner: LearnerProfile;
}): Promise<LearningPrivateBetaData> {
  const fallback = buildStaticPrivateBetaData({
    learnerName: learner.name,
    goals: mockLearningGoals,
    sessions: mockLearningSessions,
    certificates: mockLearningCertificates,
  });
  const supabase = createAdminClient();

  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from(learningTableNames.feedback)
      .select("id, category, message, context, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !data) return fallback;

    return {
      ...fallback,
      feedback: data.map((row) => mapFeedbackRow(row as LearningFeedbackRow)),
      persistenceStatus: "supabase-ready",
    };
  } catch {
    return fallback;
  }
}
