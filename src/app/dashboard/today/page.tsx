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
  getLearningActivityRoute,
  getNewestReadyLearningActivity,
} from "@/lib/learning/activityRunner";
import { getLearningActivityTitleForCourse } from "@/lib/learning/sampleContentRegistry";
import { useRuntimeToday } from "@/lib/hooks/useRuntimeToday";
import { getBeastGreeting } from "@/lib/runtimeDate";
import { createClient } from "@/lib/supabase/client";
import { getProfileDisplayName } from "@/lib/profile";
import {
  buildTodayItemActionRequest,
  getTodayContributionExplanation,
  getTodayPriorityScore,
  getTodayItemActionAvailability,
  todayContributionContractRules,
  todayContributionSources,
  type TodayContribution,
  type TodayItemActionRequest,
  type TodayItemActionType,
} from "@/lib/platform/today";

type CourseRow = {
  id: string;
  title: string;
  progress?: number | null;
};

type ActivityRow = {
  id: string;
  course_id?: string | null;
  activity_type: string;
  title: string;
  difficulty: string;
  estimated_minutes: number;
  xp: number;
  status: string;
  completed_at?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

type ProfileNameRow = {
  preferred_name?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  username?: string | null;
};

type TodayState = {
  userId: string;
  name: string;
  learnerProfileId: string | null;
  planId: string | null;
  sessionId: string | null;
  courses: CourseRow[];
  activities: ActivityRow[];
};

const emptyState: TodayState = {
  userId: "",
  name: "",
  learnerProfileId: null,
  planId: null,
  sessionId: null,
  courses: [],
  activities: [],
};

const activityBlueprint = ["Lesson", "Practice", "Quiz", "AI Tutor Challenge", "Reflection"];

function getActivityTone(status: string) {
  if (status === "Completed") return "border-green-400/35 bg-green-400/10";
  if (status === "Ready") return "border-indigo-300/40 bg-indigo-300/10";
  return "border-[#2a3242] bg-[#111827]";
}

function getStarterActivityTitle(courseTitle: string) {
  return getLearningActivityTitleForCourse(courseTitle);
}

function buildStarterActivityRow({
  userId,
  learnerProfileId,
  course,
  planId,
  sessionId,
  sortOrder,
}: {
  userId: string;
  learnerProfileId: string;
  course: CourseRow;
  planId: string;
  sessionId: string | null;
  sortOrder: number;
}) {
  return {
    user_id: userId,
    learner_profile_id: learnerProfileId,
    course_id: course.id,
    plan_id: planId,
    session_id: sessionId,
    activity_type: "Lesson",
    title: getStarterActivityTitle(course.title),
    difficulty: "Beginner",
    estimated_minutes: 35,
    xp: 20,
    status: "Ready",
    sort_order: sortOrder,
  };
}

export default function TodayPage() {
  const router = useRouter();
  const [state, setState] = useState<TodayState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [actionRequest, setActionRequest] =
    useState<TodayItemActionRequest | null>(null);
  const { now } = useRuntimeToday();

  const ensureLearningPlan = useCallback(
    async ({
      supabase,
      userId,
      learnerProfileId,
      courses,
      existingPlanId,
      existingSessionId,
      existingActivities,
    }: {
      supabase: ReturnType<typeof createClient>;
      userId: string;
      learnerProfileId: string | null;
      courses: CourseRow[];
      existingPlanId: string | null;
      existingSessionId: string | null;
      existingActivities: ActivityRow[];
    }) => {
      if (!learnerProfileId || courses.length === 0) {
        return {
          planId: existingPlanId,
          sessionId: existingSessionId,
          activities: existingActivities,
        };
      }

      let planId = existingPlanId;
      let sessionId = existingSessionId;
      const primaryCourse = courses[0];

      if (!planId) {
        const { data, error } = await supabase
          .from("learning_plans")
          .insert({
            user_id: userId,
            learner_profile_id: learnerProfileId,
            title: `${primaryCourse.title} learning path`,
            summary: `Continue with ${primaryCourse.title}.`,
            weekly_session_target: 3,
          })
          .select("id")
          .single();

        if (error) throw error;
        planId = data.id;
      }

      if (!sessionId) {
        const { data, error } = await supabase
          .from("learning_sessions")
          .insert({
            user_id: userId,
            learner_profile_id: learnerProfileId,
            plan_id: planId,
            title: `Continue ${primaryCourse.title}`,
            course_title: primaryCourse.title,
            scheduled_for: new Date().toISOString(),
            duration_minutes: 20,
            status: "Scheduled",
          })
          .select("id")
          .single();

        if (error) throw error;
        sessionId = data.id;
      }

      const activePlanId = planId;
      if (!activePlanId) {
        throw new Error("Unable to create a learning plan for today's mission.");
      }

      const openExistingActivities = existingActivities.filter(
        (activity) => activity.status !== "Completed"
      );

      if (openExistingActivities.length > 0) {
        return { planId, sessionId, activities: existingActivities };
      }

      const nextSortOrder =
        existingActivities.reduce(
          (max, activity) => Math.max(max, Number(activity.sort_order || 0)),
          0
        ) + 1;

      const activityRows =
        existingActivities.length > 0
          ? [
              buildStarterActivityRow({
                userId,
                learnerProfileId,
                course: primaryCourse,
                planId: activePlanId,
                sessionId,
                sortOrder: nextSortOrder,
              }),
            ]
          : activityBlueprint.map((activityType, index) => {
              const course = courses[index % courses.length];
              return {
                user_id: userId,
                learner_profile_id: learnerProfileId,
                course_id: course.id,
                plan_id: activePlanId,
                session_id: index === 0 ? sessionId : null,
                activity_type: activityType,
                title:
                  index === 0
                    ? getStarterActivityTitle(course.title)
                    : `${activityType}: ${course.title}`,
                difficulty: index < 2 ? "Beginner" : "Adaptive",
                estimated_minutes: 15 + index * 5,
                xp: 10 + index * 5,
                status: index === 0 ? "Ready" : "Queued",
                sort_order: index + 1,
              };
            });

      const { data, error } = await supabase
        .from("learning_activities")
        .insert(activityRows)
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return {
        planId,
        sessionId,
        activities:
          existingActivities.length > 0
            ? [...existingActivities, ...((data || []) as ActivityRow[])]
            : ((data || []) as ActivityRow[]),
      };
    },
    []
  );

  const loadToday = useCallback(async () => {
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

      const [
        profileResult,
        learnerResult,
        coursesResult,
        plansResult,
        sessionsResult,
        activitiesResult,
      ] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("preferred_name, display_name, full_name, username")
            .eq("id", authUser.id)
            .maybeSingle(),
          supabase
            .from("learning_profiles")
            .select("id")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: true })
            .limit(1),
          supabase
            .from("learning_courses")
            .select("id, title, progress")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("learning_plans")
            .select("id")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: true })
            .limit(1),
          supabase
            .from("learning_sessions")
            .select("id")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: true })
            .limit(1),
          supabase
            .from("learning_activities")
            .select("*")
            .eq("user_id", authUser.id)
            .order("sort_order", { ascending: true }),
        ]);

      if (profileResult.error) throw profileResult.error;
      if (learnerResult.error) throw learnerResult.error;
      if (coursesResult.error) throw coursesResult.error;
      if (plansResult.error) throw plansResult.error;
      if (sessionsResult.error) throw sessionsResult.error;
      if (activitiesResult.error) throw activitiesResult.error;

      const learnerProfileId = learnerResult.data?.[0]?.id || null;
      const courses = (coursesResult.data || []) as CourseRow[];
      const ensured = await ensureLearningPlan({
        supabase,
        userId: authUser.id,
        learnerProfileId,
        courses,
        existingPlanId: plansResult.data?.[0]?.id || null,
        existingSessionId: sessionsResult.data?.[0]?.id || null,
        existingActivities: (activitiesResult.data || []) as ActivityRow[],
      });

      setState({
        userId: authUser.id,
        name: getProfileDisplayName(
          (profileResult.data as ProfileNameRow | null) || null,
          authUser
        ),
        learnerProfileId,
        planId: ensured.planId,
        sessionId: ensured.sessionId,
        courses,
        activities: ensured.activities,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your Mentor had trouble opening today's learning plan. Try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  }, [ensureLearningPlan, router]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  async function generateNextActivity() {
    if (generating) return;

    setGenerating(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const authUser = userData?.user;

      if (userError || !authUser) {
        router.replace("/login");
        return;
      }

      const learnerProfileId = state.learnerProfileId;
      const course = state.courses[0];
      const planId = state.planId;

      if (!learnerProfileId || !course || !planId) {
        setMessage(
          "Your learning path needs a course before Beast can create a mission. Open Learning Path to choose one."
        );
        return;
      }

      const existingReady = getNewestReadyLearningActivity(state.activities);
      if (existingReady) {
        router.push(getLearningActivityRoute(existingReady.id));
        return;
      }

      const nextSortOrder =
        state.activities.reduce(
          (max, activity) => Math.max(max, Number(activity.sort_order || 0)),
          0
        ) + 1;

      const { data, error } = await supabase
        .from("learning_activities")
        .insert(
          buildStarterActivityRow({
            userId: authUser.id,
            learnerProfileId,
            course,
            planId,
            sessionId: state.sessionId,
            sortOrder: nextSortOrder,
          })
        )
        .select("*")
        .single();

      if (error) throw error;

      const createdActivity = data as ActivityRow;
      setState((current) => ({
        ...current,
        activities: [...current.activities, createdActivity],
      }));
      setMessage(`${createdActivity.title} is ready. Your Tutor is opening it now.`);
      router.push(getLearningActivityRoute(createdActivity.id));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your Mentor had trouble choosing the next lesson. Try again in a moment."
      );
    } finally {
      setGenerating(false);
    }
  }

  const completedActivities = state.activities.filter(
    (activity) => activity.status === "Completed"
  );
  const openActivities = state.activities.filter(
    (activity) => activity.status !== "Completed"
  );
  const readyActivity = getNewestReadyLearningActivity(state.activities);
  const activityList = [
    ...openActivities.sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
    ),
    ...completedActivities
      .slice()
      .sort(
        (a, b) =>
          new Date(b.completed_at || b.created_at || 0).getTime() -
          new Date(a.completed_at || a.created_at || 0).getTime()
      ),
  ];
  const totalXp = completedActivities.reduce(
    (sum, activity) => sum + Number(activity.xp || 0),
    0
  );
  const estimatedMinutes = openActivities.reduce(
    (sum, activity) => sum + Number(activity.estimated_minutes || 0),
    0
  );
  const progressPercent =
    state.activities.length === 0
      ? 0
      : Math.round((completedActivities.length / state.activities.length) * 100);
  const streak = completedActivities.length > 0 ? 1 : 0;
  const learningContribution: TodayContribution = useMemo(
    () => ({
      id: "today-learning-priority",
      source: "learning",
      type: "Resume",
      title: readyActivity?.title || "Ask your Mentor for the first step",
      summary: "BeastLearning supplies the learning readiness and next activity.",
      reason:
        "Today ranks the supplied contribution without recomputing learning mastery.",
      recommendedAction: readyActivity ? "Continue with Mentor" : "Ask Mentor",
      actionUrl: "/dashboard/learning#mentor-session",
      timing: readyActivity ? "Active" : "Informational",
      priority: readyActivity ? "Medium" : "Low",
      importance: readyActivity ? 6 : 2,
      urgency: readyActivity ? 6 : 1,
      preferenceWeight: 5,
      estimatedMinutes: readyActivity?.estimated_minutes || 20,
      dismissible: true,
      status: "Active",
      sourceEvidenceIds: readyActivity ? [readyActivity.id] : [],
    }),
    [readyActivity]
  );
  const learningPriorityScore = getTodayPriorityScore(learningContribution);
  const learningExplanation =
    getTodayContributionExplanation(learningContribution);
  const learningActionAvailability =
    getTodayItemActionAvailability(learningContribution);
  const actionButtons: { action: TodayItemActionType; label: string }[] = [
    { action: "Dismiss", label: "Dismiss" },
    { action: "Snooze", label: "Snooze 1h" },
    { action: "Complete", label: "Complete" },
    { action: "Reschedule", label: "Tomorrow" },
  ];

  function handleTodayAction(action: TodayItemActionType) {
    const requestedAt = new Date().toISOString();
    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const rescheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000);
    rescheduledFor.setHours(9, 0, 0, 0);

    const request = buildTodayItemActionRequest({
      contribution: learningContribution,
      action,
      requestedAt,
      reason: `${action} requested from BeastOS Today and routed to the ${learningContribution.source} owner contract.`,
      snoozedUntil: action === "Snooze" ? snoozedUntil : undefined,
      rescheduledFor:
        action === "Reschedule" ? rescheduledFor.toISOString() : undefined,
    });

    setActionRequest(request);
    setMessage(
      `${action} request queued for ${request.source}. BeastOS did not change source module records directly.`
    );
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="learning" label="Student Today" />
              <h1 className="beast-title">
                {state.name ? `${getBeastGreeting(now)}, ${state.name}` : "Today"}
              </h1>
              <p className="beast-subtitle">
                Your Mentor has one clear next step ready for you.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/learning" className="beast-button">
                My Mentor
              </Link>
              <Link href="/dashboard/timeline" className="beast-button-secondary">
                View Timeline
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
              <div className="h-10 w-full max-w-xl rounded bg-[#2a3242]" />
              <div className="h-20 rounded bg-[#2a3242]" />
            </div>
          </DashboardCard>
        ) : null}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Saved lessons"
            value={`${progressPercent}%`}
            detail={`${completedActivities.length} of ${state.activities.length} learning steps saved`}
            icon="P"
            tone="purple"
          />
          <MetricTile
            label="Practice credit"
            value={String(totalXp)}
            detail="Earned from saved lessons"
            icon="PC"
            tone="yellow"
          />
          <MetricTile
            label="Streak"
            value={`${streak} day`}
            detail={streak ? "Learning started today" : "Save one lesson to start"}
            icon="S"
            tone="green"
          />
          <MetricTile
            label="Time together"
            value={`${estimatedMinutes} min`}
            detail="Estimated for today"
            icon="T"
            tone="blue"
          />
        </section>

        <DashboardCard accent="beastos">
          <SectionHeader
            eyebrow="Shared Today"
            title="Cross-module contribution contract"
            description="Today accepts approved contributions from BeastOS services and active modules, then orders and routes them without replacing the source module engines."
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {todayContributionSources.map((source) => (
              <span
                key={source}
                className="rounded-full border border-[#2a3242] bg-[#111827] px-3 py-1 text-xs font-black uppercase text-[#dbe3ef]"
              >
                {source}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Priority Engine
            </div>
            <div className="mt-2 text-3xl font-black text-white">
              {learningPriorityScore.score}
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#c7cfdb]">
              {learningPriorityScore.explanation}
            </p>
          </div>
          <div className="mt-5 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Explain why shown
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#dbe3ef]">
              {learningExplanation.displayReason}
            </p>
            <div className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-[#c7cfdb] md:grid-cols-2">
              <p>{learningExplanation.sourceReason}</p>
              <p>{learningExplanation.evidenceReason}</p>
              <p>{learningExplanation.timingReason}</p>
              <p>{learningExplanation.priorityReason}</p>
              <p>{learningExplanation.actionReason}</p>
              <p>{learningExplanation.scoreExplanation}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {todayContributionContractRules.map((rule) => (
              <div
                key={rule}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-6 text-[#dbe3ef]"
              >
                {rule}
              </div>
            ))}
          </div>
          {actionRequest ? (
            <div className="mt-5 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Latest Today action event
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#dbe3ef]">
                {actionRequest.action} is queued through the {actionRequest.source}{" "}
                contract for contribution {actionRequest.contributionId}. Dispatch
                mode: {actionRequest.dispatchMode}.
              </p>
            </div>
          ) : null}
        </DashboardCard>

        <DashboardCard accent="learning">
          <SectionHeader
            eyebrow="Your Mentor Recommends"
            title={readyActivity?.title || "Ask your Mentor for the first step"}
            description={
              readyActivity
                ? `This is the best next step for today. It should take about ${readyActivity.estimated_minutes} minutes.`
                : state.activities.length > 0
                  ? "You finished the current set. Ask your Mentor for the next learning step."
                  : "Your Mentor can prepare the first learning step from your path."
            }
            action={<ModuleBadge module="learning" label="Next Step" />}
          />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {readyActivity ? (
              <Link
                href="/dashboard/learning#mentor-session"
                className="beast-button"
              >
                Continue with Mentor
              </Link>
            ) : (
              <button
                type="button"
                onClick={generateNextActivity}
                className="beast-button"
                disabled={generating || loading}
              >
                {generating ? "Choosing..." : "Let's choose what to learn next"}
              </button>
            )}
            <p className="text-sm font-semibold text-[#c7cfdb]">
              Why this step:{" "}
              {readyActivity
                ? "It matches where you are now and gives the Tutor the right starting point."
                : state.activities.length > 0
                  ? "Your Mentor is ready to choose the next step."
                  : loading
                    ? "Your learning context is loading."
                    : "Start by asking your Mentor to prepare a lesson."}
            </p>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {actionButtons.map(({ action, label }) => (
              <button
                key={action}
                type="button"
                onClick={() => handleTodayAction(action)}
                disabled={!learningActionAvailability[action]}
                className="rounded-lg border border-[#2a3242] bg-[#111827] px-3 py-2 text-sm font-black text-white transition hover:border-[#818cf8] hover:bg-[#182033] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold uppercase text-[#7f8da3]">
            Actions route through module contract events. BeastOS does not directly
            mutate learning activity status, schedules, or mastery.
          </p>
        </DashboardCard>

        <section id="activities" className="grid scroll-mt-24 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Today"
              title="Your learning steps"
              description="Focus on the step your Mentor recommends. The rest is here only so you can review or return later."
            />
            <div className="mt-5 grid gap-3">
              {activityList.map((activity) => (
                <div
                  key={activity.id}
                  className={`rounded-xl border p-4 ${getActivityTone(activity.status)}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase text-[#7f8da3]">
                        {activity.activity_type} - {activity.difficulty}
                      </div>
                      <h3 className="mt-1 font-black text-white">{activity.title}</h3>
                    </div>
                    <span className="rounded-full border border-[#2a3242] bg-[#0f1419] px-3 py-1 text-xs font-bold text-[#dbe3ef]">
                      {activity.status === "Completed" ? "Saved" : "Ready when you are"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase text-[#9aa7b8]">
                    <span>{activity.estimated_minutes} min</span>
                    <span>{activity.xp} practice credit</span>
                  </div>
                  <div className="mt-4">
                    {activity.status === "Completed" ? (
                      <Link
                        href={getLearningActivityRoute(activity.id)}
                        className="beast-button-secondary"
                      >
                        Review with Tutor
                      </Link>
                    ) : (
                      <Link
                        href={getLearningActivityRoute(activity.id)}
                        className="beast-button"
                      >
                        Continue
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {activityList.length === 0 ? (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <h3 className="font-black text-white">No learning steps yet</h3>
                  <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                    {loading
                      ? "Your learning context is loading."
                      : "Ask your Mentor above to prepare the first teaching moment."}
                  </p>
                </div>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard accent="purple">
            <SectionHeader
              eyebrow="My Plan"
              title={state.courses[0]?.title || "Your first course"}
              description={
                state.courses.length > 0
                  ? `${state.courses.length} course${state.courses.length === 1 ? "" : "s"} in your path.`
                  : "Add a course in onboarding to build your path."
              }
            />
            <div className="mt-5 grid gap-3">
              {state.courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="font-black text-white">{course.title}</div>
                  <div className="mt-2 h-2 rounded-full bg-[#0f1419]">
                    <div
                      className="h-full rounded-full bg-[#818cf8]"
                      style={{ width: `${Number(course.progress || 0)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs font-bold uppercase text-[#7f8da3]">
                    {Number(course.progress || 0)}% of this path explored
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </section>
      </div>
    </main>
  );
}
