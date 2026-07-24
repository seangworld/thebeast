import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { createRouteClient } from "@/lib/supabase/server";
import {
  isLearningWorkspaceSlug,
  isPlanningWorkspaceSlug,
  learningWorkspaceDefinitions,
  planningWorkspaceDefinitions,
  type PlanningWorkspaceSlug,
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
import { CourseLifecycleCard } from "./CourseLifecycleCard";
import {
  canRemoveCourse,
  normalizeCourseLifecycleStatus,
  type CourseLifecycleStatus,
} from "@/lib/learning/courseLifecycle";

type WorkspaceItem = {
  id: string;
  title: string;
  detail: string;
  status?: string;
  progress?: number;
  meta?: string;
  href?: string;
  ownerId?: string;
  lifecycleStatus?: CourseLifecycleStatus;
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
  if (slug === "courses") {
    rows = rows.filter((row) => {
      const lifecycle = String(row.lifecycle_state || row.status || "").toLowerCase();
      return lifecycle !== "archived" && lifecycle !== "removed";
    });
  }
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
    if (isPlanningWorkspaceSlug(slug)) {
      return {
        id,
        title: String(row.title || "Saved education goal"),
        detail: String(
          row.target ||
            "No outcome detail has been saved for this goal yet."
        ),
        status: String(row.status || "Saved"),
        progress:
          typeof row.progress === "number" ? Number(row.progress) : undefined,
        meta: row.category ? String(row.category) : undefined,
      };
    }
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
      const lifecycleStatus = normalizeCourseLifecycleStatus(
        row.status,
        row.lifecycle_state
      );
      return {
        id,
        title: String(row.title || "Learning course"),
        detail: String(row.subject || "Learning"),
        status: lifecycleStatus,
        lifecycleStatus,
        ownerId: String(row.user_id || userId),
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

function GoalContextCards({
  items,
  progressLabel,
}: {
  items: WorkspaceItem[];
  progressLabel: string;
}) {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <DashboardCard key={item.id} accent="learning" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {item.status ? (
              <span className="rounded-full border border-indigo-300/30 bg-indigo-300/10 px-2.5 py-1 text-xs font-black text-indigo-100">
                {item.status}
              </span>
            ) : null}
            {item.meta ? (
              <span className="text-xs font-bold text-[#8f9cad]">
                {item.meta}
              </span>
            ) : null}
          </div>
          <h3 className="mt-4 text-lg font-black text-white">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">{item.detail}</p>
          {typeof item.progress === "number" ? (
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-indigo-200">
              {progressLabel}: {item.progress}%
            </p>
          ) : null}
        </DashboardCard>
      ))}
    </div>
  );
}

function CareerPlanningWorkspace({ items }: { items: WorkspaceItem[] }) {
  const definition = planningWorkspaceDefinitions["career-planning"];
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-300/10 to-transparent p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-200">
          Career question
        </p>
        <h2 className="mt-2 text-3xl font-black text-white">
          {definition.guidingQuestion}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c7cfdb]">
          Explore identity, role fit, and progression before choosing education
          or training.
        </p>
      </section>
      <section aria-label="Career planning framework">
        <SectionHeader
          eyebrow="Explore"
          title="From possibilities to credible next roles"
          description="Use these lenses to investigate a direction without treating it as a predetermined answer."
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {definition.focusAreas.map((area, index) => (
            <DashboardCard key={area.title} accent="purple">
              <span className="text-xs font-black text-violet-200">
                0{index + 1}
              </span>
              <h3 className="mt-3 text-lg font-black text-white">{area.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">
                {area.description}
              </p>
            </DashboardCard>
          ))}
        </div>
      </section>
      <section aria-label="Saved career goal context">
        <SectionHeader
          eyebrow="Your context"
          title={definition.contextTitle}
          description={definition.contextDescription}
        />
        <GoalContextCards items={items} progressLabel="Goal progress" />
      </section>
      <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-[#aeb8c7]">
        {definition.verificationNote}
      </p>
    </div>
  );
}

