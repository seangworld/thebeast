"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  getLearningActivityCompletionPayload,
  getNextQueuedLearningActivity,
  type LearningActivityRunnerRow,
} from "@/lib/learning/activityRunner";
import {
  buildLessonEngineDefinition,
  getLessonEngineProgress,
} from "@/lib/learning/lessonEngine";
import { createClient } from "@/lib/supabase/client";
import { LessonEngine } from "../LessonEngine";

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
  const [checkedPhases, setCheckedPhases] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [reflection, setReflection] = useState("");
  const [confidence, setConfidence] = useState("Still building");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const completedActivity = activity?.status === "Completed";

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

    const engine = buildLessonEngineDefinition(activity);
    const progress = getLessonEngineProgress({
      checkedPhases,
      phaseCount: engine.phases.length,
      reflection,
      confidence,
      quizAnswers,
      practiceAnswers,
      lesson: engine.lesson,
    });

    if (!progress.readyToComplete) {
      setMessage(
        "Finish the teaching steps, answer the quiz, and add a reflection before completing."
      );
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
            {completedActivity ? (
              <DashboardCard accent="green">
                <SectionHeader
                  eyebrow="Activity Complete"
                  title="Nice work. Your progress is saved."
                  description="Your activity is marked complete, your XP now counts on Today, and the next queued activity is ready when available."
                  action={<ModuleBadge module="learning" label="Saved" />}
                />
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/dashboard/today" className="beast-button">
                    Return to Today
                  </Link>
                  <Link
                    href="/dashboard/learning/activities"
                    className="beast-button-secondary"
                  >
                    View Activities
                  </Link>
                </div>
              </DashboardCard>
            ) : null}

            <LessonEngine
              activity={activity}
              courseTitle={course?.title || "Learning path"}
              checkedPhases={checkedPhases}
              quizAnswers={quizAnswers}
              practiceAnswers={practiceAnswers}
              reflection={reflection}
              confidence={confidence}
              saving={saving}
              completed={Boolean(completedActivity)}
              onPhaseChange={(phaseId, checked) =>
                setCheckedPhases((current) => ({
                  ...current,
                  [phaseId]: checked,
                }))
              }
              onQuizAnswer={(questionId, answer) =>
                setQuizAnswers((current) => ({
                  ...current,
                  [questionId]: answer,
                }))
              }
              onPracticeAnswer={(practiceId, answer) =>
                setPracticeAnswers((current) => ({
                  ...current,
                  [practiceId]: answer,
                }))
              }
              onReflectionChange={setReflection}
              onConfidenceChange={setConfidence}
              onComplete={completeActivity}
            />
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
