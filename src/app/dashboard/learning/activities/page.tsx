"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  getLearningActivityInstructions,
  getLearningActivityRoute,
  getNewestReadyLearningActivity,
  type LearningActivityRunnerRow,
} from "@/lib/learning/activityRunner";
import { createClient } from "@/lib/supabase/client";

type CourseRow = {
  id: string;
  title: string;
};

type ActivityWithCourse = LearningActivityRunnerRow & {
  course_id?: string | null;
};

function getActivityTone(status: string) {
  if (status === "Completed") return "border-green-400/35 bg-green-400/10";
  if (status === "Ready") return "border-indigo-300/40 bg-indigo-300/10";
  return "border-[#2a3242] bg-[#111827]";
}

export default function LearningActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityWithCourse[]>([]);
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadActivities = useCallback(async () => {
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

      const [activitiesResult, coursesResult] = await Promise.all([
        supabase
          .from("learning_activities")
          .select("*")
          .eq("user_id", authUser.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("learning_courses")
          .select("id, title")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: true }),
      ]);

      if (activitiesResult.error) throw activitiesResult.error;
      if (coursesResult.error) throw coursesResult.error;

      const courseMap = Object.fromEntries(
        ((coursesResult.data || []) as CourseRow[]).map((course) => [
          course.id,
          course.title,
        ])
      );

      setActivities((activitiesResult.data || []) as ActivityWithCourse[]);
      setCourses(courseMap);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your Guide had trouble finding your lessons. Try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const completed = activities.filter((activity) => activity.status === "Completed");
  const open = activities.filter((activity) => activity.status !== "Completed");
  const readyActivity = getNewestReadyLearningActivity(activities);
  const totalXp = completed.reduce((sum, activity) => sum + Number(activity.xp || 0), 0);
  const remainingMinutes = open.reduce(
    (sum, activity) => sum + Number(activity.estimated_minutes || 0),
    0
  );
  const progressPercent =
    activities.length === 0 ? 0 : Math.round((completed.length / activities.length) * 100);

  const nextAction = useMemo(() => {
    if (readyActivity) return `Your Guide recommends ${readyActivity.title} next.`;
    if (activities.length > 0) return "You finished the current set. Return to Today and your Guide will choose what comes next.";
    return "Return to Today and your Guide will prepare your first learning step.";
  }, [activities.length, readyActivity]);

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="learning" label="Continue" />
              <h1 className="beast-title">Continue With Your Guide</h1>
              <p className="beast-subtitle">
                Your Guide keeps the path simple: one next lesson, the right support,
                and progress you can come back to later.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/today" className="beast-button-secondary">
                Today
              </Link>
              <Link href="/dashboard/learning" className="beast-button">
                Your Guide
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <DashboardCard accent="red">
            <p className="text-sm font-semibold text-red-100">{message}</p>
          </DashboardCard>
        ) : null}

        {loading ? (
          <DashboardCard accent="learning">
            <div className="grid animate-pulse gap-3">
              <div className="h-6 w-40 rounded bg-[#2a3242]" />
              <div className="h-20 rounded bg-[#2a3242]" />
              <div className="h-20 rounded bg-[#2a3242]" />
            </div>
          </DashboardCard>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Progress"
                value={`${progressPercent}%`}
                detail={`${completed.length} of ${activities.length} lessons saved`}
                icon="P"
                tone="purple"
              />
              <MetricTile
                label="Practice Credit"
                value={String(totalXp)}
                detail="Earned from saved lessons"
                icon="PC"
                tone="yellow"
              />
              <MetricTile
                label="Next"
                value={String(open.length)}
                detail="Learning steps prepared"
                icon="A"
                tone="green"
              />
              <MetricTile
                label="Time together"
                value={`${remainingMinutes} min`}
                detail="Estimated learning time"
                icon="T"
                tone="blue"
              />
            </section>

            <DashboardCard accent="learning">
              <SectionHeader
                eyebrow="Your next step"
                title={readyActivity?.title || "Your next lesson is not ready yet"}
                description={nextAction}
                action={<ModuleBadge module="learning" label={readyActivity?.activity_type || "Guide"} />}
              />
              {readyActivity ? (
                <div className="mt-5">
                  <Link
                    href={getLearningActivityRoute(readyActivity.id)}
                    className="beast-button"
                  >
                    Continue with Tutor
                  </Link>
                </div>
              ) : (
                <div className="mt-5">
                  <Link href="/dashboard/today" className="beast-button">
                    Ask My Guide
                  </Link>
                </div>
              )}
            </DashboardCard>

            <section className="grid gap-4">
              {activities.map((activity) => (
                <DashboardCard key={activity.id} accent="learning">
                  <div
                    className={`rounded-xl border p-4 ${getActivityTone(
                      activity.status
                    )}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase text-[#7f8da3]">
                          {activity.activity_type} - {activity.difficulty}
                        </div>
                        <h2 className="mt-1 text-xl font-black text-white">
                          {activity.title}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c7cfdb]">
                          {getLearningActivityInstructions(activity.activity_type)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase text-[#9aa7b8]">
                          <span>
                            {activity.course_id
                              ? courses[activity.course_id] || "Course"
                              : "Course"}
                          </span>
                          <span>{activity.estimated_minutes} min</span>
                          <span>{activity.xp} practice credit</span>
                          <span>{activity.status === "Completed" ? "Saved" : "Ready when you are"}</span>
                        </div>
                      </div>
                      <Link
                        href={getLearningActivityRoute(activity.id)}
                        className={
                          activity.status === "Completed"
                            ? "beast-button-secondary"
                            : "beast-button"
                        }
                      >
                        {activity.status === "Completed" ? "Review with Tutor" : "Continue"}
                      </Link>
                    </div>
                  </div>
                </DashboardCard>
              ))}

              {activities.length === 0 ? (
                <DashboardCard accent="learning">
                  <SectionHeader
                    eyebrow="Getting Started"
                    title="Your Guide is ready to help"
                    description="Open Today and your Guide will prepare the first step from your learning path."
                    action={<Link href="/dashboard/today" className="beast-button">Meet My Guide</Link>}
                  />
                </DashboardCard>
              ) : null}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
