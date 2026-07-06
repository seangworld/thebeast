"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  getLearningActivityChecklist,
  getLearningActivityCompletionPayload,
  getLearningActivityInstructions,
  getLearningActivityPrimaryActionLabel,
  getNextQueuedLearningActivity,
  type LearningActivityRunnerRow,
} from "@/lib/learning/activityRunner";
import { createClient } from "@/lib/supabase/client";

type ActivityRow = LearningActivityRunnerRow & {
  user_id: string;
  course_id?: string | null;
};

type CourseRow = {
  id: string;
  title: string;
};

function getActivityId(param: string | string[] | undefined) {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}

export default function LearningActivityRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = getActivityId(params?.activityId);
  const [userId, setUserId] = useState("");
  const [activity, setActivity] = useState<ActivityRow | null>(null);
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [allActivities, setAllActivities] = useState<LearningActivityRunnerRow[]>([]);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [reflection, setReflection] = useState("");
  const [confidence, setConfidence] = useState("Still building");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const checklist = useMemo(
    () => getLearningActivityChecklist(activity?.activity_type || "Lesson"),
    [activity?.activity_type]
  );
  const completedSteps = checklist.filter((_, index) => checkedSteps[index]).length;
  const readyToComplete =
    activity?.status === "Completed" ||
    (completedSteps === checklist.length && reflection.trim().length > 0);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const authUser = userData?.user;

      if (userError || !authUser) {
        router.replace("/login");
        return;
      }

      setUserId(authUser.id);

      const activityResult = await supabase
        .from("learning_activities")
        .select("*")
        .eq("id", activityId)
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (activityResult.error) throw activityResult.error;

      if (!activityResult.data) {
        setMessage("Activity not found for this account.");
        setActivity(null);
        setLoading(false);
        return;
      }

      const activityRow = activityResult.data as ActivityRow;

      const [activitiesResult, courseResult] = await Promise.all([
        supabase
          .from("learning_activities")
          .select("id, activity_type, title, difficulty, estimated_minutes, xp, status, completed_at, sort_order")
          .eq("user_id", authUser.id)
          .order("sort_order", { ascending: true }),
        activityRow.course_id
          ? supabase
              .from("learning_courses")
              .select("id, title")
              .eq("id", activityRow.course_id)
              .eq("user_id", authUser.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (activitiesResult.error) throw activitiesResult.error;
      if (courseResult.error) throw courseResult.error;

      setActivity(activityRow);
      setAllActivities((activitiesResult.data || []) as LearningActivityRunnerRow[]);
      setCourse((courseResult.data as CourseRow | null) || null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load this activity."
      );
    } finally {
      setLoading(false);
    }
  }, [activityId, router]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  async function completeActivity() {
    if (!activity || !userId || activity.status === "Completed") return;

    if (!readyToComplete) {
      setMessage("Finish each step and add a short reflection before completing.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();
      const completionPayload = getLearningActivityCompletionPayload();
      const { error } = await supabase
        .from("learning_activities")
        .update(completionPayload)
        .eq("id", activity.id)
        .eq("user_id", userId);

      if (error) throw error;

      const nextQueued = getNextQueuedLearningActivity(allActivities, activity.id);

      if (nextQueued) {
        const unlockResult = await supabase
          .from("learning_activities")
          .update({ status: "Ready" })
          .eq("id", nextQueued.id)
          .eq("user_id", userId);

        if (unlockResult.error) throw unlockResult.error;
      }

      await loadActivity();
      setMessage(
        nextQueued
          ? `Activity complete. ${nextQueued.title} is ready next.`
          : "Activity complete. Return to Today for your next recommendation."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to complete activity."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="learning" label="Activity Runner" />
              <h1 className="beast-title">
                {activity?.title || "Learning Activity"}
              </h1>
              <p className="beast-subtitle">
                Complete the guided steps, capture a reflection, and Beast will
                unlock the next activity in your queue.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/learning/activities" className="beast-button-secondary">
                Activities
              </Link>
              <Link href="/dashboard/today" className="beast-button">
                Today
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <DashboardCard accent={message.startsWith("Activity complete") ? "green" : "red"}>
            <p className="text-sm font-semibold text-white">{message}</p>
          </DashboardCard>
        ) : null}

        {loading ? (
          <DashboardCard accent="learning">
            <div className="grid animate-pulse gap-3">
              <div className="h-6 w-40 rounded bg-[#2a3242]" />
              <div className="h-32 rounded bg-[#2a3242]" />
            </div>
          </DashboardCard>
        ) : activity ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Type"
                value={activity.activity_type}
                detail={course?.title || "Learning path"}
                icon="A"
                tone="purple"
              />
              <MetricTile
                label="Difficulty"
                value={activity.difficulty}
                detail="Current challenge level"
                icon="D"
                tone="green"
              />
              <MetricTile
                label="Time"
                value={`${activity.estimated_minutes} min`}
                detail="Estimated focus block"
                icon="T"
                tone="blue"
              />
              <MetricTile
                label="XP"
                value={String(activity.xp)}
                detail={activity.status}
                icon="XP"
                tone="yellow"
              />
            </section>

            <DashboardCard accent="learning">
              <SectionHeader
                eyebrow={activity.activity_type}
                title="What to do"
                description={getLearningActivityInstructions(activity.activity_type)}
                action={<ModuleBadge module="learning" label={activity.status} />}
              />
              <div className="mt-5 grid gap-3">
                {checklist.map((step, index) => (
                  <label
                    key={step}
                    className="flex items-start gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <input
                      type="checkbox"
                      checked={activity.status === "Completed" || Boolean(checkedSteps[index])}
                      disabled={activity.status === "Completed"}
                      onChange={(event) =>
                        setCheckedSteps((current) => ({
                          ...current,
                          [index]: event.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 accent-indigo-300"
                    />
                    <span className="text-sm font-semibold leading-6 text-[#dbe3ef]">
                      {step}
                    </span>
                  </label>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard accent="purple">
              <SectionHeader
                eyebrow="Reflection"
                title="Capture the takeaway"
                description="A short reflection helps you leave knowing what changed and what to do next."
              />
              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="text-sm font-semibold text-[#c7cfdb]">
                    What did you learn or notice?
                  </span>
                  <textarea
                    value={reflection}
                    onChange={(event) => setReflection(event.target.value)}
                    disabled={activity.status === "Completed"}
                    rows={5}
                    className="beast-input mt-2 min-h-32 resize-y"
                    placeholder="Write one sentence about what clicked, what was hard, or what you want to review."
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[#c7cfdb]">
                    Confidence
                  </span>
                  <select
                    value={confidence}
                    onChange={(event) => setConfidence(event.target.value)}
                    disabled={activity.status === "Completed"}
                    className="beast-input mt-2"
                  >
                    <option>Still building</option>
                    <option>Getting clearer</option>
                    <option>Ready for more</option>
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={completeActivity}
                    disabled={
                      saving ||
                      activity.status === "Completed" ||
                      !readyToComplete
                    }
                    className="beast-button disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : activity.status === "Completed"
                        ? "Completed"
                        : getLearningActivityPrimaryActionLabel(activity.activity_type)}
                  </button>
                  <p className="text-sm font-semibold text-[#9aa7b8]">
                    {activity.status === "Completed"
                      ? "This activity is complete."
                      : `${completedSteps} of ${checklist.length} steps checked - Confidence: ${confidence}`}
                  </p>
                </div>
              </div>
            </DashboardCard>
          </>
        ) : (
          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Not Found"
              title="Activity unavailable"
              description="This activity may have been completed elsewhere or does not belong to this account."
              action={<Link href="/dashboard/learning/activities" className="beast-button">Activities</Link>}
            />
          </DashboardCard>
        )}
      </div>
    </main>
  );
}
