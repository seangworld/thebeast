import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { getProfileDisplayName } from "@/lib/profile";
import { createRouteClient } from "@/lib/supabase/server";
import type { LearningGoal } from "@/lib/learning/types";
import LearningGoalDiscovery from "../LearningGoalDiscovery";
import LearningGoalsManager from "./LearningGoalsManager";

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
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="learning" label="Learning Goals" />
              <h1 className="beast-title">Learning Goals</h1>
              <p className="beast-subtitle">
                {learnerName}, manage what you want to learn. Your Guidance Counselor keeps one goal active while preserving progress across every goal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LearningGoalDiscovery recentGoals={learningGoals} />
              <Link href="/dashboard/learning" className="beast-button-secondary">
                Back to Guidance Counselor
              </Link>
            </div>
          </div>
        </section>

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
      </div>
    </main>
  );
}
