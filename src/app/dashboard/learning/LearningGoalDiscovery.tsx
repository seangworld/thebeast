"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLearningActivityRoute } from "@/lib/learning/activityRunner";
import {
  buildGeneratedLearningActivityPayload,
  getGeneratedActivityTitle,
  getGeneratedLearningSubject,
} from "@/lib/learning/generatedActivities";
import { generateLearningPlan } from "@/lib/learning/planGenerator";
import { createClient } from "@/lib/supabase/client";
import type { LearningGoal, LearningGoalBuilderDraft } from "@/lib/learning/types";

const suggestedCategories = [
  "K-12",
  "Certifications",
  "Technology",
  "Business",
  "Languages",
  "Science",
  "History",
  "Arts",
  "Personal Development",
];

const exampleGoals = [
  "Security+",
  "Network+",
  "Python",
  "Excel",
  "Spanish",
  "7th Grade Math",
  "Algebra",
  "Geometry",
  "US History",
];

function buildGoalDraft(goal: string, category: string): LearningGoalBuilderDraft {
  const trimmedGoal = goal.trim();

  return {
    learningObjective: trimmedGoal,
    motivation: `I want to learn ${trimmedGoal}.`,
    targetOutcome: `Build a useful learning plan for ${trimmedGoal}.`,
    timeline: "Start now",
    currentLevel: "Brand new",
    studyPace: "Steady: 3-4 sessions per week",
  };
}

