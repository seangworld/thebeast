"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildOnboardingCompletionProfileUpdate,
  getOnboardingSaveErrorMessage,
  hasCompleteLearningOnboardingData,
  loadLearningOnboardingDataStatus,
  validateLearningOnboardingForm,
} from "@/lib/learning/onboardingCompletion";
import { createClient } from "@/lib/supabase/client";

type OnboardingForm = {
  preferredName: string;
  learnerType: string;
  gradeLevel: string;
  primaryGoal: string;
  courses: string[];
  courseDraft: string;
  pace: string;
  availability: string;
};

const emptyForm: OnboardingForm = {
  preferredName: "",
  learnerType: "",
  gradeLevel: "",
  primaryGoal: "",
  courses: [],
  courseDraft: "",
  pace: "",
  availability: "",
};

const learnerTypes = ["Student", "Adult learner", "Career learner", "Parent-supported learner"];
const gradeLevels = [
  "Elementary",
  "Middle school",
  "High school",
  "College",
  "Certification prep",
  "Professional",
  "Personal enrichment",
];
const paces = ["Light", "Steady", "Focused", "Intensive"];
const availabilityOptions = ["15 minutes", "30 minutes", "45 minutes", "60 minutes"];
const activityTypes = ["Lesson", "Practice", "Quiz", "AI Tutor Challenge", "Reflection"] as const;

function getWeeklySessionTarget(availability: string) {
  if (availability === "60 minutes") return 5;
  if (availability === "45 minutes") return 4;
  if (availability === "30 minutes") return 3;
  return 2;
}

function getDurationMinutes(availability: string) {
  const match = availability.match(/\d+/);
  return match ? Number(match[0]) : 15;
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#c7cfdb]">{label}</span>
      {children}
    </label>
  );
}

