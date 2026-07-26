"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
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
  calculateMonthlyRecurringTotal,
  isActiveRecurringSource,
  numberValue,
} from "@/lib/financialMetrics";
import { buildMobileTodayCards } from "@/lib/mobileSharedServices";
import { buildBeastOSIntelligence } from "@/lib/platform/recommendationEngine";
import type {
  PlatformActivity,
  PlatformTimelineEvent,
} from "@/lib/platform/types";
import {
  getGoalProgressPercent,
  loadUserGoals,
  type BeastGoalDataClient,
  type Goal,
} from "@/lib/platform/goals";
import {
  assembleTodayDayPlan,
  buildManualTodayContribution,
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

type MoneyDebt = {
  id: string;
  name?: string | null;
  balance?: number | null;
  minimum_payment?: number | null;
  due_date?: number | null;
  is_archived?: boolean | null;
  assigned_income_date?: string | null;
  created_at?: string | null;
};

type MoneyBill = {
  id: string;
  name?: string | null;
  amount?: number | null;
  frequency?: string | null;
  due_date?: number | null;
  is_archived?: boolean | null;
  next_due_date_after_payment?: string | null;
  assigned_income_date?: string | null;
  created_at?: string | null;
};

type MoneyIncome = {
  id: string;
  name?: string | null;
  amount?: number | null;
  frequency?: string | null;
  next_date?: string | null;
  is_active?: boolean | null;
  is_archived?: boolean | null;
};

type MoneySettings = {
  starting_balance?: number | null;
  checking_buffer?: number | null;
};

type MoneyPayment = {
  id: string;
  amount?: number | null;
  amount_paid?: number | null;
  payment_date?: string | null;
  created_at?: string | null;
};

type TodayState = {
  userId: string;
  name: string;
  learnerProfileId: string | null;
  planId: string | null;
  sessionId: string | null;
  courses: CourseRow[];
  activities: ActivityRow[];
  debts: MoneyDebt[];
  bills: MoneyBill[];
  incomes: MoneyIncome[];
  cashSettings: MoneySettings | null;
  billPayments: MoneyPayment[];
  debtPayments: MoneyPayment[];
  goals: Goal[];
};

const emptyState: TodayState = {
  userId: "",
  name: "",
  learnerProfileId: null,
  planId: null,
  sessionId: null,
  courses: [],
  activities: [],
  debts: [],
  bills: [],
  incomes: [],
  cashSettings: null,
  billPayments: [],
  debtPayments: [],
  goals: [],
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
  const [manualItemTitle, setManualItemTitle] = useState("");
  const [manualTodayItems, setManualTodayItems] = useState<TodayContribution[]>([]);
  const { now } = useRuntimeToday();
  const todayDate = now.toISOString().slice(0, 10);

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
        debtsResult,
        billsResult,
        incomesResult,
        cashSettingsResult,
        billPaymentsResult,
        debtPaymentsResult,
        goalsResult,
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
          supabase.from("debts").select("*").eq("user_id", authUser.id),
          supabase
            .from("bill_events")
            .select("*")
            .eq("user_id", authUser.id)
            .order("due_date", { ascending: true }),
          supabase
            .from("income_events")
            .select("*")
            .eq("user_id", authUser.id)
            .order("next_date", { ascending: true }),
          supabase
            .from("cash_settings")
            .select("*")
            .eq("user_id", authUser.id)
            .maybeSingle(),
          supabase
            .from("bill_payments")
            .select("*")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("debt_payments")
            .select("*")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false })
            .limit(8),
          loadUserGoals(supabase as unknown as BeastGoalDataClient),
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
        debts: (debtsResult.data || []) as MoneyDebt[],
        bills: (billsResult.data || []) as MoneyBill[],
        incomes: (incomesResult.data || []) as MoneyIncome[],
        cashSettings: cashSettingsResult.data as MoneySettings | null,
        billPayments: (billPaymentsResult.data || []) as MoneyPayment[],
        debtPayments: (debtPaymentsResult.data || []) as MoneyPayment[],
        goals: goalsResult.goals,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your Guidance Counselor had trouble opening today's learning plan. Try again in a moment."
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
          : "Your Guidance Counselor had trouble choosing the next lesson. Try again in a moment."
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
  const moneySnapshot = useMemo(() => {
    const activeDebts = state.debts.filter(
      (debt) => !debt.is_archived && numberValue(debt.balance) > 0
    );
    const activeBills = state.bills.filter((bill) => !bill.is_archived);

    return {
      activeDebts,
      activeBills,
      monthlyIncome: calculateMonthlyRecurringTotal(
        state.incomes.filter(isActiveRecurringSource)
      ),
      monthlyBills: calculateMonthlyRecurringTotal(activeBills),
      debtMinimums: activeDebts.reduce(
        (sum, debt) => sum + numberValue(debt.minimum_payment),
        0
      ),
      startingCash: numberValue(state.cashSettings?.starting_balance),
      buffer: numberValue(state.cashSettings?.checking_buffer),
    };
  }, [state]);
  const moneyIntelligence = useMemo(
    () =>
      buildBeastOSIntelligence({
        ...moneySnapshot,
        billPayments: state.billPayments,
        debtPayments: state.debtPayments,
        now,
      }),
    [
      moneySnapshot,
      now,
      state.billPayments,
      state.debtPayments,
    ]
  );
  const learningContribution: TodayContribution = useMemo(
    () => ({
      id: "today-learning-priority",
      source: "learning",
      type: "Resume",
      title: readyActivity?.title || "Ask your Guidance Counselor for the first step",
      summary: readyActivity
        ? `${readyActivity.estimated_minutes} minutes with your current learning plan.`
        : state.courses[0]
          ? `Your ${state.courses[0].title} plan needs its next learning step.`
          : "Your Guidance Counselor can help define the first useful learning step.",
      reason:
        readyActivity
          ? "This activity is ready in your saved BeastEducation plan."
          : state.courses[0]
            ? `${state.courses[0].title} is in your learning path, but no activity is ready.`
            : "No course or ready learning activity is available yet.",
      recommendedAction: readyActivity ? "Continue with Guidance Counselor" : "Ask Guidance Counselor",
      actionUrl: "/dashboard/education#mentor-session",
      activeDate: todayDate,
      timing: readyActivity ? "Active" : "Informational",
      priority: readyActivity ? "Medium" : "Low",
      importance: readyActivity ? 6 : 2,
      urgency: readyActivity ? 6 : 1,
      preferenceWeight: 5,
      estimatedMinutes: readyActivity?.estimated_minutes || 20,
      dismissible: true,
      status: "Active",
      sourceEvidenceIds: readyActivity
        ? [readyActivity.id]
        : state.courses[0]
          ? [state.courses[0].id]
          : [],
    }),
    [readyActivity, state.courses, todayDate]
  );
  const moneyContributions = useMemo<TodayContribution[]>(
    () =>
      moneyIntelligence.recommendations.map((recommendation) => ({
        id: `today-${recommendation.id}`,
        source: "money",
        type: "Recommendation",
        title: recommendation.title,
        summary: recommendation.summary,
        reason: recommendation.reason,
        recommendedAction: recommendation.recommendedAction,
        actionUrl: recommendation.actionUrl || "/dashboard/money",
        activeDate: todayDate,
        timing: "Active",
        priority: recommendation.priority,
        importance:
          recommendation.priority === "Critical"
            ? 10
            : recommendation.priority === "High"
              ? 8
              : recommendation.priority === "Medium"
                ? 5
                : 2,
        urgency:
          recommendation.priority === "Critical"
            ? 10
            : recommendation.priority === "High"
              ? 8
              : recommendation.priority === "Medium"
                ? 5
                : 2,
        preferenceWeight: 5,
        estimatedMinutes: 10,
        dismissible: recommendation.dismissible,
        status: recommendation.completed ? "Completed" : "Active",
        sourceEvidenceIds: [recommendation.id],
      })),
    [moneyIntelligence.recommendations, todayDate]
  );
  const todayDayPlan = useMemo(
    () =>
      assembleTodayDayPlan({
        contributions: [
          ...(learningContribution.sourceEvidenceIds.length > 0
            ? [learningContribution]
            : []),
          ...moneyContributions,
          ...manualTodayItems,
        ],
        today: todayDate,
      }),
    [
      learningContribution,
      manualTodayItems,
      moneyContributions,
      todayDate,
    ]
  );
  const primaryPriority = todayDayPlan.active[0] || learningContribution;
  const primaryPriorityScore = getTodayPriorityScore(primaryPriority);
  const primaryPriorityExplanation =
    getTodayContributionExplanation(primaryPriority);
  const primaryActionAvailability =
    getTodayItemActionAvailability(primaryPriority);
  const actionButtons: { action: TodayItemActionType; label: string }[] = [
    { action: "Dismiss", label: "Dismiss" },
    { action: "Snooze", label: "Snooze 1h" },
    { action: "Complete", label: "Complete" },
    { action: "Reschedule", label: "Tomorrow" },
  ];
  const mobileTodayCards = useMemo(
    () => buildMobileTodayCards(todayDayPlan.active, 3),
    [todayDayPlan.active]
  );
  const professionalRecommendations = useMemo(
    () =>
      todayDayPlan.active
        .filter((item) => item.source === "learning" || item.source === "money")
        .slice(0, 4),
    [todayDayPlan.active]
  );
  const recentActivity = useMemo<PlatformActivity[]>(() => {
    const learningActivity = completedActivities
      .filter((activity) => activity.completed_at || activity.created_at)
      .map((activity) => ({
        id: `learning-completed-${activity.id}`,
        module: "learning" as const,
        title: activity.title,
        summary: `${activity.activity_type} completed and saved to your learning history.`,
        timestamp: activity.completed_at || activity.created_at || "",
        actionUrl: getLearningActivityRoute(activity.id),
      }));

    return [...learningActivity, ...moneyIntelligence.activities]
      .filter((item) => item.timestamp.slice(0, 10) === todayDate)
      .sort(
        (left, right) =>
          new Date(right.timestamp).getTime() -
          new Date(left.timestamp).getTime()
      )
      .slice(0, 5);
  }, [completedActivities, moneyIntelligence.activities, todayDate]);
  const upcomingEvents = useMemo<PlatformTimelineEvent[]>(
    () =>
      moneyIntelligence.timelineEvents
        .filter((item) => new Date(item.timestamp).getTime() >= now.getTime())
        .sort(
          (left, right) =>
            new Date(left.timestamp).getTime() -
            new Date(right.timestamp).getTime()
        )
        .slice(0, 5),
    [moneyIntelligence.timelineEvents, now]
  );
  const activeGoals = useMemo(
    () =>
      state.goals
        .filter((goal) =>
          ["Proposed", "Active", "Blocked"].includes(goal.status)
        )
        .slice(0, 3),
    [state.goals]
  );

  function handleTodayAction(
    contribution: TodayContribution,
    action: TodayItemActionType
  ) {
    const requestedAt = new Date().toISOString();
    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const rescheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000);
    rescheduledFor.setHours(9, 0, 0, 0);

    const request = buildTodayItemActionRequest({
      contribution,
      action,
      requestedAt,
      reason: `${action} requested from BeastOS Today and routed to the ${contribution.source} owner contract.`,
      snoozedUntil: action === "Snooze" ? snoozedUntil : undefined,
      rescheduledFor:
        action === "Reschedule" ? rescheduledFor.toISOString() : undefined,
    });

    setActionRequest(request);
    setMessage(
      `${action} request queued for ${request.source}. BeastOS did not change source module records directly.`
    );
  }

  function addManualTodayItem() {
    const title = manualItemTitle.trim();
    if (!title) {
      setMessage("Add a title before adding a manual Today item.");
      return;
    }

    const manualContribution = buildManualTodayContribution({
      id: `manual-${Date.now()}`,
      title,
      activeDate: todayDate,
      priority: "Medium",
      estimatedMinutes: 15,
    });

    setManualTodayItems((current) => [...current, manualContribution]);
    setManualItemTitle("");
    setMessage("Manual Today item added to the BeastOS daily plan.");
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-7">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="beastos" label="BeastOS Today" />
              <h1 className="beast-title">
                {state.name ? `${getBeastGreeting(now)}, ${state.name}` : "Today"}
              </h1>
              <p className="beast-subtitle">
                See what needs attention, what changed, and the clearest next
                action across your life.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/timeline" className="beast-button-secondary">
                What changed
              </Link>
              <Link href="/dashboard/notifications" className="beast-button">
                Review alerts
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <DashboardCard accent="beastos">
            <p className="text-sm font-semibold text-[#dbe3ef]">{message}</p>
          </DashboardCard>
        ) : null}

        {loading ? (
          <DashboardCard accent="learning">
            <div className="grid animate-pulse gap-3">
              <div className="h-5 w-36 rounded bg-[#2a3242]" />
              <div className="h-10 w-full max-w-xl rounded bg-[#2a3242]" />
              <div className="h-16 rounded bg-[#2a3242]" />
            </div>
          </DashboardCard>
        ) : null}

        <section
          className="space-y-3 md:hidden"
          data-mobile-shared-service="today"
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Priorities", todayDayPlan.active.length],
              ["Changes", recentActivity.length],
              ["Upcoming", upcomingEvents.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-lg border border-[#2a3242] bg-[#111827] p-3"
              >
                <div className="truncate text-[10px] font-black uppercase text-[#7f8da3]">
                  {label}
                </div>
                <div className="mt-1 text-xl font-black text-white">{value}</div>
              </div>
            ))}
          </div>

          {mobileTodayCards.map((card) => (
            <div
              key={card.id}
              className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ModuleBadge module={card.source} />
                {card.metadata.slice(0, 3).map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#2a3242] px-2.5 py-1 text-[11px] font-bold text-[#c7cfdb]"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <h2 className="mt-3 break-words text-lg font-black text-white">
                {card.title}
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-[#c7cfdb]">
                {card.summary}
              </p>
              <p className="mt-2 break-words text-xs font-semibold leading-5 text-[#9aa7b8]">
                Why it matters:{" "}
                {
                  todayDayPlan.active.find((item) => item.id === card.id)
                    ?.reason
                }
              </p>
              <Link href={card.href} className="mt-4 flex w-full justify-center beast-button">
                {card.actionLabel}
              </Link>
            </div>
          ))}

          <div
            className="grid grid-cols-2 gap-2"
            data-mobile-today-source-actions="module-contract-event"
          >
            {actionButtons.map(({ action, label }) => (
              <button
                key={action}
                type="button"
                onClick={() => handleTodayAction(primaryPriority, action)}
                disabled={!primaryActionAvailability[action]}
                className="min-h-[44px] rounded-lg border border-[#2a3242] bg-[#111827] px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <DashboardCard accent="beastos" className="hidden md:block">
          <SectionHeader
            eyebrow="What needs my attention?"
            title="Today's Priorities"
            description={`${todayDayPlan.headline}. ${todayDayPlan.summary}`}
            action={
              <ModuleBadge
                module="beastos"
                label={`${todayDayPlan.active.length} active`}
              />
            }
          />
          <div className="mt-5 grid gap-3">
            {todayDayPlan.active.slice(0, 5).map((item, index) => {
              const explanation = getTodayContributionExplanation(item);
              const availability = getTodayItemActionAvailability(item);

              return (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 ${
                    index === 0
                      ? "border-[#38bdf8]/45 bg-[#38bdf8]/10"
                      : "border-[#2a3242] bg-[#111827]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ModuleBadge
                      module={item.source === "plans" ? "beastos" : item.source}
                    />
                    <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-black text-[#c7cfdb]">
                      {index === 0 ? "Start here" : item.priority}
                    </span>
                    {item.estimatedMinutes ? (
                      <span className="text-xs font-bold text-[#9aa7b8]">
                        About {item.estimatedMinutes} min
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                      <h2 className="text-xl font-black text-white">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                        {item.summary}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#dbe3ef]">
                        Why this matters: {item.reason}
                      </p>
                      <details className="mt-2 text-xs text-[#9aa7b8]">
                        <summary className="cursor-pointer font-bold">
                          Explain why shown
                        </summary>
                        <p className="mt-2 leading-5">
                          {explanation.displayReason}
                        </p>
                      </details>
                    </div>
                    <Link href={item.actionUrl} className="beast-button">
                      {item.recommendedAction}
                    </Link>
                  </div>
                  {index === 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {actionButtons.map(({ action, label }) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => handleTodayAction(item, action)}
                          disabled={!availability[action]}
                          className="rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
            {todayDayPlan.active.length === 0 ? (
              <div className="rounded-xl border border-green-400/25 bg-green-400/10 p-4">
                <h2 className="font-black text-green-100">
                  Nothing urgent needs your attention
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
                  Your professionals have not supplied an active priority from
                  your current records.
                </p>
              </div>
            ) : null}
          </div>
        </DashboardCard>

        <DashboardCard accent="learning">
          <SectionHeader
            eyebrow="What are my AI professionals recommending?"
            title="Professional Recommendations"
            description="Only recommendations supported by your current module records appear here."
          />
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {professionalRecommendations.map((item) => (
              <article
                key={`professional-${item.id}`}
                className="flex h-full flex-col rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-[#9aa7b8]">
                    {item.source === "money"
                      ? "Money Coach"
                      : "Your Guidance Counselor Recommends"}
                  </div>
                  <ModuleBadge
                    module={item.source === "plans" ? "beastos" : item.source}
                  />
                </div>
                <h3 className="mt-3 text-lg font-black text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                  {item.summary}
                </p>
                <p className="mt-3 flex-1 text-sm font-semibold leading-6 text-[#dbe3ef]">
                  Why it matters: {item.reason}
                </p>
                <Link href={item.actionUrl} className="mt-4 beast-button">
                  {item.recommendedAction}
                </Link>
              </article>
            ))}
            {professionalRecommendations.length === 0 ? (
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-6 text-[#c7cfdb] lg:col-span-2">
                No AI professional has raised a recommendation supported by your
                current records. Today will surface one when a module has
                something useful to say.
              </div>
            ) : null}
          </div>
        </DashboardCard>

        <section className="grid gap-4 xl:grid-cols-2">
          <DashboardCard accent="timeline">
            <SectionHeader
              eyebrow="What changed today?"
              title="Recent Activity"
              description="Meaningful changes from your active modules."
            />
            <div className="mt-5 grid gap-3">
              {recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={item.actionUrl || "/dashboard/timeline"}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition hover:border-[#38bdf8]/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ModuleBadge module={item.module} />
                    <span className="text-xs font-bold text-[#9aa7b8]">
                      {new Date(item.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="mt-2 font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#c7cfdb]">
                    {item.summary}
                  </p>
                </Link>
              ))}
              {recentActivity.length === 0 ? (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <h3 className="font-black text-white">No new activity yet</h3>
                  <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                    Completed learning and recorded Money activity will appear
                    here.
                  </p>
                </div>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard accent="calendar">
            <SectionHeader
              eyebrow="What is coming?"
              title="Upcoming Events"
              description="Source-owned dates that may affect your next decision."
            />
            <div className="mt-5 grid gap-3">
              {upcomingEvents.map((item) => (
                <Link
                  key={item.id}
                  href={item.actionUrl || "/dashboard/calendar"}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition hover:border-[#38bdf8]/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ModuleBadge module={item.module} />
                    <span className="text-xs font-bold text-[#9aa7b8]">
                      {new Date(item.timestamp).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="mt-2 font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#c7cfdb]">
                    {item.summary}
                  </p>
                </Link>
              ))}
              {upcomingEvents.length === 0 ? (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-6 text-[#c7cfdb]">
                  No upcoming module event is available from your current
                  records.
                </div>
              ) : null}
              <Link href="/dashboard/calendar" className="beast-button-secondary">
                Open Calendar
              </Link>
            </div>
          </DashboardCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardCard accent="goals">
            <SectionHeader
              eyebrow="Where am I making progress?"
              title="Goals Progress"
              description="Your active BeastOS goals and their next known step."
              action={<ModuleBadge module="goals" />}
            />
            <div className="mt-5 grid gap-3">
              {activeGoals.map((goal) => {
                const progress = getGoalProgressPercent(goal);

                return (
                  <Link
                    key={goal.id}
                    href="/dashboard/goals"
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition hover:border-[#38bdf8]/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black text-white">{goal.title}</h3>
                      <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-black text-[#c7cfdb]">
                        {goal.status}
                      </span>
                    </div>
                    {progress !== null ? (
                      <>
                        <div className="mt-3 h-2 rounded-full bg-[#0f1419]">
                          <div
                            className="h-full rounded-full bg-[#38bdf8]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="mt-2 text-xs font-bold text-[#9aa7b8]">
                          {progress}% complete
                        </div>
                      </>
                    ) : null}
                    <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                      {goal.currentStep ||
                        goal.summary ||
                        "Open the goal to define the next measurable step."}
                    </p>
                  </Link>
                );
              })}
              {activeGoals.length === 0 ? (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-6 text-[#c7cfdb]">
                  No active BeastOS goal is available yet. Today will show
                  progress after you create a real goal.
                </div>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard accent="beastos">
            <SectionHeader
              eyebrow="What should I do next?"
              title="Quick Actions"
              description="Jump directly to the workspace that can move the day forward."
            />
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                ["Ask Money Coach", "/dashboard/money"],
                ["Ask Guidance Counselor", "/dashboard/education"],
                ["Review Calendar", "/dashboard/calendar"],
                ["Check Goals", "/dashboard/goals"],
                ["Upload a Document", "/dashboard/uploads"],
                ["Search Beast", "/dashboard/search"],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="beast-button-secondary min-h-[44px]"
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-5 border-t border-[#2a3242] pt-5">
              <label className="text-xs font-black uppercase text-[#9aa7b8]">
                Add my own priority
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={manualItemTitle}
                  onChange={(event) => setManualItemTitle(event.target.value)}
                  placeholder="Add a manual Today item"
                  className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-[#2a3242] bg-[#111827] px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-[#7f8da3] focus:border-indigo-300"
                />
                <button
                  type="button"
                  onClick={addManualTodayItem}
                  className="beast-button"
                >
                  Add to Today
                </button>
              </div>
              {manualTodayItems.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {manualTodayItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[#2a3242] bg-[#111827] p-3 text-sm font-bold text-white"
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </DashboardCard>
        </section>

        {actionRequest ? (
          <DashboardCard accent="beastos">
            <p className="text-sm font-semibold leading-6 text-[#dbe3ef]">
              {actionRequest.action} is queued through the {actionRequest.source}{" "}
              contract. BeastOS left the source record unchanged.
            </p>
          </DashboardCard>
        ) : null}

        <details
          id="activities"
          className="scroll-mt-24 rounded-2xl border border-[#2a3242] bg-[#1a1f2b] p-5"
        >
          <summary className="cursor-pointer text-base font-black text-white">
            Learning plan details
          </summary>
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <DashboardCard accent="learning">
              <SectionHeader
                eyebrow="Your Guidance Counselor Recommends"
                title={readyActivity?.title || "Ask your Guidance Counselor for the first step"}
                description={
                  readyActivity
                    ? `This step is ready and should take about ${readyActivity.estimated_minutes} minutes.`
                    : state.activities.length > 0
                      ? "You finished the current set. Ask your Guidance Counselor for the next learning step."
                      : "Ask your Guidance Counselor above to prepare the first teaching moment."
                }
              />
              <div className="mt-4">
                {readyActivity ? (
                  <Link
                    href="/dashboard/education#mentor-session"
                    className="beast-button"
                  >
                    Continue with Guidance Counselor
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={generateNextActivity}
                    className="beast-button"
                    disabled={generating || loading}
                  >
                    {generating
                      ? "Choosing..."
                      : "Let's choose what to learn next"}
                  </button>
                )}
              </div>
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
                        <h3 className="mt-1 font-black text-white">
                          {activity.title}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-[#9aa7b8]">
                        {activity.estimated_minutes} min
                      </span>
                    </div>
                    <Link
                      href={getLearningActivityRoute(activity.id)}
                      className="mt-3 inline-flex beast-button-secondary"
                    >
                      {activity.status === "Completed"
                        ? "Review with Tutor"
                        : "Continue"}
                    </Link>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard accent="purple">
              <SectionHeader
                eyebrow="Learning path"
                title={state.courses[0]?.title || "Your first course"}
                description={`${state.courses.length} course${
                  state.courses.length === 1 ? "" : "s"
                } in your path.`}
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
                    <div className="mt-2 text-xs font-bold text-[#9aa7b8]">
                      {Number(course.progress || 0)}% explored
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>
        </details>

        <details className="rounded-2xl border border-[#2a3242] bg-[#111827] p-5">
          <summary className="cursor-pointer text-sm font-black text-[#c7cfdb]">
            How Today decides what to show
          </summary>
          <div className="mt-5">
            <SectionHeader
              eyebrow="Shared Today"
              title="Cross-module contribution contract"
              description="Today orders source-owned signals without replacing module engines."
            />
            <div
              className="mt-4 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4"
              aria-label="Priority Engine"
            >
              <div className="text-xs font-black uppercase text-[#9aa7b8]">
                Priority Engine
              </div>
              <div className="mt-2 text-2xl font-black text-white">
                {primaryPriorityScore.score}
              </div>
              <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                {primaryPriorityScore.explanation}
              </p>
              <div className="mt-4 text-xs font-black uppercase text-[#9aa7b8]">
                Explain why shown
              </div>
              <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                {primaryPriorityExplanation.displayReason}
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {todayContributionContractRules.map((rule) => (
                <p
                  key={rule}
                  className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4 text-sm leading-6 text-[#c7cfdb]"
                >
                  {rule}
                </p>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {todayContributionSources.map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-[#2a3242] px-3 py-1 text-xs font-black uppercase text-[#9aa7b8]"
                >
                  {source}
                </span>
              ))}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-[#2a3242] p-3 text-sm text-[#c7cfdb]">
                Completed Day: {todayDayPlan.completed.length}
              </div>
              <div className="rounded-lg border border-[#2a3242] p-3 text-sm text-[#c7cfdb]">
                Tomorrow Preview: {todayDayPlan.tomorrow.length}
              </div>
              <div className="rounded-lg border border-[#2a3242] p-3 text-sm text-[#c7cfdb]">
                Weekly Outlook:{" "}
                {todayDayPlan.weeklyOutlook.reduce(
                  (sum, item) => sum + item.active,
                  0
                )}{" "}
                active
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase text-[#7f8da3]">
              Actions route through module contract events. BeastOS does not
              directly mutate module records.
            </p>
          </div>
        </details>
      </div>
    </main>
  );
}