export default function LearningGoalDiscovery({
  recentGoals,
  triggerLabel = "Add Learning Goal",
}: {
  recentGoals: LearningGoal[];
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Personal Development");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [savedActivity, setSavedActivity] = useState<{ id: string; title: string } | null>(null);
  const trimmedQuery = query.trim();
  const filteredRecentGoals = useMemo(() => {
    const normalized = trimmedQuery.toLowerCase();
    return recentGoals
      .filter((goal) => !normalized || goal.title.toLowerCase().includes(normalized))
      .slice(0, 5);
  }, [recentGoals, trimmedQuery]);

  function chooseGoal(goal: string, category?: string) {
    setQuery(goal);
    if (category) setSelectedCategory(category);
    setMessage("");
    setSavedActivity(null);
  }

  async function createGoal() {
    if (!trimmedQuery || saving) return;

    setSaving(true);
    setMessage("");
    setSavedActivity(null);

    try {
      const supabase = createClient();
      const draft = buildGoalDraft(trimmedQuery, selectedCategory);
      const generated = generateLearningPlan(draft);
      const subject = getGeneratedLearningSubject(draft);
      const activityTitle = getGeneratedActivityTitle(draft);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const authUser = userData?.user;

      if (userError || !authUser) {
        throw new Error("Sign in again before adding this learning goal.");
      }

      const learnerResult = await supabase
        .from("learning_profiles")
        .select("id")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (learnerResult.error) throw learnerResult.error;

      const learnerProfileId = learnerResult.data?.[0]?.id;

      if (!learnerProfileId) {
        throw new Error("Complete Learning Setup before adding a learning goal.");
      }

      const goalResult = await supabase
        .from("learning_goals")
        .insert({
          user_id: authUser.id,
          learner_profile_id: learnerProfileId,
          title: trimmedQuery,
          category: selectedCategory,
          target: draft.targetOutcome,
          priority: "High",
          status: "Active",
          progress: 0,
        })
        .select("id")
        .single();

      if (goalResult.error) throw goalResult.error;

      const courseResult = await supabase
        .from("learning_courses")
        .upsert(
          {
            user_id: authUser.id,
            learner_profile_id: learnerProfileId,
            title: subject,
            subject,
            status: "In progress",
            progress: 0,
          },
          { onConflict: "user_id,title" }
        )
        .select("id")
        .single();

      if (courseResult.error) throw courseResult.error;

      const planResult = await supabase
        .from("learning_plans")
        .insert({
          user_id: authUser.id,
          learner_profile_id: learnerProfileId,
          goal_id: goalResult.data.id,
          title: generated.title,
          summary: generated.readinessSignal.summary,
          weekly_session_target: generated.weeklyRhythm.length,
        })
        .select("id")
        .single();

      if (planResult.error) throw planResult.error;

      const sessionResult = await supabase
        .from("learning_sessions")
        .insert({
          user_id: authUser.id,
          learner_profile_id: learnerProfileId,
          plan_id: planResult.data.id,
          title: generated.recommendedSessions[0]?.title || `Start ${subject}`,
          course_title: subject,
          scheduled_for: new Date().toISOString(),
          duration_minutes:
            generated.recommendedSessions[0]?.duration.includes("45") ? 45 : 35,
          status: "Scheduled",
        })
        .select("id")
        .single();

      if (sessionResult.error) throw sessionResult.error;

      const sortResult = await supabase
        .from("learning_activities")
        .select("sort_order")
        .eq("user_id", authUser.id)
        .order("sort_order", { ascending: false })
        .limit(1);

      if (sortResult.error) throw sortResult.error;

      const nextSortOrder = Number(sortResult.data?.[0]?.sort_order || 0) + 1;
      const activityResult = await supabase
        .from("learning_activities")
        .insert(
          buildGeneratedLearningActivityPayload({
            userId: authUser.id,
            learnerProfileId,
            courseId: courseResult.data.id,
            planId: planResult.data.id,
            sessionId: sessionResult.data.id,
            draft,
            generatedPlan: generated,
            sortOrder: nextSortOrder,
          })
        )
        .select("id, title")
        .single();

      if (activityResult.error) throw activityResult.error;

      setSavedActivity(activityResult.data);
      setMessage(
        `Great choice. I will build your learning plan for ${trimmedQuery}. Let's begin with a quick placement so I know where to start.`
      );
      window.dispatchEvent(new Event("beastlearning:goal-created"));
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to add this learning goal right now."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="beast-button">
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="learning-goal-dialog-title"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-indigo-300/35 bg-[#0b1020] p-4 shadow-2xl sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-indigo-100">
                  Learning Goal
                </p>
                <h2 id="learning-goal-dialog-title" className="mt-2 text-2xl font-black text-white">
                  What would you like to learn?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                  Search freely, choose a recent goal, or start from a category.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-[#dbe3ef] transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-5">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#7f8da3]">
                  Search or type any goal
                </span>
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setMessage("");
                    setSavedActivity(null);
                  }}
                  className="mt-2 w-full rounded-xl border border-[#2a3242] bg-[#0f1419] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-[#596579] focus:border-indigo-300/60 focus:bg-[#111827]"
                  placeholder={exampleGoals.join(", ")}
                  autoFocus
                />
              </label>

              <section aria-label="Recent goals">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Recent goals
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {filteredRecentGoals.length > 0 ? (
                    filteredRecentGoals.map((goal) => (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => chooseGoal(goal.title, goal.category)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-[#dbe3ef] transition hover:bg-white/10"
                      >
                        {goal.title}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-[#9aa7b8]">
                      Your recent learning goals will appear here.
                    </p>
                  )}
                </div>
              </section>

              <section aria-label="Suggested categories">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Suggested categories
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {suggestedCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`rounded-xl border px-3 py-3 text-left text-sm font-black transition ${
                        selectedCategory === category
                          ? "border-indigo-300/60 bg-indigo-300/15 text-indigo-50"
                          : "border-white/10 bg-white/5 text-[#dbe3ef] hover:bg-white/10"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </section>

              <div className="rounded-xl border border-indigo-300/25 bg-indigo-300/10 p-4">
                <div className="text-xs font-bold uppercase text-indigo-100">
                  Mentor
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-indigo-50">
                  {message ||
                    (trimmedQuery
                      ? `Great choice. I can build a starter plan for ${trimmedQuery} and begin with a quick placement.`
                      : "Tell me what you want to learn, and I will turn it into a first learning plan.")}
                </p>
                {savedActivity ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={getLearningActivityRoute(savedActivity.id)}
                      className="beast-button"
                    >
                      Start Placement
                    </Link>
                    <Link href="/dashboard/learning/goals" className="beast-button-secondary">
                      View Learning Goals
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-[#7f8da3]">
                  Selected category: {selectedCategory}
                </p>
                <button
                  type="button"
                  onClick={createGoal}
                  disabled={!trimmedQuery || saving}
                  className="beast-button disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Building plan..." : "Create Learning Goal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
