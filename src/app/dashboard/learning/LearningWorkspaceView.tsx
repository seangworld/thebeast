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
import { buildEducationPlanningReports } from "@/lib/education/planningReports";
import EducationPlanningReports from "./EducationPlanningReports";
import { CourseLifecycleCard } from "./CourseLifecycleCard";
import {
  canRemoveCourse,
  normalizeCourseLifecycleStatus,
  type CourseLifecycleStatus,
} from "@/lib/learning/courseLifecycle";
import { getWorkspaceRecordAction } from "@/lib/education/contextualActions";
import {
  canonicalDisplayFields,
  canonicalMissingActions,
  canonicalPrimaryValue,
  parseCanonicalFields,
} from "@/lib/canonicalKnowledgePresentation";
import {
  educationRecordState,
  isEducationFundingRecord,
  lifeWorkspaceIntroductions,
} from "@/lib/education/lifeWorkspaces";

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
  structuredFields?: Array<{ label: string; value: string }>;
  completionActions?: string[];
  kind?: "record" | "recommendation" | "goal" | "document";
  historicalAggregate?: boolean;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function loadWorkspaceItems(slug: LearningWorkspaceSlug, userId: string) {
  const supabase = createRouteClient();
  if (slug === "schools" || slug === "certifications" || slug === "scholarships") {
    const categories = slug === "schools"
      ? ["school", "degree", "coursework"]
      : slug === "certifications"
        ? ["certification", "license"]
        : ["budget", "constraint", "military", "employment", "other"];
    const [recordResult, pathResult, goalResult, documentResult] = await Promise.all([
      supabase.from("education_career_profile_items").select("id, owner_id, phase, category, label, value, source_type, source_reference, verification_status, occurred_on, updated_at, archived_at").eq("owner_id", userId).in("category", categories).is("archived_at", null).order("updated_at", { ascending: false }),
      supabase.from("education_career_paths").select("id, owner_id, title, path_type, status, comparison, rationale, source_url, source_name, source_effective_on, source_retrieved_at, limitations").eq("owner_id", userId).neq("status", "archived").order("updated_at", { ascending: false }),
      supabase.from("beast_goals").select("id, owner_id, title, category, status, target_date").eq("owner_id", userId).in("category", ["Education", "Career"]).neq("status", "Archived").order("updated_at", { ascending: false }),
      supabase.from("beast_documents").select("id, owner_id, title, category, status").eq("owner_id", userId).not("status", "in", '("Archived","Deleted")').order("updated_at", { ascending: false }),
    ]);
    const failure = [recordResult, pathResult, goalResult, documentResult].find((result) => result.error)?.error;
    if (failure) throw new Error(`Unable to load ${learningWorkspaceDefinitions[slug].title}: ${failure.message}`);
    const allRows = (recordResult.data || []) as Record<string, unknown>[];
    const rows = slug === "scholarships" ? allRows.filter(isEducationFundingRecord) : allRows;
    const structuredCategories = new Set(
      rows.filter((row) => canonicalDisplayFields(row.value).length > 0).map((row) => String(row.category))
    );
    const records = rows.filter((row) => {
      if (!structuredCategories.has(String(row.category))) return true;
      if (canonicalDisplayFields(row.value).length > 0) return true;
      return !(row.source_type === "conversation" && String(row.source_reference || "").startsWith("guidance:"));
    }).map((row): WorkspaceItem => {
      const structuredFields = canonicalDisplayFields(row.value);
      const fields = parseCanonicalFields(row.value);
      const entityType = String(fields.entityType || row.category || slug);
      return {
        id: String(row.id),
        ownerId: String(row.owner_id || userId),
        title: canonicalPrimaryValue(row.value, String(row.label || (slug === "schools" ? "School" : "Certification"))),
        detail: structuredFields.length
          ? `${String(row.phase || "present")} · ${String(row.verification_status || "member reported").replaceAll("_", " ")}`
          : String(row.value || "No additional information has been saved yet."),
        status: educationRecordState(slug, row),
        meta: row.occurred_on ? new Date(`${String(row.occurred_on)}T12:00:00`).toLocaleDateString() : undefined,
        structuredFields,
        completionActions: canonicalMissingActions(entityType, row.value),
        historicalAggregate: row.source_type === "conversation" && String(row.source_reference || "").startsWith("guidance:") && canonicalDisplayFields(row.value).length === 0 && /(?:,|;|\band\b|\bor\b)/i.test(String(row.value || "")),
        kind: "record",
      };
    });
    const relevantPath = (path: Record<string, unknown>) => {
      const value = `${String(path.path_type || "")} ${String(path.title || "")}`.toLowerCase();
      return slug === "schools" ? /school|college|university|program|degree/.test(value) : slug === "certifications" ? /certif|credential|license/.test(value) : /scholar|grant|fund|fafsa|benefit|tuition/.test(value);
    };
    const recommendations = ((pathResult.data || []) as Record<string, unknown>[]).filter(relevantPath).map((path): WorkspaceItem => ({
      id: `path-${String(path.id)}`,
      ownerId: String(path.owner_id || userId),
      title: String(path.title || "Suggested option"),
      detail: `${String(path.rationale || "Review why this option may or may not fit before acting.")}${path.limitations ? ` Limitation: ${String(path.limitations)}` : ""}`,
      status: "Recommended",
      meta: path.source_name ? `Source: ${String(path.source_name)}` : "Current details still need verification",
      href: path.source_url ? String(path.source_url) : undefined,
      structuredFields: Object.entries((path.comparison || {}) as Record<string, unknown>).flatMap(([label, value]) => typeof value === "string" && value.trim() ? [{ label: titleCase(label), value }] : []),
      kind: "recommendation",
    }));
    const goals = ((goalResult.data || []) as Record<string, unknown>[]).map((goal): WorkspaceItem => ({ id: `goal-${String(goal.id)}`, ownerId: String(goal.owner_id || userId), title: String(goal.title || "Education goal"), detail: goal.target_date ? `Target: ${new Date(`${String(goal.target_date)}T12:00:00`).toLocaleDateString()}` : "No target date is saved.", status: String(goal.status || "Saved"), href: "/dashboard/education/goals", kind: "goal" }));
    const documents = ((documentResult.data || []) as Record<string, unknown>[]).filter((document) => /education|school|transcript|certif|scholar|financial aid|fund/i.test(`${String(document.category || "")} ${String(document.title || "")}`)).map((document): WorkspaceItem => ({ id: `document-${String(document.id)}`, ownerId: String(document.owner_id || userId), title: String(document.title || "Education document"), detail: String(document.category || "Education document"), status: String(document.status || "Saved"), href: `/dashboard/education/documents?document=${encodeURIComponent(String(document.id))}`, kind: "document" }));
    return [...records, ...recommendations, ...goals, ...documents];
  }
  const table =
    slug === "learning-path" || slug === "educational-roadmap"
      ? "learning_plans"
      : slug === "courses"
        ? "learning_courses"
        : slug === "career-planning"
          ? "learning_goals"
        : slug === "achievements"
          ? "learning_achievements"
          : slug === "certificates"
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

function GoalContextCards({
  items,
  progressLabel,
}: {
  items: WorkspaceItem[];
  progressLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <p className="text-sm leading-6 text-[#aeb8c7]">
          No saved Education goals are available for this planning question
          yet. Start with the Guidance Counselor or review the shared BeastOS
          Goals workspace.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/dashboard/education/guidance-counselor"
            className="beast-button-primary inline-flex justify-center"
          >
            Talk with Guidance Counselor
          </Link>
          <Link
            href="/dashboard/education/goals"
            className="beast-button-secondary inline-flex justify-center"
          >
            Open Education goals
          </Link>
        </div>
      </div>
    );
  }

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
          <Link
            href="/dashboard/education/goals"
            className="beast-button-secondary mt-4 inline-flex w-full justify-center sm:w-fit"
          >
            Open goal
          </Link>
        </DashboardCard>
      ))}
    </div>
  );
}