const fieldClasses =
  "mt-2 w-full rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-[#596579] focus:border-indigo-300/60 focus:bg-[#111827]";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingForm>(emptyForm);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const validation = useMemo(() => validateLearningOnboardingForm(form), [form]);
  const ready = validation.valid;

  const updateField = useCallback(
    (field: keyof Omit<OnboardingForm, "courses">, value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    []
  );

  function addCourse() {
    const title = form.courseDraft.trim();
    if (!title) return;

    setForm((current) => ({
      ...current,
      courses: Array.from(new Set([...current.courses, title])),
      courseDraft: "",
    }));
  }

  function updateCourse(index: number, value: string) {
    setForm((current) => ({
      ...current,
      courses: current.courses.map((course, courseIndex) =>
        courseIndex === index ? value : course
      ),
    }));
  }

  function removeCourse(index: number) {
    setForm((current) => ({
      ...current,
      courses: current.courses.filter((_, courseIndex) => courseIndex !== index),
    }));
  }

  useEffect(() => {
    let active = true;

    async function loadOnboardingState() {
      setLoading(true);
      setMessage("");

      let supabase: ReturnType<typeof createClient>;

      try {
        supabase = createClient();
      } catch (error) {
        if (!active) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to initialize onboarding."
        );
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const authUser = userData?.user;

      if (!active) return;

      if (userError || !authUser) {
        router.replace("/login");
        return;
      }

      setUserId(authUser.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        console.error("Unable to read onboarding completion profile.", {
          userId: authUser.id,
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
        });
        setMessage(
          getOnboardingSaveErrorMessage(
            "your account completion status lookup",
            profileError
          )
        );
      }

      if (profile?.onboarding_complete) {
        router.replace("/dashboard/today");
        return;
      }

      const { status, error: statusError } = await loadLearningOnboardingDataStatus(
        supabase,
        authUser.id
      );

      if (!active) return;

      if (statusError) {
        setMessage(
          getOnboardingSaveErrorMessage(
            "your saved onboarding status check",
            statusError
          )
        );
      }

      if (!statusError && hasCompleteLearningOnboardingData(status)) {
        const repairResult = await supabase
          .from("profiles")
          .update({ onboarding_complete: true })
          .eq("id", authUser.id)
          .select("id")
          .maybeSingle();

        if (!active) return;

        if (repairResult.error || !repairResult.data) {
          setMessage(
            repairResult.error
              ? getOnboardingSaveErrorMessage(
                  "your account completion status",
                  repairResult.error
                )
              : "Your learning setup data exists, but BeastLearning could not find your account profile to mark onboarding complete."
          );
        } else {
          router.replace("/dashboard/today");
          router.refresh();
          return;
        }
      }

      setLoading(false);
    }

    loadOnboardingState();

    return () => {
      active = false;
    };
  }, [router]);

  async function completeOnboarding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validated = validateLearningOnboardingForm(form);

    if (!validated.valid) {
      setMessage(validated.message);
      return;
    }

    if (!userId) {
      setMessage("Sign in again to finish onboarding.");
      return;
    }

    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const authUser = userData?.user;

      if (userError || !authUser || authUser.id !== userId) {
        throw new Error("Sign in again to finish onboarding.");
      }

      const onboarding = validated.value;
      const cleanCourses = onboarding.courses;
      const primaryCourse = cleanCourses[0];
      const learnerFocus = `${primaryCourse} - ${onboarding.gradeLevel}`;
      const existingProfiles = await supabase
        .from("learning_profiles")
        .select("id")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (existingProfiles.error) {
        throw new Error(
          getOnboardingSaveErrorMessage(
            "the existing learning profile lookup",
            existingProfiles.error
          )
        );
      }

      const existingLearnerProfileId = existingProfiles.data?.[0]?.id as string | undefined;
      const learnerProfilePayload = {
        display_name: onboarding.preferredName,
        learner_role: onboarding.learnerType,
        focus: learnerFocus,
        learning_style: onboarding.gradeLevel,
        preferred_pace: onboarding.pace,
      };

      const learnerProfileResult = existingLearnerProfileId
        ? await supabase
            .from("learning_profiles")
            .update(learnerProfilePayload)
            .eq("id", existingLearnerProfileId)
            .eq("user_id", authUser.id)
            .select("id")
            .single()
        : await supabase
            .from("learning_profiles")
            .insert({
              user_id: authUser.id,
              ...learnerProfilePayload,
            })
            .select("id")
            .single();

      if (learnerProfileResult.error) {
        throw new Error(
          getOnboardingSaveErrorMessage(
            "your learning profile",
            learnerProfileResult.error
          )
        );
      }

      const learnerProfileId = learnerProfileResult.data.id as string;
      const goalTitle = onboarding.primaryGoal;
      const existingGoalResult = await supabase
        .from("learning_goals")
        .select("id")
        .eq("user_id", authUser.id)
        .eq("learner_profile_id", learnerProfileId)
        .eq("title", goalTitle)
        .limit(1);

      if (existingGoalResult.error) {
        throw new Error(
          getOnboardingSaveErrorMessage(
            "the existing learning goal lookup",
            existingGoalResult.error
          )
        );
      }

      const goalPayload = {
        user_id: authUser.id,
        learner_profile_id: learnerProfileId,
        title: goalTitle,
        category: primaryCourse,
        target: `${onboarding.gradeLevel} goal with ${onboarding.pace.toLowerCase()} pacing and ${onboarding.availability.toLowerCase()} available.`,
        priority: "High",
        status: "Active",
        progress: 0,
      };
      const existingGoalId = existingGoalResult.data?.[0]?.id as string | undefined;
      const goalResult = existingGoalId
        ? await supabase
            .from("learning_goals")
            .update(goalPayload)
            .eq("id", existingGoalId)
            .eq("user_id", authUser.id)
            .select("id")
            .single()
        : await supabase
            .from("learning_goals")
            .insert(goalPayload)
            .select("id")
            .single();

      if (goalResult.error) {
        throw new Error(
          getOnboardingSaveErrorMessage("your learning goal", goalResult.error)
        );
      }

      const existingCourses = await supabase
        .from("learning_courses")
        .select("id, title")
        .eq("user_id", authUser.id);

      if (existingCourses.error) {
        throw new Error(
          getOnboardingSaveErrorMessage(
            "the existing course lookup",
            existingCourses.error
          )
        );
      }

      const existingCourseByTitle = new Map(
        (existingCourses.data || []).map((course) => [
          String(course.title).toLowerCase(),
          String(course.id),
        ])
      );
      const courseIds: string[] = [];

      for (const courseTitle of cleanCourses) {
        const existingCourseId = existingCourseByTitle.get(courseTitle.toLowerCase());

        if (existingCourseId) {
          const updateResult = await supabase
            .from("learning_courses")
            .update({
              learner_profile_id: learnerProfileId,
              subject: courseTitle,
              status: "Active",
            })
            .eq("id", existingCourseId)
            .eq("user_id", authUser.id)
            .select("id")
            .single();

          if (updateResult.error) {
            throw new Error(
              getOnboardingSaveErrorMessage(
                `the course "${courseTitle}"`,
                updateResult.error
              )
            );
          }

          courseIds.push(updateResult.data.id);
          continue;
        }

        const insertResult = await supabase
          .from("learning_courses")
          .insert({
            user_id: authUser.id,
            learner_profile_id: learnerProfileId,
            title: courseTitle,
            subject: courseTitle,
            status: "Active",
            progress: 0,
          })
          .select("id")
          .single();

        if (insertResult.error) {
          throw new Error(
            getOnboardingSaveErrorMessage(
              `the course "${courseTitle}"`,
              insertResult.error
            )
          );
        }

        courseIds.push(insertResult.data.id);
      }

      const planTitle = `${onboarding.primaryGoal} starter plan`;
      const existingPlanResult = await supabase
        .from("learning_plans")
        .select("id")
        .eq("user_id", authUser.id)
        .eq("learner_profile_id", learnerProfileId)
        .eq("title", planTitle)
        .limit(1);

      if (existingPlanResult.error) {
        throw new Error(
          getOnboardingSaveErrorMessage(
            "the existing learning plan lookup",
            existingPlanResult.error
          )
        );
      }

      const planPayload = {
        user_id: authUser.id,
        learner_profile_id: learnerProfileId,
        goal_id: goalResult.data.id,
        title: planTitle,
        summary: `Start with ${primaryCourse.toLowerCase()} practice at a ${onboarding.pace.toLowerCase()} pace. Protect ${onboarding.availability.toLowerCase()} for the first session.`,
        weekly_session_target: getWeeklySessionTarget(onboarding.availability),
      };
      const existingPlanId = existingPlanResult.data?.[0]?.id as string | undefined;
      const planResult = existingPlanId
        ? await supabase
            .from("learning_plans")
            .update(planPayload)
            .eq("id", existingPlanId)
            .eq("user_id", authUser.id)
            .select("id, title")
            .single()
        : await supabase
            .from("learning_plans")
            .insert(planPayload)
            .select("id, title")
            .single();

      if (planResult.error) {
        throw new Error(
          getOnboardingSaveErrorMessage("your starter learning plan", planResult.error)
        );
      }

      const sessionTitle = `First ${primaryCourse} learning session`;
      const existingSessionResult = await supabase
        .from("learning_sessions")
        .select("id")
        .eq("user_id", authUser.id)
        .eq("learner_profile_id", learnerProfileId)
        .eq("plan_id", planResult.data.id)
        .eq("title", sessionTitle)
        .limit(1);

      if (existingSessionResult.error) {
        throw new Error(
          getOnboardingSaveErrorMessage(
            "the existing starter session lookup",
            existingSessionResult.error
          )
        );
      }

      const sessionPayload = {
        user_id: authUser.id,
        learner_profile_id: learnerProfileId,
        plan_id: planResult.data.id,
        title: sessionTitle,
        course_title: planResult.data.title,
        scheduled_for: new Date().toISOString(),
        duration_minutes: getDurationMinutes(onboarding.availability),
        status: "Scheduled",
      };
      const existingSessionId = existingSessionResult.data?.[0]?.id as string | undefined;
      const sessionResult = existingSessionId
        ? await supabase
            .from("learning_sessions")
            .update(sessionPayload)
            .eq("id", existingSessionId)
            .eq("user_id", authUser.id)
            .select("id")
            .single()
        : await supabase
            .from("learning_sessions")
            .insert(sessionPayload)
            .select("id")
            .single();

      if (sessionResult.error) {
        throw new Error(
          getOnboardingSaveErrorMessage("your first learning session", sessionResult.error)
        );
      }

      const existingActivities = await supabase
        .from("learning_activities")
        .select("id")
        .eq("user_id", authUser.id)
        .limit(1);

      if (existingActivities.error) {
        throw new Error(
          getOnboardingSaveErrorMessage(
            "the existing activity lookup",
            existingActivities.error
          )
        );
      }

      if ((existingActivities.data || []).length === 0) {
        const activityRows = activityTypes.map((activityType, index) => ({
          user_id: authUser.id,
          learner_profile_id: learnerProfileId,
          course_id: courseIds[index % Math.max(courseIds.length, 1)] || null,
          plan_id: planResult.data.id,
          session_id: index === 0 ? sessionResult.data.id : null,
          activity_type: activityType,
          title:
            index === 0
              ? `Start ${primaryCourse}`
              : `${activityType}: ${cleanCourses[index % cleanCourses.length]}`,
          difficulty: index < 2 ? "Beginner" : "Adaptive",
          estimated_minutes: getDurationMinutes(onboarding.availability),
          xp: 10 + index * 5,
          status: index === 0 ? "Ready" : "Queued",
          sort_order: index + 1,
        }));

        const activitiesResult = await supabase
          .from("learning_activities")
          .insert(activityRows);

        if (activitiesResult.error) {
          throw new Error(
            getOnboardingSaveErrorMessage(
              "your first learning activities",
              activitiesResult.error
            )
          );
        }
      }

      const profileResult = await supabase
        .from("profiles")
        .update(buildOnboardingCompletionProfileUpdate(onboarding))
        .eq("id", authUser.id)
        .select("id")
        .maybeSingle();

      if (profileResult.error) {
        throw new Error(
          getOnboardingSaveErrorMessage(
            "your account completion status",
            profileResult.error
          )
        );
      }
      if (!profileResult.data) {
        throw new Error(
          "Could not save your account completion status: your account profile was not found."
        );
      }

      router.replace("/dashboard/today");
      router.refresh();
    } catch (error) {
      console.error("Unable to complete BeastLearning onboarding.", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      setMessage(
        error instanceof Error
          ? error.message
          : getOnboardingSaveErrorMessage("onboarding", error)
      );
      setSaving(false);
    }
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="space-y-4">
            <ModuleBadge module="learning" label="First setup" />
            <h1 className="beast-title">Set Up BeastLearning</h1>
            <p className="beast-subtitle">
              Create your learning profile, starter goal, and first study session.
            </p>
          </div>
        </section>

        {message ? (
          <DashboardCard accent="red">
            <p className="text-sm font-semibold text-red-100">{message}</p>
          </DashboardCard>
        ) : null}

        <DashboardCard accent="learning">
          <SectionHeader
            eyebrow="Onboarding"
            title="Your first learning setup"
            description="These answers create account-owned Learning records and unlock Today."
          />

          {loading ? (
            <div className="mt-6 grid animate-pulse gap-4 md:grid-cols-2">
              <div className="h-12 rounded-xl bg-[#2a3242]" />
              <div className="h-12 rounded-xl bg-[#2a3242]" />
              <div className="h-12 rounded-xl bg-[#2a3242]" />
              <div className="h-12 rounded-xl bg-[#2a3242]" />
            </div>
          ) : (
            <form className="mt-6 grid gap-5" onSubmit={completeOnboarding}>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel label="Preferred name">
                  <input
                    className={fieldClasses}
                    value={form.preferredName}
                    onChange={(event) =>
                      updateField("preferredName", event.target.value)
                    }
                    placeholder="What should BeastOS call you?"
                  />
                </FieldLabel>

                <FieldLabel label="Learner type">
                  <select
                    className={fieldClasses}
                    value={form.learnerType}
                    onChange={(event) =>
                      updateField("learnerType", event.target.value)
                    }
                  >
                    <option value="">Select learner type</option>
                    {learnerTypes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Grade / level">
                  <select
                    className={fieldClasses}
                    value={form.gradeLevel}
                    onChange={(event) =>
                      updateField("gradeLevel", event.target.value)
                    }
                  >
                    <option value="">Select level</option>
                    {gradeLevels.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Pace">
                  <select
                    className={fieldClasses}
                    value={form.pace}
                    onChange={(event) => updateField("pace", event.target.value)}
                  >
                    <option value="">Select pace</option>
                    {paces.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Availability">
                  <select
                    className={fieldClasses}
                    value={form.availability}
                    onChange={(event) =>
                      updateField("availability", event.target.value)
                    }
                  >
                    <option value="">Select daily availability</option>
                    {availabilityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
              </div>

              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <FieldLabel label="Courses">
                    <input
                      className={fieldClasses}
                      value={form.courseDraft}
                      onChange={(event) =>
                        updateField("courseDraft", event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCourse();
                        }
                      }}
                      placeholder="Add a course, subject, or certification"
                    />
                  </FieldLabel>
                  <button
                    type="button"
                    onClick={addCourse}
                    className="beast-button-secondary h-fit"
                  >
                    Add Course
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  {form.courses.length > 0 ? (
                    form.courses.map((course, index) => (
                      <div
                        key={`${course}-${index}`}
                        className="flex flex-col gap-2 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3 md:flex-row md:items-center"
                      >
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-[#2a3242] bg-[#111827] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-indigo-300/60"
                          value={course}
                          onChange={(event) =>
                            updateCourse(index, event.target.value)
                          }
                          aria-label={`Course ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeCourse(index)}
                          className="rounded-lg border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm font-bold text-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3 text-sm font-semibold text-[#9aa7b8]">
                      Add at least one course so BeastLearning can create your first path.
                    </p>
                  )}
                </div>
              </div>

              <FieldLabel label="Primary learning goal">
                <input
                  className={fieldClasses}
                  value={form.primaryGoal}
                  onChange={(event) =>
                    updateField("primaryGoal", event.target.value)
                  }
                  placeholder="Example: understand fractions, pass a certification, write better essays"
                />
              </FieldLabel>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="beast-button disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Creating Setup..." : ready ? "Finish Setup" : "Review Missing Fields"}
                </button>
                <span className="text-sm font-semibold text-[#9aa7b8]">
                  Today unlocks after setup is saved.
                </span>
              </div>
            </form>
          )}
        </DashboardCard>
      </div>
    </main>
  );
}
