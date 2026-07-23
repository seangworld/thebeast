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
    slug === "learning-path"
      ? "learning_plans"
      : slug === "courses"
        ? "learning_courses"
        : slug === "achievements"
          ? "learning_achievements"
          : slug === "certificates"
            ? "learning_certificates"
            : "learning_activities";
  const result = await supabase.from(table).select("*").eq("user_id", userId);
  if (result.error) throw new Error(`Unable to load ${learningWorkspaceDefinitions[slug].title}: ${result.error.message}`);

  let rows = (result.data || []) as Record<string, unknown>[];
  if (slug === "reviews") {
    rows = rows.filter(({ session_state }) => session_state === "review_due");
  }
  if (slug === "history") {
    rows = rows
      .filter(({ status }) => status === "Completed")
      .sort((a, b) => String(b.completed_at || b.created_at || "").localeCompare(String(a.completed_at || a.created_at || "")));
  }

  return rows.map((row): WorkspaceItem => {
    const id = String(row.id);
    if (slug === "learning-path") {
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
    if (slug === "certificates") {
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

export default async function LearningWorkspaceView({ slug }: { slug: string }) {
  if (!isLearningWorkspaceSlug(slug)) notFound();
  const supabase = createRouteClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const definition = learningWorkspaceDefinitions[slug];
  const items = await loadWorkspaceItems(slug, user.id);

  return (
    <LearningWorkspaceShell
      title={definition.title}
      description={definition.description}
      eyebrow={definition.eyebrow}
    >
      {items.length === 0 ? (
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
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <DashboardCard key={item.id} accent="learning" className="min-w-0">
                <div className="flex h-full min-h-[180px] flex-col">
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
                      <div className="h-2 overflow-hidden rounded-full bg-[#0b1018]">
                        <div className="h-full rounded-full bg-indigo-300" style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }} />
                      </div>
                      <p className="mt-2 text-xs font-bold text-[#8f9cad]">{item.progress}% complete</p>
                    </div>
                  ) : null}
                  {item.href ? (
                    <Link href={item.href} className="beast-button-secondary mt-auto inline-flex w-fit pt-3">
                      {slug === "certificates" ? "Open certificate" : "Open learning activity"}
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