function CanonicalEducationCards({
  items,
  emptyTitle,
  emptyDescription,
  reviewHref = "/dashboard/digital-staff/reconciliation?professionalId=beasteducation.guidance-counselor&returnTo=%2Fdashboard%2Feducation",
}: {
  items: WorkspaceItem[];
  emptyTitle: string;
  emptyDescription: string;
  reviewHref?: string;
}) {
  if (!items.length) {
    return (
      <LearningEmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={{ label: "Talk with your Guidance Counselor", href: "/dashboard/education/guidance-counselor" }}
      />
    );
  }
  const unresolved = items.some((item) => item.historicalAggregate);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-canonical-education-records>
      {unresolved ? <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.07] p-5" aria-label="Earlier education information to organize"><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Earlier information</p><h2 className="mt-2 text-xl font-black text-white">We found information from an earlier conversation that can be organized better.</h2><p className="mt-2 text-sm leading-6 text-[#d6e7f2]">Review what Beast found so schools, work, training, and preferences can be saved separately.</p><Link href={reviewHref} className="beast-button-primary mt-4 inline-flex min-h-11 items-center">Review &amp; organize</Link></div> : null}
      {items.map((item) => (
        <DashboardCard key={item.id} accent="learning" className="min-w-0">
          <span className="rounded-full border border-indigo-300/25 bg-indigo-300/10 px-2.5 py-1 text-xs font-black capitalize text-indigo-100">
            {item.status}
          </span>
          <h3 className="mt-4 break-words text-xl font-black text-white">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">{item.detail}</p>
          {item.structuredFields?.length ? (
            <dl className="mt-4 grid gap-3 text-sm">
              {item.structuredFields.map((field) => (
                <div key={`${field.label}-${field.value}`} className="min-w-0 rounded-xl border border-white/10 p-3">
                  <dt className="text-xs font-black uppercase tracking-wide text-indigo-200">{field.label}</dt>
                  <dd className="mt-1 break-words text-[#c7cfdb]">{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {item.href ? (
              <Link href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined} className="beast-button-secondary inline-flex min-h-11 items-center">
                {item.href.startsWith("http") ? "Open official source" : "Open related record"}
              </Link>
            ) : null}
            {(item.completionActions || []).map((action) => (
              <Link key={action} href={`/dashboard/education/guidance-counselor?prompt=${encodeURIComponent(`${action} for ${item.title}.`)}`} className="beast-button-secondary inline-flex min-h-11 items-center">
                {action}
              </Link>
            ))}
          </div>
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
          title="Careers worth learning more about"
          description="Compare what the work is like, what it requires, and how well it may fit you."
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

function LifeWorkspaceOrientation({ workspace }: { workspace: "schools" | "certifications" | "scholarships" }) {
  const copy = lifeWorkspaceIntroductions[workspace];
  return (
    <section aria-label="How to use this workspace" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["What is this?", copy.what], ["Why does this matter?", copy.why], ["What should I do here?", copy.doHere], ["What happens next?", copy.next]].map(([title, description]) => (
        <DashboardCard key={title} accent="learning" className="min-w-0">
          <h2 className="text-base font-black text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">{description}</p>
        </DashboardCard>
      ))}
    </section>
  );
}

function RelatedEducationRecords({ items }: { items: WorkspaceItem[] }) {
  const related = items.filter((item) => item.kind === "goal" || item.kind === "document");
  return (
    <section aria-label="Related education goals and documents">
      <SectionHeader eyebrow="Connected records" title="Related goals and documents" description="These are the shared BeastOS records that help explain this plan. They stay authoritative in Goals and Documents." />
      {related.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {related.map((item) => <Link key={item.id} href={item.href || "/dashboard/education"} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300"><span className="text-xs font-black uppercase tracking-wide text-indigo-200">{item.kind}</span><h3 className="mt-2 break-words font-black text-white">{item.title}</h3><p className="mt-1 text-sm text-[#aeb8c7]">{item.detail}</p></Link>)}
        </div>
      ) : <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm leading-6 text-[#aeb8c7]">No related Education goals or documents are available yet. Add them through the shared Education Goals and Education Documents pages when they become useful.</p>}
    </section>
  );
}

function CounselorWorkspaceHelp({ prompt }: { prompt: string }) {
  return <section className="rounded-2xl border border-indigo-300/25 bg-indigo-300/10 p-5 sm:p-6"><h2 className="text-xl font-black text-white">Ask your Guidance Counselor</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#c7cfdb]">Get a plain-language explanation of fit, concerns, tradeoffs, and the next fact to verify. Current facts can be researched from official sources when needed.</p><Link href={`/dashboard/education/guidance-counselor?prompt=${encodeURIComponent(prompt)}`} className="beast-button-primary mt-4 inline-flex min-h-11 items-center justify-center">Start this conversation</Link></section>;
}

function SchoolsWorkspace({ items }: { items: WorkspaceItem[] }) {
  const definition = planningWorkspaceDefinitions.schools;
  const records = items.filter((item) => item.kind === "record");
  const recommendations = items.filter((item) => item.kind === "recommendation");
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
      <LifeWorkspaceOrientation workspace="schools" />
      <section aria-label="My schools"><SectionHeader eyebrow="My Schools" title="Current and previous schools" description="Keep attendance, completion, degree or diploma, GPA when you choose to track it, credits, location, and related evidence together." /><div className="mt-5"><CanonicalEducationCards items={records} emptyTitle="No schools are saved yet" emptyDescription="Add your current school or a school you attended before. Your Guidance Counselor can help turn a conversation into a record for you to review and approve." /></div></section>
      <section aria-label="Suggested schools"><SectionHeader eyebrow="Suggested Schools" title="Options connected to your real plan" description="Suggestions should use your goals, education, credits, location, budget, format preferences, benefits, funding, and constraints—not a generic ranking." /><div className="mt-5"><CanonicalEducationCards items={recommendations} emptyTitle="No school suggestions are ready yet" emptyDescription="First clarify the program or outcome you want and the constraints that matter. Then ask your Guidance Counselor to research current options." /></div></section>
      <section aria-label="School comparison framework">
        <SectionHeader
          eyebrow="Compare"
          title="Compare schools using what matters to you"
          description="Look at programs, cost, location, support, and admissions before deciding what belongs on your list."
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
      <CounselorWorkspaceHelp prompt="Help me review my schools, explain which options may fit or may not fit, compare the tradeoffs, and identify the next fact I should verify." />
      <RelatedEducationRecords items={items} />
      <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-4 text-sm leading-6 text-cyan-50">
        {definition.verificationNote}
      </p>
    </div>
  );
}

function ScholarshipsWorkspace({ items }: { items: WorkspaceItem[] }) {
  const definition = planningWorkspaceDefinitions.scholarships;
  const records = items.filter((item) => item.kind === "record");
  const recommendations = items.filter((item) => item.kind === "recommendation");
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
      <LifeWorkspaceOrientation workspace="scholarships" />
      <section aria-label="Scholarship funding framework">
        <SectionHeader
          eyebrow="Fund"
          title="Ways to help pay for your education"
          description="Keep possible scholarships, applications you sent, and awards you received clearly separated."
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
      <section aria-label="Education funding lifecycle"><SectionHeader eyebrow="Your funding" title="Saved, applied, and awarded" description="Possible funding and submitted applications remain separate from confirmed awards." />{records.length ? <div className="mt-5 grid gap-5 lg:grid-cols-3">{["Saved", "Applied", "Awarded"].map((state) => <div key={state} className="min-w-0"><h3 className="mb-3 text-lg font-black text-white">{state}</h3><CanonicalEducationCards items={records.filter((item) => item.status === state)} emptyTitle={`Nothing ${state.toLowerCase()} yet`} emptyDescription={state === "Awarded" ? "Only confirmed awards belong here." : `Funding options will appear here when their status is ${state.toLowerCase()}.`} /></div>)}</div> : <LearningEmptyState title="No funding records are saved yet" description="Scholarships, grants, FAFSA, GI Bill or other veteran benefits, employer tuition assistance, and other education funding can be organized here." action={{ label: "Ask about funding options", href: "/dashboard/education/guidance-counselor?prompt=What%20education%20funding%20options%20should%20I%20consider%3F" }} />}</section>
      <section aria-label="Recommended education funding"><SectionHeader eyebrow="Recommendations" title="Funding options to verify" description="A recommendation is a lead to check, never a promise of eligibility or an award." /><div className="mt-5"><CanonicalEducationCards items={recommendations} emptyTitle="No funding recommendations are ready" emptyDescription="Ask your Guidance Counselor to research official sources after your program, school, timing, and relevant circumstances are clear." /></div></section>
      <section aria-label="Funding source types" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{["Scholarships", "Grants", "FAFSA", "GI Bill and veteran benefits", "Employer tuition assistance"].map((kind) => <div key={kind} className="min-w-0 rounded-2xl border border-green-300/15 bg-green-300/5 p-4"><h3 className="font-black text-white">{kind}</h3><p className="mt-2 text-sm leading-6 text-[#aeb8c7]">Track current terms, deadlines, required documents, and confirmation from the responsible official source.</p></div>)}</section>
      <CounselorWorkspaceHelp prompt="Help me find education funding for my plan using official sources. Separate possible eligibility from confirmed funding and show me the next deadline or fact to verify." />
      <RelatedEducationRecords items={items} />
      <p className="rounded-xl border border-green-300/20 bg-green-300/5 p-4 text-sm leading-6 text-green-50">
        {definition.verificationNote}
      </p>
    </div>
  );
}

function CertificationsWorkspace({ items }: { items: WorkspaceItem[] }) {
  const records = items.filter((item) => item.kind === "record");
  const recommendations = items.filter((item) => item.kind === "recommendation");
  return <div className="space-y-6">
    <LifeWorkspaceOrientation workspace="certifications" />
    <section aria-label="My certifications"><SectionHeader eyebrow="My Certifications" title="Active, expired, and planned credentials" description="Keep the issuing body, earned and expiration dates, renewal needs, continuing education, exam history, and evidence together when known." />
      {records.length ? <div className="mt-5 space-y-6">{["Active", "Expired", "Planned"].map((state) => { const stateItems = records.filter((item) => item.status === state); return stateItems.length ? <div key={state}><h3 className="mb-3 text-lg font-black text-white">{state}</h3><CanonicalEducationCards items={stateItems} emptyTitle="" emptyDescription="" /></div> : null; })}</div> : <LearningEmptyState title="No certifications are saved yet" description="Certifications you already have, credentials that expired, and certifications you plan to pursue all belong here." action={{ label: "Tell your Guidance Counselor", href: "/dashboard/education/guidance-counselor?prompt=Help%20me%20add%20a%20certification%20record." }} />}
    </section>
    <section aria-label="Recommended certifications"><SectionHeader eyebrow="Recommended" title="Credentials connected to your goals" description="Each recommendation should explain its purpose, prerequisites, requirements, cost, renewal rules, and why it may or may not fit." /><div className="mt-5"><CanonicalEducationCards items={recommendations} emptyTitle="No certification recommendation is ready" emptyDescription="A credential should be recommended only after its connection to your goal and current official requirements are checked." /></div></section>
    <section aria-label="Certification comparison" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Purpose", "What goal or role would this credential support?"], ["Requirements", "What prerequisites, exams, experience, and continuing education are required?"], ["Cost and time", "What are the current exam, preparation, renewal costs, and realistic timing?"], ["Official source", "What does the certification body currently say, and when was it checked?"]].map(([title, description]) => <DashboardCard key={title} accent="learning"><h3 className="font-black text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-[#aeb8c7]">{description}</p></DashboardCard>)}</section>
    <CounselorWorkspaceHelp prompt="Review my certifications and goals. Explain which credential may fit, which may not, the tradeoffs, and the official requirements I should verify next." />
    <RelatedEducationRecords items={items} />
    <p className="rounded-xl border border-indigo-300/20 bg-indigo-300/5 p-4 text-sm leading-6 text-indigo-50">Use the official certification body as the preferred source for prerequisites, exams, costs, renewal dates, and continuing-education rules. A recommendation does not guarantee eligibility, readiness, or a passing result.</p>
  </div>;
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

const educationPlanningDomainContent = {
  "educational-roadmap": {
    title: "One evolving sequence from direction to evidence",
    description:
      "The roadmap owns the long-term plan. Other workspaces contribute decisions and evidence without recreating it.",
    areas: [
      ["Direction", "The education or career outcome the roadmap is intended to support."],
      ["Sequence", "Prerequisites and decisions organized into now, next, and later."],
      ["Milestones", "Meaningful checkpoints that show when the plan should advance or change."],
      ["Timeline", "Known timing, dependencies, and uncertainty without invented dates."],
    ],
  },
  certifications: {
    title: "Credentials connected to a verified purpose",
    description:
      "Certification planning separates relevance, requirements, order, and progress from earned credential evidence.",
    areas: [
      ["Purpose", "Why the credential matters for the intended education or career outcome."],
      ["Requirements", "Official prerequisites, exams, experience, costs, and renewal rules."],
      ["Order", "Where the credential belongs relative to foundations, experience, and other credentials."],
      ["Progress", "Verified preparation and earned records without inferring readiness."],
    ],
  },
  skills: {
    title: "Capabilities the roadmap needs",
    description:
      "Skills planning identifies current strengths, gaps, and future capabilities. Teaching remains outside this generation.",
    areas: [
      ["Desired skills", "Capabilities connected to the member’s intended direction."],
      ["Current skills", "Strengths supported by saved work, education, or other evidence."],
      ["Skill gaps", "Missing capabilities that materially affect the roadmap."],
      ["Future skills", "Capabilities worth revisiting as goals and requirements change."],
    ],
  },
} as const;

function EducationPlanningDomainWorkspace({
  slug,
  items,
}: {
  slug: keyof typeof educationPlanningDomainContent;
  items: WorkspaceItem[];
}) {
  const content = educationPlanningDomainContent[slug];
  const definition = learningWorkspaceDefinitions[slug];

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader
          eyebrow={definition.eyebrow}
          title={content.title}
          description={content.description}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {content.areas.map(([title, description], index) => (
            <DashboardCard key={title} accent="learning" className="min-w-0">
              <span className="text-xs font-black text-indigo-200">
                0{index + 1}
              </span>
              <h2 className="mt-3 text-lg font-black text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">
                {description}
              </p>
            </DashboardCard>
          ))}
        </div>
      </section>

      {items.length === 0 ? (
        <LearningEmptyState
          title={definition.emptyTitle}
          description={definition.emptyDescription}
          action={definition.emptyAction}
        />
      ) : (
        <section aria-label={`${definition.title} saved records`}>
          <SectionHeader
            eyebrow="Authenticated records"
            title="Saved planning evidence"
            description="These records support this workspace without duplicating their full detail elsewhere."
          />
          {slug === "certifications" ? (
            <div className="mt-5">
              <CanonicalEducationCards
                items={items}
                emptyTitle={definition.emptyTitle}
                emptyDescription={definition.emptyDescription}
              />
            </div>
          ) : <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const action = getWorkspaceRecordAction(slug);
              return (
                <DashboardCard key={item.id} accent="learning" className="min-w-0">
                  {item.status ? (
                    <span className="rounded-full border border-indigo-300/25 bg-indigo-300/10 px-2.5 py-1 text-xs font-black text-indigo-100">
                      {item.status}
                    </span>
                  ) : null}
                  <h2 className="mt-4 break-words text-xl font-black text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 break-words text-sm leading-6 text-[#aeb8c7]">
                    {item.detail}
                  </p>
                  <Link
                    href={item.href || action.href}
                    className="beast-button-secondary mt-4 inline-flex w-full justify-center sm:w-fit"
                  >
                    {item.href ? "Open verified record" : action.label}
                  </Link>
                </DashboardCard>
              );
            })}
          </div>}
        </section>
      )}
    </div>
  );
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

async function loadEducationPlanningReports(userId: string) {
  const supabase = createRouteClient();
  const [profile, goals, plans, certificates] = await Promise.all([
    supabase.from("education_profiles").select("*").eq("owner_id", userId).maybeSingle(),
    supabase.from("learning_goals").select("*").eq("user_id", userId),
    supabase.from("learning_plans").select("*").eq("user_id", userId),
    supabase.from("learning_certificates").select("*").eq("user_id", userId),
  ]);
  const results = [profile, goals, plans, certificates];
  const failure = results.find((result) => result.error)?.error;
  if (failure) {
    throw new Error(
      `Unable to load BeastEducation planning reports: ${failure.message}`
    );
  }

  return buildEducationPlanningReports({
    profileRow: profile.data as Record<string, unknown> | null,
    goals: goals.data || [],
    plans: plans.data || [],
    certificates: certificates.data || [],
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
  const reports =
    slug === "reports" ? await loadEducationPlanningReports(user.id) : null;
  const items = timeline || reports ? [] : await loadWorkspaceItems(slug, user.id);

  return (
    <LearningWorkspaceShell
      title={definition.title}
      description={definition.description}
      eyebrow={definition.eyebrow}
    >
      {isPlanningWorkspaceSlug(slug) ? (
        <PlanningWorkspace slug={slug} items={items} />
      ) : slug === "certifications" ? (
        <CertificationsWorkspace items={items} />
      ) : slug === "educational-roadmap" ||
        slug === "skills" ? (
        <EducationPlanningDomainWorkspace slug={slug} items={items} />
      ) : reports ? (
        <EducationPlanningReports bundle={reports} />
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
            {items.map((item) => {
              if (slug === "courses" && item.lifecycleStatus && item.ownerId) {
                return (
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
                );
              }

              const contextualAction = getWorkspaceRecordAction(slug);
              return (
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
                      {item.meta ? (
                        <span className="text-xs font-bold text-[#7f8da3]">
                          {item.meta}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-4 break-words text-xl font-black text-white">
                      {item.title}
                    </h2>
                    <p className="mt-2 break-words text-sm leading-6 text-[#aeb8c7]">
                      {item.detail}
                    </p>
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
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300 transition-[width] duration-700 motion-reduce:transition-none"
                            style={{
                              width: `${Math.max(0, Math.min(100, item.progress))}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-xs font-bold text-[#8f9cad]">
                          {item.progress}% complete
                        </p>
                      </div>
                    ) : null}
                    <Link
                      href={item.href || contextualAction.href}
                      className="beast-button-secondary mt-auto inline-flex w-full justify-center sm:w-fit"
                    >
                      {item.href
                        ? slug === "certificates"
                          ? "Open certificate"
                          : "Open learning activity"
                        : contextualAction.label}
                    </Link>
                  </div>
                </DashboardCard>
              );
            })}
          </div>
        </section>
      )}
    </LearningWorkspaceShell>
  );
}
