import { redirect } from "next/navigation";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { getProfileDisplayName } from "@/lib/profile";
import { createRouteClient } from "@/lib/supabase/server";
import type { LearningGoal } from "@/lib/learning/types";
import LearningGoalDiscovery from "../LearningGoalDiscovery";
import LearningGoalsManager from "./LearningGoalsManager";
import { LearningWorkspaceShell } from "../LearningWorkspaceShell";

export const dynamic = "force-dynamic";

function normalizeStatus(value: unknown): LearningGoal["status"] {
  return ["Active", "Planned", "Paused", "Completed"].includes(String(value))
    ? (String(value) as LearningGoal["status"])
    : "Planned";
}

function normalizePriority(value: unknown): LearningGoal["priority"] {
  return ["High", "Medium", "Low"].includes(String(value))
    ? (String(value) as LearningGoal["priority"])
    : "Medium";
}

function mapGoalRow(row: Record<string, unknown>): LearningGoal {
  return {
    id: String(row.id),
    learnerId: String(row.learner_profile_id || "current"),
    title: String(row.title || "Learning goal"),
    category: String(row.category || "Learning"),
    target: String(row.target || "Build a clear learning path."),
    progress: Number(row.progress || 0),
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
  };
}

export default async function LearningGoalsPage() {
  const supabase = createRouteClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const [profileResult, goalsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("preferred_name, display_name, full_name, username, role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("learning_goals")
      .select("id, learner_profile_id, title, category, target, priority, status, progress")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const learnerName = getProfileDisplayName(
    profileResult.data as Parameters<typeof getProfileDisplayName>[0],
    user
  );
  const learningGoals = ((goalsResult.data || []) as Record<string, unknown>[]).map(mapGoalRow);
  const activeGoal = learningGoals.find((goal) => goal.status === "Active");

  return (
    <LearningWorkspaceShell
      title="Goals"
      eyebrow="Learning goals"
      description={`${learnerName}, manage what you want to learn. Your Mentor keeps one goal active while preserving progress across every goal.`}
      actions={<LearningGoalDiscovery recentGoals={learningGoals} />}
    >
        <DashboardCard accent="learning">
          <SectionHeader
            eyebrow="Goal Management"
            title={activeGoal ? `${activeGoal.title} is active` : "Choose an active Learning Goal"}
            description="Archive, restore, resume, or switch goals without deleting historical progress."
          />
          <div className="mt-5">
            <LearningGoalsManager initialGoals={learningGoals} />
          </div>
        </DashboardCard>
    </LearningWorkspaceShell>
  );
}
