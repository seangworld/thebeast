"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
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

  const ready = useMemo(
    () =>
      form.preferredName.trim().length > 0 &&
      form.learnerType.trim().length > 0 &&
      form.gradeLevel.trim().length > 0 &&
      form.primaryGoal.trim().length > 0 &&
      form.courses.length > 0 &&
      form.pace.trim().length > 0 &&
      form.availability.trim().length > 0,
    [form]
  );

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_name, onboarding_complete")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!active) return;

      if (profile?.onboarding_complete) {
        router.replace("/dashboard/today");
        return;
      }

      setForm((current) => ({
        ...current,
        preferredName: profile?.preferred_name || current.preferredName,
      }));
      setLoading(false);
    }

    loadOnboardingState();

    return () => {
      active = false;
    };
  }, [router]);

  async function completeOnboarding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !userId || saving) return;

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const authUser = userData?.user;

      if (userError || !authUser || authUser.id !== userId) {
        throw new Error("Sign in again to finish onboarding.");
      }

      const cleanCourses = Array.from(
        new Set(form.courses.map((course) => course.trim()).filter(Boolean))
      );
      const primaryCourse = cleanCourses[0];
      const learnerFocus = `${primaryCourse} - ${form.gradeLevel}`;
      const existingProfiles = await supabase
        .from("learning_profiles")
        .select("id")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (existingProfiles.error) throw existingProfiles.error;

      const existingLearnerProfileId = existingProfiles.data?.[0]?.id as string | undefined;
      const learnerProfilePayload = {
        display_name: form.preferredName,
        learner_role: form.learnerType,
        focus: learnerFocus,
        learning_style: form.gradeLevel,
        preferred_pace: form.pace,
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

      if (learnerProfileResult.error) throw learnerProfileResult.error;

      const learnerProfileId = learnerProfileResult.data.id as string;
      const goalResult = await supabase
        .from("learning_goals")
        .insert({
          user_id: authUser.id,
          learner_profile_id: learnerProfileId,
          title: form.primaryGoal,
          category: primaryCourse,
          target: `${form.gradeLevel} goal with ${form.pace.toLowerCase()} pacing and ${form.availability.toLowerCase()} available.`,
          priority: "High",
          status: "Active",
          progress: 0,
        })
        .select("id")
        .single();

      if (goalResult.error) throw goalResult.error;

      const existingCourses = await supabase
        .from("learning_courses")
        .select("id, title")
        .eq("user_id", authUser.id);

      if (existingCourses.error) throw existingCourses.error;

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

          if (updateResult.error) throw updateResult.error;
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

        if (insertResult.error) throw insertResult.error;
        courseIds.push(insertResult.data.id);
      }

      const planResult = await supabase
        .from("learning_plans")
        .insert({
          user_id: authUser.id,
          learner_profile_id: learnerProfileId,
          goal_id: goalResult.data.id,
          title: `${form.primaryGoal} starter plan`,
          summary: `Start with ${primaryCourse.toLowerCase()} practice at a ${form.pace.toLowerCase()} pace. Protect ${form.availability.toLowerCase()} for the first session.`,
          weekly_session_target: getWeeklySessionTarget(form.availability),
        })
        .select("id, title")
        .single();

      if (planResult.error) throw planResult.error;

      const sessionResult = await supabase
        .from("learning_sessions")
        .insert({
          user_id: authUser.id,
          learner_profile_id: learnerProfileId,
          plan_id: planResult.data.id,
          title: `First ${primaryCourse} learning session`,
          course_title: planResult.data.title,
          scheduled_for: new Date().toISOString(),
          duration_minutes: getDurationMinutes(form.availability),
          status: "Scheduled",
        })
        .select("id")
        .single();

      if (sessionResult.error) throw sessionResult.error;

      const existingActivities = await supabase
        .from("learning_activities")
        .select("id")
        .eq("user_id", authUser.id)
        .limit(1);

      if (existingActivities.error) throw existingActivities.error;

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
          estimated_minutes: getDurationMinutes(form.availability),
          xp: 10 + index * 5,
          status: index === 0 ? "Ready" : "Queued",
          sort_order: index + 1,
        }));

        const activitiesResult = await supabase
          .from("learning_activities")
          .insert(activityRows);

        if (activitiesResult.error) throw activitiesResult.error;
      }

      const profileResult = await supabase
        .from("profiles")
        .update({
          preferred_name: form.preferredName,
          onboarding_complete: true,
        })
        .eq("id", authUser.id)
        .select("id")
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;
      if (!profileResult.data) {
        throw new Error("Unable to finish onboarding because the profile record was not found.");
      }

      router.replace("/dashboard/today");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to complete onboarding."
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
                  disabled={!ready || saving}
                  className="beast-button disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Creating Setup..." : "Finish Setup"}
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
