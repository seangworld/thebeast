import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { createRouteClient } from "@/lib/supabase/server";
import {
  isLearningWorkspaceSlug,
  learningWorkspaceDefinitions,
  type LearningWorkspaceSlug,
} from "@/lib/learning/workspaces";
import {
  LearningEmptyState,
  LearningWorkspaceShell,
} from "./LearningWorkspaceShell";
import {
  buildLearningChronology,
  type LearningChronologyEvent,
} from "@/lib/learning/learningChronology";
import { buildLearningReports } from "@/lib/learning/learningReports";
import { LearningReports } from "./LearningReports";

type WorkspaceItem = {
  id: string;
  title: string;
  detail: string;
  status?: string;
  progress?: number;
  meta?: string;
  href?: string;
};

async function loadWorkspaceItems(slug: LearningWorkspaceSlug, userId: string) {
  const supabase = createRouteClient();
  const table =
    slug === "learning-path" || slug === "educational-roadmap"
      ? "learning_plans"
      : slug === "courses"
        ? "learning_courses"
        : slug === "career-planning" || slug === "schools" || slug === "scholarships"
          ? "learning_goals"
        : slug === "achievements"
          ? "learning_achievements"
          : slug === "certificates" || slug === "certifications"
            ? "learning_certificates"
            : slug === "skills"
              ? "learning_mastery"
              : slug === "tutor"
                ? "learning_sessions"
            : "learning_activities";
  const result = await supabase.from(table).select("*").eq("user_id", userId);
  if (result.error) throw new Error(`Unable to load ${learningWorkspaceDefinitions[slug].title}: ${result.error.message}`);

  let rows = (result.data || []) as Record<string, unknown>[];
  if (slug === "reviews") {
    rows = rows.filter(({ session_state }) => session_state === "review_due");
  }
    if (slug === "history" || slug === "lesson-history") {
    rows = rows
      .filter(({ status }) => status === "Completed")
      .sort((a, b) => String(b.completed_at || b.created_at || "").localeCompare(String(a.completed_at || a.created_at || "")));
  }

  return rows.map((row): WorkspaceItem => {
    const id = String(row.id);
    if (slug === "learning-path" || slug === "educational-roadmap") {
      return {
        id,
        title: String(row.title || "Learning path"),
        detail: String(row.summary || "A focused path connected to your learning goal."),
        status: "Active roadmap",
        meta: `${Number(row.weekly_session_target || 0)} weekly session target`,
      };
    }
    if (slug === "courses") {
      return {
        id,
        title: String(row.title || "Learning course"),
        detail: String(row.subject || "Learning"),
        status: String(row.status || "Planned"),
        progress: Number(row.progress || 0),
      };
    }
    if (slug === "achievements") {
      return {
        id,
        title: String(row.title || "Learning achievement"),
        detail: String(row.detail || "A meaningful learning milestone."),
        status: row.earned ? "Earned" : "In progress",
        meta: row.earned_at ? new Date(String(row.earned_at)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
      };
    }
    if (slug === "certificates" || slug === "certifications") {
      return {
        id,
        title: String(row.path_name || "Learning certificate"),
        detail: `Certificate ${String(row.certificate_id || id)}`,
        status: "Earned",
        meta: String(row.completion_date || ""),
        href: `/api/learning/certificates/${id}`,
      };
    }
    return {
      id,
      title: String(row.title || "Learning activity"),
      detail:
        slug === "reviews"
          ? String(row.session_next_recommendation || "Review this concept with your Mentor.")
          : String(row.session_recap || row.activity_type || "Learning activity"),
      status: slug === "reviews" ? "Review due" : String(row.status || "Ready"),
      meta: `${String(row.difficulty || "Adaptive")} · ${Number(row.estimated_minutes || 0)} min`,
      href: `/dashboard/education/activities/${id}`,
    };
  });
}

async function loadLearningChronology(userId: string) {
  const supabase = createRouteClient();
  const [
    history,
    activities,
    sessions,
    courses,
    achievements,
    mastery,
    certificates,
    goals,
  ] = await Promise.all([
    supabase.from("learning_history").select("*").eq("user_id", userId),
    supabase.from("learning_activities").select("*").eq("user_id", userId),
    supabase.from("learning_sessions").select("*").eq("user_id", userId),
    supabase.from("learning_courses").select("*").eq("user_id", userId),
    supabase.from("learning_achievements").select("*").eq("user_id", userId),
    supabase.from("learning_mastery").select("*").eq("user_id", userId),
    supabase.from("learning_certificates").select("*").eq("user_id", userId),
    supabase.from("learning_goals").select("*").eq("user_id", userId),
  ]);

  const results = [
    history,
    activities,
    sessions,
    courses,
    achievements,
    mastery,
    certificates,
    goals,
  ];
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw new Error(`Unable to load Learning Timeline: ${failure.message}`);

  return buildLearningChronology({
    history: history.data || [],
    activities: activities.data || [],
    sessions: sessions.data || [],
    courses: courses.data || [],
    achievements: achievements.data || [],
    mastery: mastery.data || [],
    certificates: certificates.data || [],
    goals: goals.data || [],
  });
}

async function loadLearningReports(userId: string) {
  const supabase = createRouteClient();
  const [history, activities, sessions, courses, achievements, mastery, certificates, goals] =
    await Promise.all([
      supabase.from("learning_history").select("*").eq("user_id", userId),
      supabase.from("learning_activities").select("*").eq("user_id", userId),
      supabase.from("learning_sessions").select("*").eq("user_id", userId),
      supabase.from("learning_courses").select("*").eq("user_id", userId),
      supabase.from("learning_achievements").select("*").eq("user_id", userId),
      supabase.from("learning_mastery").select("*").eq("user_id", userId),
      supabase.from("learning_certificates").select("*").eq("user_id", userId),
      supabase.from("learning_goals").select("*").eq("user_id", userId),
    ]);
  const results = [history, activities, sessions, courses, achievements, mastery, certificates, goals];
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw new Error(`Unable to load Learning Reports: ${failure.message}`);

  return buildLearningReports({
    history: history.data || [],
    activities: activities.data || [],
    sessions: sessions.data || [],
    courses: courses.data || [],
    achievements: achievements.data || [],
    mastery: mastery.data || [],
    certificates: certificates.data || [],
    goals: goals.data || [],
  });
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function LearningTimeline({ events }: { events: LearningChronologyEvent[] }) {
  return (
    <section aria-label="Learning Timeline">
      <SectionHeader
        eyebrow="Chronological record"
        title="Learning Timeline"
        description={`${events.length} saved ${events.length === 1 ? "event" : "events"}, newest first.`}
      />
      <ol
        className="relative mt-6 space-y-0 before:absolute before:bottom-3 before:left-[0.6875rem] before:top-3 before:w-px before:bg-indigo-300/20 sm:before:left-[0.8125rem]"
        aria-label="Chronological learning history"
      >
        {events.map((event) => (
          <li key={event.id} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 pb-6 sm:grid-cols-[1.75rem_minmax(0,1fr)] sm:gap-4">
            <span
              className="relative z-10 mt-2 h-3 w-3 justify-self-center rounded-full border-2 border-[#111722] bg-indigo-300 shadow-[0_0_0_3px_rgba(165,180,252,0.14)]"
              aria-hidden="true"
            />
            <DashboardCard
              accent="learning"
              className="min-w-0 transition duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_18px_48px_rgba(0,0,0,0.2)] motion-reduce:transition-none"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-200">
                    {event.label}
                  </p>
                  <h2 className="mt-2 break-words text-lg font-black text-white">
                    {event.title}
                  </h2>
                  <p className="mt-2 break-words text-sm leading-6 text-[#aeb8c7]">
                    {event.detail}
                  </p>
                  {event.href ? (
                    <Link href={event.href} className="mt-3 inline-flex text-sm font-black text-indigo-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300">
                      View related learning
                    </Link>
                  ) : null}
                </div>
                <time
                  dateTime={event.occurredAt}
                  className="shrink-0 text-xs font-bold text-[#8f9cad]"
                >
                  {formatTimelineDate(event.occurredAt)}
                </time>
              </div>
            </DashboardCard>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function LearningWorkspaceView({ slug }: { slug: string }) {
  if (!isLearningWorkspaceSlug(slug)) notFound();
  const supabase = createRouteClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const definition = learningWorkspaceDefinitions[slug];
  const timeline = slug === "history" || slug === "lesson-history"
    ? await loadLearningChronology(user.id)
    : null;
  const reports = slug === "reports" ? await loadLearningReports(user.id) : null;
  const items = timeline || reports ? [] : await loadWorkspaceItems(slug, user.id);

  return (
    <LearningWorkspaceShell
      title={definition.title}
      description={definition.description}
      eyebrow={definition.eyebrow}
    >
      {reports ? (
        <LearningReports bundle={reports} />
      ) : timeline && timeline.length > 0 ? (
        <LearningTimeline events={timeline} />
      ) : items.length === 0 ? (
        <LearningEmptyState
          title={definition.emptyTitle}
          description={definition.emptyDescription}
          action={definition.emptyAction}
        />
      ) : (
        <section aria-label={`${definition.title} records`}>
          <SectionHeader
            eyebrow={definition.eyebrow}
            title={`${items.length} ${items.length === 1 ? "record" : "records"}`}
            description="This workspace uses your authenticated BeastEducation records."
          />
          <div className="mt-6 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <DashboardCard
                key={item.id}
                accent="learning"
                className="min-w-0 transition duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_18px_48px_rgba(0,0,0,0.2)] motion-reduce:transition-none"
              >
                <div className="flex h-full min-h-[190px] flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {item.status ? (
                      <span className="rounded-full border border-indigo-300/30 bg-indigo-300/10 px-2.5 py-1 text-xs font-black text-indigo-100">
                        {item.status}
                      </span>
                    ) : null}
                    {item.meta ? <span className="text-xs font-bold text-[#7f8da3]">{item.meta}</span> : null}
                  </div>
                  <h2 className="mt-4 break-words text-xl font-black text-white">{item.title}</h2>
                  <p className="mt-2 break-words text-sm leading-6 text-[#aeb8c7]">{item.detail}</p>
                  {typeof item.progress === "number" ? (
                    <div className="mt-4">
                      <div
                        className="h-2.5 overflow-hidden rounded-full bg-[#0b1018]"
                        role="progressbar"
                        aria-label={`${item.title} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.max(0, Math.min(100, item.progress))}
                      >
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }} />
                      </div>
                      <p className="mt-2 text-xs font-bold text-[#8f9cad]">{item.progress}% complete</p>
                    </div>
                  ) : null}
                  {item.href ? (
                    <Link href={item.href} className="beast-button-secondary mt-auto inline-flex w-full justify-center sm:w-fit">
                      {slug === "certificates" || slug === "certifications" ? "Open certificate" : "Open learning activity"}
                    </Link>
                  ) : null}
                </div>
              </DashboardCard>
            ))}
          </div>
        </section>
      )}
    </LearningWorkspaceShell>
  );
}