function SchoolsWorkspace({ items }: { items: WorkspaceItem[] }) {
  const definition = planningWorkspaceDefinitions.schools;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-300/25 bg-gradient-to-r from-cyan-300/10 to-transparent p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
          School question
        </p>
        <h2 className="mt-2 text-3xl font-black text-white">
          {definition.guidingQuestion}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c7cfdb]">
          Compare places and programs only after the outcome and decision
          criteria are clear.
        </p>
      </section>
      <section aria-label="School comparison framework">
        <SectionHeader
          eyebrow="Compare"
          title="A school earns consideration by meeting your criteria"
          description="No institution appears as a recommendation until a real candidate and current source evidence are available."
        />
        <ol className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#111827]">
          {definition.focusAreas.map((area, index) => (
            <li key={area.title} className="grid gap-3 p-4 sm:grid-cols-[3rem_1fr] sm:p-5">
              <span className="text-2xl font-black text-cyan-200">
                {index + 1}
              </span>
              <div>
                <h3 className="font-black text-white">{area.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#aeb8c7]">
                  {area.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section aria-label="Saved school planning context">
        <SectionHeader
          eyebrow="Search criteria"
          title={definition.contextTitle}
          description={definition.contextDescription}
        />
        <GoalContextCards items={items} progressLabel="Goal progress" />
      </section>
      <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-4 text-sm leading-6 text-cyan-50">
        {definition.verificationNote}
      </p>
    </div>
  );
}

function ScholarshipsWorkspace({ items }: { items: WorkspaceItem[] }) {
  const definition = planningWorkspaceDefinitions.scholarships;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-green-300/25 bg-gradient-to-br from-green-300/10 to-transparent p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-green-200">
          Funding question
        </p>
        <h2 className="mt-2 text-3xl font-black text-white">
          {definition.guidingQuestion}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c7cfdb]">
          Build a verified funding plan around real costs, confirmed eligibility,
          and deadlines.
        </p>
      </section>
      <section aria-label="Scholarship funding framework">
        <SectionHeader
          eyebrow="Fund"
          title="A funding pipeline, not a list of promises"
          description="Keep possible opportunities, submitted applications, and confirmed awards clearly separated."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {definition.focusAreas.map((area) => (
            <DashboardCard key={area.title} accent="green">
              <h3 className="text-lg font-black text-white">{area.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">
                {area.description}
              </p>
            </DashboardCard>
          ))}
        </div>
      </section>
      <section aria-label="Saved scholarship planning context">
        <SectionHeader
          eyebrow="Funding purpose"
          title={definition.contextTitle}
          description={definition.contextDescription}
        />
        <GoalContextCards items={items} progressLabel="Goal progress" />
      </section>
      <p className="rounded-xl border border-green-300/20 bg-green-300/5 p-4 text-sm leading-6 text-green-50">
        {definition.verificationNote}
      </p>
    </div>
  );
}

function PlanningWorkspace({
  slug,
  items,
}: {
  slug: PlanningWorkspaceSlug;
  items: WorkspaceItem[];
}) {
  if (slug === "career-planning") {
    return <CareerPlanningWorkspace items={items} />;
  }
  if (slug === "schools") return <SchoolsWorkspace items={items} />;
  return <ScholarshipsWorkspace items={items} />;
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
  const profileResult =
    slug === "courses"
      ? await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()
      : null;
  const actorRole = String(profileResult?.data?.role || "user");
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
      {isPlanningWorkspaceSlug(slug) && items.length > 0 ? (
        <PlanningWorkspace slug={slug} items={items} />
      ) : reports ? (
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
            {items.map((item) =>
              slug === "courses" && item.lifecycleStatus && item.ownerId ? (
                <CourseLifecycleCard
                  key={item.id}
                  courseId={item.id}
                  courseTitle={item.title}
                  detail={item.detail}
                  progress={item.progress || 0}
                  status={item.lifecycleStatus}
                  canRemove={canRemoveCourse({
                    actorId: user.id,
                    courseOwnerId: item.ownerId,
                    actorRole,
                  })}
                />
              ) : (
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
              )
            )}
          </div>
        </section>
      )}
    </LearningWorkspaceShell>
  );
}
