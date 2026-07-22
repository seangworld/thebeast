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
import { buildGuidedLearningSession } from "@/lib/learning/guidedSession";
import {
  buildLessonEngineDefinition,
  getLessonEngineProgress,
} from "@/lib/learning/lessonEngine";
import {
  buildLearnerReflectionOutcome,
  buildLearnerReflectionStorage,
  learnerReflectionOptions,
  type LearnerReflectionOption,
} from "@/lib/learning/reflectionEngine";
import { selectMentorTutor } from "@/lib/learning/tutorOrchestration";
import { getProfileDisplayName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { LessonEngine } from "../LessonEngine";

type ActivityRow = LearningActivityRunnerRow & {
  user_id: string;
  course_id?: string | null;
  session_id?: string | null;
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
  const [learnerName, setLearnerName] = useState("there");
  const [activity, setActivity] = useState<ActivityRow | null>(null);
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [activeGoalTitle, setActiveGoalTitle] = useState("");
  const [allActivities, setAllActivities] = useState<LearningActivityRunnerRow[]>([]);
  const [checkedPhases, setCheckedPhases] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [reflection, setReflection] = useState("");
  const [reflectionOption, setReflectionOption] = useState<LearnerReflectionOption | "">("");
  const [reflectionNote, setReflectionNote] = useState("");
  const [confidence, setConfidence] = useState("Still building");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
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
        setMessage("Your Guidance Counselor could not find that lesson for this account.");
        setActivity(null);
        setLoading(false);
        return;
      }

      const activityRow = activityResult.data as ActivityRow;

      const [activitiesResult, courseResult, profileResult] = await Promise.all([
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
        supabase
          .from("profiles")
          .select("preferred_name, display_name, full_name, username")
          .eq("id", authUser.id)
          .maybeSingle(),
      ]);

      if (activitiesResult.error) throw activitiesResult.error;
      if (courseResult.error) throw courseResult.error;
      if (profileResult.error) throw profileResult.error;

      setActivity(activityRow);
      setAllActivities((activitiesResult.data || []) as LearningActivityRunnerRow[]);
      setCourse((courseResult.data as CourseRow | null) || null);
      setLearnerName(getProfileDisplayName(profileResult.data, authUser));

      const goalsResult = await supabase
        .from("learning_goals")
        .select("title, status")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: true });

      if (!goalsResult.error) {
        const goals = (goalsResult.data || []) as { title?: string; status?: string }[];
        setActiveGoalTitle(
          goals.find((goal) => goal.status === "Active")?.title ||
            goals[0]?.title ||
            ""
        );
      }

      if (typeof window !== "undefined") {
        const storedDraft = window.localStorage.getItem(
          `beastlearning:tutor-chat:${activityRow.id}`
        );
        setHasDraft(Boolean(storedDraft));
        setSessionStarted(
          Boolean(storedDraft) ||
            activityRow.status === "In progress" ||
            activityRow.status === "Completed"
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your Tutor had trouble opening this lesson. Try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  }, [activityId, router]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  async function startSession() {
    if (!activity || !userId || activity.status === "Completed") return;

    setSessionStarted(true);
    setMessage("");

    if (activity.status === "Ready" || activity.status === "Queued") {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("learning_activities")
          .update({ status: "In progress" })
          .eq("id", activity.id)
          .eq("user_id", userId);

        if (error) throw error;
        setActivity({ ...activity, status: "In progress" });
      } catch {
        setMessage(
          "I saved the session on this device. If the network is available, I will also mark it in progress for your account."
        );
      }
    }
  }

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
        "Stay with the Tutor a little longer. Try the practice, answer the check-in question, and leave one reflection before we save this lesson."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();
      const completionPayload = getLearningActivityCompletionPayload();
      const reflectionStorage = buildLearnerReflectionStorage({
        option: reflectionOption,
        note: reflectionNote,
        mastered: progress.mastered,
        recommendedReview: progress.recommendedReview,
        nextRecommendation: progress.nextRecommendation,
      });
      const sessionOutcomePayload = {
        ...completionPayload,
        session_state: progress.recommendedReview ? "review_due" : "completed",
        session_recap: progress.continuity.handoffSummary,
        session_strengths: progress.assessmentSignals
          .filter((signal) => signal.score >= 70)
          .map((signal) => signal.label),
        session_weak_concepts: progress.completionReviewReasons,
        session_next_recommendation: progress.nextRecommendation,
        ...reflectionStorage,
      };
      const completionResult = await supabase
        .from("learning_activities")
        .update(sessionOutcomePayload)
        .eq("id", activity.id)
        .eq("user_id", userId);

      if (completionResult.error) {
        const fallbackResult = await supabase
          .from("learning_activities")
          .update(completionPayload)
          .eq("id", activity.id)
          .eq("user_id", userId);

        if (fallbackResult.error) throw fallbackResult.error;
      }

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
          ? `Nice work. ${nextQueued.title} is ready when your Guidance Counselor brings you back.`
          : "Nice work. Return to Today and your Guidance Counselor will recommend what comes next."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your Tutor had trouble saving this lesson. Try again in a moment."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveCompletedReflection() {
    if (!activity || !userId || activity.status !== "Completed") return;

    setSaving(true);
    setMessage("");

    try {
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
      const supabase = createClient();
      const { error } = await supabase
        .from("learning_activities")
        .update(
          buildLearnerReflectionStorage({
            option: reflectionOption,
            note: reflectionNote,
            mastered: progress.mastered,
            recommendedReview: progress.recommendedReview,
            nextRecommendation: progress.nextRecommendation,
          })
        )
        .eq("id", activity.id)
        .eq("user_id", userId);

      if (error) throw error;
      setMessage("Your reflection is saved for your Guidance Counselor.");
    } catch {
      setMessage("Reflection stayed private on this device because the saved reflection fields are not available yet.");
    } finally {
      setSaving(false);
    }
  }

  const engine = activity ? buildLessonEngineDefinition(activity) : null;
  const progress =
    activity && engine
      ? getLessonEngineProgress({
          checkedPhases,
          phaseCount: engine.phases.length,
          reflection,
          confidence,
          quizAnswers,
          practiceAnswers,
          lesson: engine.lesson,
        })
      : null;
  const tutorSelection =
    activity && progress
      ? selectMentorTutor({
          activityType: activity.activity_type,
          activityTitle: activity.title,
          courseTitle: course?.title || "Learning path",
          goalTitle: activeGoalTitle,
          weakArea: progress.completionReviewReasons[0],
        })
      : null;
  const reflectionOutcome =
    progress
      ? buildLearnerReflectionOutcome({
          option: reflectionOption,
          note: reflectionNote,
          mastered: progress.mastered,
          recommendedReview: progress.recommendedReview,
          nextRecommendation: progress.nextRecommendation,
        })
      : null;
  const guidedSession =
    activity && progress && tutorSelection
      ? buildGuidedLearningSession({
          activity,
          courseTitle: course?.title || "Learning path",
          goalTitle: activeGoalTitle,
          progress,
          tutorSelection,
          hasDraft,
          reflectionOutcome: reflectionOption ? reflectionOutcome || undefined : undefined,
        })
      : null;

  return (
    <main id="learning-session-main-content" className="beast-page">
      <a href="#active-learning-conversation" className="beast-skip-link">
        Skip to learning conversation
      </a>
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="learning" label="Guided session" />
              <h1 className="beast-title">
                {activity?.title || "Time with your Guidance Counselor"}
              </h1>
              <p className="beast-subtitle">
                Your Guidance Counselor introduces the session, brings in the right Tutor
                when teaching starts, and receives the outcome back for recap,
                reflection, and the next recommendation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/learning#mentor-session" className="beast-button-secondary">
                Back to Guidance Counselor
              </Link>
              <Link href="/dashboard/today" className="beast-button">
                Today
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <DashboardCard accent={message.startsWith("Nice work.") ? "green" : "red"}>
            <p className="text-sm font-semibold text-white" role="status" aria-live="polite">
              {message}
            </p>
          </DashboardCard>
        ) : null}

        {loading ? (
          <DashboardCard accent="learning">
            <div className="grid animate-pulse gap-3">
              <div className="h-6 w-40 rounded bg-[#2a3242]" />
              <div className="h-32 rounded bg-[#2a3242]" />
            </div>
          </DashboardCard>
        ) : activity && guidedSession && tutorSelection ? (
          <>
            <DashboardCard accent="learning">
              <SectionHeader
                eyebrow={`Session state: ${guidedSession.state.replace(/_/g, " ")}`}
                title={guidedSession.objective}
                description={guidedSession.mentorIntroduction}
                action={<ModuleBadge module="learning" label="Guidance Counselor" />}
              />
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Why this", tutorSelection.reason],
                  ["Goal connection", guidedSession.goalConnection],
                  ["Expected time", guidedSession.expectedTime],
                  ["Tutor handoff", guidedSession.tutorHandoff],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      {label}
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              {!completedActivity && !sessionStarted ? (
                <button type="button" className="beast-button mt-5" onClick={startSession}>
                  {hasDraft ? "Resume guided session" : "Start guided session"}
                </button>
              ) : null}
              {sessionStarted && !completedActivity ? (
                <p className="mt-5 text-sm font-semibold text-[#c7cfdb]">
                  {guidedSession.mentorReturn}
                </p>
              ) : null}
            </DashboardCard>

            {completedActivity ? (
              <DashboardCard accent="green">
                <SectionHeader
                  eyebrow="Guidance Counselor recap"
                  title="Your session is saved."
                  description={guidedSession.recap.meaning}
                  action={<ModuleBadge module="learning" label="Completed" />}
                />
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                    <h3 className="font-black text-white">Completed</h3>
                    <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                      {guidedSession.recap.completed}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                    <h3 className="font-black text-white">Strengths</h3>
                    <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#c7cfdb]">
                      {guidedSession.recap.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                    <h3 className="font-black text-white">Next step</h3>
                    <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                      {guidedSession.recap.nextStep}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/dashboard/today" className="beast-button">
                    Return to Today
                  </Link>
                  <Link
                    href="/dashboard/learning#mentor-session"
                    className="beast-button-secondary"
                  >
                    Back to Guidance Counselor
                  </Link>
                </div>
              </DashboardCard>
            ) : null}

            {sessionStarted || completedActivity ? (
              <LessonEngine
                activity={activity}
                courseTitle={course?.title || "Learning path"}
                learnerName={learnerName}
                checkedPhases={checkedPhases}
                quizAnswers={quizAnswers}
                practiceAnswers={practiceAnswers}
                reflection={reflection}
                confidence={confidence}
                tutorSelection={tutorSelection}
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
            ) : null}

            {(sessionStarted || completedActivity) ? (
              <DashboardCard accent="learning">
                <SectionHeader
                  eyebrow="Learner reflection"
                  title="How did this session feel?"
                  description="This is optional, quick, and used only as learning context for future Guidance Counselor recommendations."
                />
                <div
                  className="mt-5 flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-label="How this learning session felt"
                >
                  {learnerReflectionOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={reflectionOption === option}
                      className={
                        reflectionOption === option ? "beast-button" : "beast-button-secondary"
                      }
                      onClick={() => setReflectionOption(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <label className="mt-4 block">
                  <span className="text-sm font-semibold text-[#c7cfdb]">
                    Optional note
                  </span>
                  <textarea
                    value={reflectionNote}
                    onChange={(event) => setReflectionNote(event.target.value)}
                    rows={3}
                    className="beast-input mt-2 min-h-20 resize-y"
                    placeholder="Anything your Guidance Counselor should know before choosing the next step?"
                  />
                </label>
                {reflectionOutcome ? (
                  <div className="mt-4 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Guidance Counselor response
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white">
                      {reflectionOutcome.mentorResponse}
                    </p>
                  </div>
                ) : null}
                {completedActivity ? (
                  <div>
                    <button
                      type="button"
                      className="beast-button mt-4"
                      disabled={saving || (!reflectionOption && !reflectionNote.trim())}
                      onClick={saveCompletedReflection}
                      aria-describedby="reflection-save-help"
                    >
                      {saving ? "Saving..." : "Save reflection"}
                    </button>
                    <p id="reflection-save-help" className="mt-2 text-xs font-semibold text-[#7f8da3]">
                      Saves only your reflection note and session-feeling choice for future Guidance Counselor recommendations.
                    </p>
                  </div>
                ) : null}
              </DashboardCard>
            ) : null}
          </>
        ) : (
          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Let’s find the right lesson"
              title="This lesson is not available"
              description="Your Guidance Counselor could not open this lesson for this account. Go back to the Guidance Counselor conversation and choose the next step from there."
              action={<Link href="/dashboard/learning#mentor-session" className="beast-button">Back to Guidance Counselor</Link>}
            />
          </DashboardCard>
        )}
      </div>
    </main>
  );
}
