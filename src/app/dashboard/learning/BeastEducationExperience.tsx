import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { BEAST_LEARNING_VERSION } from "@/lib/appVersion";
import { guidanceDiscoveryProfileFromRow } from "@/lib/education/discoveryConversation";
import { buildGuidanceWorkflowRecommendation } from "@/lib/education/guidanceWorkflow";
import { buildLifelongEducationRoadmap } from "@/lib/education/lifelongRoadmap";
import { getProfileDisplayName } from "@/lib/profile";
import { createRouteClient } from "@/lib/supabase/server";
import GuidanceCounselorConversation from "./GuidanceCounselorConversation";
import EducationCareerWorkspace from "./EducationCareerWorkspace";

export const dynamic = "force-dynamic";

export type BeastEducationExperienceMode =
  | "dashboard"
  | "guidance-counselor";

type EducationGoalRow = {
  id: string;
  title: string | null;
  category: string | null;
  target: string | null;
  status: string | null;
  progress: number | null;
};

type EducationPlanRow = {
  id: string;
  goal_id: string | null;
  title: string | null;
  summary: string | null;
};

type EducationCertificateRow = {
  path_name: string | null;
};

const profileColumns =
  "owner_id, goal_kind, goal, current_situation, background, strengths, growth_areas, constraints, weekly_hours, discovery_answers, selected_providers, career_interests, educational_goals, learning_preferences, certifications, available_study_time_known, college_interest, trade_interest, current_employment, military_experience, other_educational_context, updated_at";

function firstUseful(values: readonly (string | null | undefined)[]) {
  return values.map((value) => value?.trim()).find(Boolean) || "";
}

function readinessLabel(ready: boolean, readyLabel: string) {
  return ready ? readyLabel : "Still to define";
}

function WorkspaceLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-indigo-300/30 hover:bg-indigo-300/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 motion-reduce:transition-none"
    >
      <span className="text-sm font-black text-white group-hover:text-indigo-100">
        {title}
      </span>
      <span className="mt-1 block text-xs leading-5 text-[#9aa7b8]">
        {description}
      </span>
    </Link>
  );
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: ReturnType<typeof buildGuidanceWorkflowRecommendation>;
}) {
  return (
    <DashboardCard
      accent="purple"
      className="min-w-0"
      data-education-owner="guidance-counselor"
    >
      <SectionHeader
        eyebrow="Today’s recommendation"
        title={recommendation.title}
        description={recommendation.introduction}
        action={<ModuleBadge module="learning" label="One next step" />}
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-indigo-300/20 bg-indigo-300/[0.07] p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-200">
            Why this matters
          </p>
          <p className="mt-2 text-sm leading-6 text-indigo-50">
            {recommendation.why}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8]">
            Expected outcome
          </p>
          <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
            {recommendation.outcome}
          </p>
        </div>
      </div>
      <Link
        href={recommendation.href}
        className="beast-button-primary mt-5 inline-flex w-full justify-center sm:w-fit"
      >
        {recommendation.actionLabel}
      </Link>
    </DashboardCard>
  );
}

function DashboardExperience({
  memberName,
  currentGoal,
  currentCareerPath,
  currentPlan,
  goalProgress,
  roadmap,
  recommendation,
  profileKnown,
  dataWarning,
}: {
  memberName: string;
  currentGoal: string;
  currentCareerPath: string;
  currentPlan: string;
  goalProgress: number | null;
  roadmap: ReturnType<typeof buildLifelongEducationRoadmap>;
  recommendation: ReturnType<typeof buildGuidanceWorkflowRecommendation>;
  profileKnown: boolean;
  dataWarning: string;
}) {
  const roadmapStatus = roadmap.sections.reduce(
    (summary, section) => ({
      ...summary,
      [section.status]: summary[section.status] + 1,
    }),
    { known: 0, exploring: 0, "needs-context": 0 }
  );
  const milestones = roadmap.sections
    .filter((section) => section.status !== "known")
    .slice(0, 3);
  const planningFoundations = [
    Boolean(currentGoal),
    Boolean(currentCareerPath),
    Boolean(currentPlan),
    profileKnown,
  ];
  const establishedFoundations = planningFoundations.filter(Boolean).length;

  return (
    <main
      id="education-dashboard"
      className="beast-page"
      data-education-workspace="dashboard"
    >
      <div className="beast-container space-y-6 sm:space-y-8">
        <section className="beast-page-header overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-300/[0.08] via-[#111722] to-[#0e141e] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.18)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <ModuleBadge
                module="learning"
                label={`BeastEducation ${BEAST_LEARNING_VERSION}`}
              />
              <h1 className="beast-title mt-4">
                {memberName ? `${memberName}, here’s your education plan.` : "Your education plan"}
              </h1>
              <p className="beast-subtitle mt-3">
                A concise briefing on your direction, the plan in progress, and
                the next decision your Guidance Counselor recommends.
              </p>
            </div>
            <Link
              href="/dashboard/education/guidance-counselor"
              className="beast-button-primary inline-flex w-full justify-center sm:w-fit"
            >
              Talk with Guidance Counselor
            </Link>
          </div>
        </section>

        {dataWarning ? (
          <p
            className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100"
            role="status"
          >
            {dataWarning}
          </p>
        ) : null}

        <section aria-labelledby="education-briefing-title">
          <SectionHeader
            eyebrow="Executive Education Briefing"
            title="Where your plan stands"
            description="Summary only. Open the owning workspace when you want the full planning detail."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DashboardCard accent="learning" className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-200">
                Current Goal
              </p>
              <h2
                id="education-briefing-title"
                className="mt-3 break-words text-xl font-black text-white"
              >
                {currentGoal || "No goal confirmed yet"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">
                {currentGoal
                  ? "This is the outcome currently guiding education planning."
                  : "Your Guidance Counselor can help you define a useful direction without locking you into it."}
              </p>
              <Link
                href="/dashboard/education/goals"
                className="beast-button-secondary mt-4 inline-flex w-full justify-center sm:w-fit"
              >
                Open Education goals
              </Link>
            </DashboardCard>

            <DashboardCard accent="purple" className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-200">
                Current Career Path
              </p>
              <h2 className="mt-3 break-words text-xl font-black text-white">
                {currentCareerPath || "No career direction confirmed yet"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">
                {currentCareerPath
                  ? "Treat this as an evolving direction to verify, compare, and refine."
                  : "Career Planning will help turn interests into credible options."}
              </p>
              <Link
                href="/dashboard/education/career-planning"
                className="beast-button-secondary mt-4 inline-flex w-full justify-center sm:w-fit"
              >
                Open Career Planning
              </Link>
            </DashboardCard>

            <DashboardCard accent="learning" className="min-w-0 md:col-span-2 xl:col-span-1">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">
                Current Progress
              </p>
              {typeof goalProgress === "number" ? (
                <>
                  <p className="mt-3 text-3xl font-black text-white">
                    {Math.max(0, Math.min(100, Math.round(goalProgress)))}%
                  </p>
                  <div
                    className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#0b1018]"
                    role="progressbar"
                    aria-label="Current education goal progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.max(
                      0,
                      Math.min(100, Math.round(goalProgress))
                    )}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, Math.round(goalProgress))
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#aeb8c7]">
                    Progress recorded against the current goal.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#aeb8c7]">
                  No progress baseline has been recorded. Progress will become
                  meaningful after a goal and roadmap exist.
                </p>
              )}
            </DashboardCard>
          </div>
        </section>

        <RecommendationCard recommendation={recommendation} />

        <EducationCareerWorkspace />

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <DashboardCard accent="learning" className="min-w-0">
            <SectionHeader
              eyebrow="Upcoming Milestones"
              title="What the roadmap needs next"
              description="These are planning checkpoints, not fabricated dates or requirements."
            />
            {milestones.length > 0 ? (
              <ol className="mt-5 grid gap-3">
                {milestones.map((milestone, index) => (
                  <li
                    key={milestone.id}
                    className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-indigo-300/25 bg-indigo-300/10 text-xs font-black text-indigo-100">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-white">{milestone.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#aeb8c7]">
                        {milestone.summary}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm text-[#aeb8c7]">
                The current roadmap has no unresolved planning checkpoints.
              </p>
            )}
            <Link
              href="/dashboard/education/education-planning"
              className="beast-button-secondary mt-5 inline-flex w-full justify-center sm:w-fit"
            >
              Open Educational Roadmap
            </Link>
          </DashboardCard>

          <DashboardCard accent="purple" className="min-w-0">
            <SectionHeader
              eyebrow="Quick Summary"
              title="Planning readiness"
              description={`${establishedFoundations} of ${planningFoundations.length} planning foundations are established.`}
            />
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Goal", readinessLabel(Boolean(currentGoal), "Established")],
                [
                  "Career direction",
                  readinessLabel(Boolean(currentCareerPath), "Exploring"),
                ],
                ["Roadmap", readinessLabel(Boolean(currentPlan), "In place")],
                [
                  "Member context",
                  readinessLabel(profileKnown, "Building over time"),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-white/[0.035] p-4"
                >
                  <dt className="text-xs font-black uppercase tracking-[0.12em] text-[#8f9cad]">
                    {label}
                  </dt>
                  <dd className="mt-2 text-sm font-black text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <WorkspaceLink
                href="/dashboard/education/documents"
                title="Education Documents"
                description="Open the shared BeastOS document service filtered to Education."
              />
              <WorkspaceLink
                href="/dashboard/education/reports"
                title="Reports"
                description="Review planning summaries and export-ready records."
              />
            </div>
          </DashboardCard>
        </section>
      </div>
    </main>
  );
}

function GuidanceCounselorExperience({
  memberId,
  memberName,
  profile,
  context,
  recommendation,
  dataWarning,
}: {
  memberId: string;
  memberName: string;
  profile: ReturnType<typeof guidanceDiscoveryProfileFromRow>;
  context: {
    educationalGoal: string;
    interests: string;
    careerDirection: string;
    roadmap: string;
  };
  recommendation: ReturnType<typeof buildGuidanceWorkflowRecommendation>;
  dataWarning: string;
}) {
  return (
    <main
      id="guidance-counselor-workspace"
      className="beast-page"
      data-education-workspace="guidance-counselor"
    >
      <div className="beast-container space-y-6 sm:space-y-8">
        <section className="beast-page-header rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-300/[0.08] via-[#111722] to-[#0e141e] p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <ModuleBadge module="learning" label="Guidance Counselor" />
              <h1 className="beast-title mt-4">
                Your education and career planning conversation
              </h1>
              <p className="beast-subtitle mt-3">
                Talk through goals, career options, schools, funding,
                certifications, skills, and the roadmap that connects them.
              </p>
            </div>
            <Link
              href="/dashboard/education"
              className="beast-button-secondary inline-flex w-full justify-center sm:w-fit"
            >
              View Education Dashboard
            </Link>
          </div>
        </section>

        {dataWarning ? (
          <p
            className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100"
            role="status"
          >
            {dataWarning}
          </p>
        ) : null}

        <GuidanceCounselorConversation
          memberId={memberId}
          memberName={memberName}
          context={context}
          initialProfile={profile}
          recommendation={recommendation}
        />

        <section aria-labelledby="guidance-planning-workspaces-title">
          <SectionHeader
            eyebrow="Continue the plan"
            title="Open the workspace that owns the next decision"
            description="The conversation guides the work. Each planning workspace keeps its own detail."
          />
          <div
            id="guidance-planning-workspaces-title"
            className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <WorkspaceLink
              href="/dashboard/education/education-planning"
              title="Educational Roadmap"
              description="Review the long-term sequence and milestones."
            />
            <WorkspaceLink
              href="/dashboard/education/career-planning"
              title="Career Planning"
              description="Explore credible directions and requirements."
            />
            <WorkspaceLink
              href="/dashboard/education/schools"
              title="Schools"
              description="Compare programs, admissions, cost, and fit."
            />
            <WorkspaceLink
              href="/dashboard/education/scholarships"
              title="Scholarships"
              description="Plan funding opportunities and deadlines."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function BeastEducationExperience({
  mode,
}: {
  mode: BeastEducationExperienceMode;
}) {
  const supabase = createRouteClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const [
    profileResult,
    educationProfileResult,
    goalsResult,
    plansResult,
    certificatesResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("preferred_name, display_name, full_name, username")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("education_profiles")
      .select(profileColumns)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("learning_goals")
      .select("id, title, category, target, status, progress")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("learning_plans")
      .select("id, goal_id, title, summary")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("learning_certificates")
      .select("path_name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const memberName = getProfileDisplayName(
    profileResult.data as Parameters<typeof getProfileDisplayName>[0],
    user
  );
  const educationProfileRow =
    (educationProfileResult.data as Record<string, unknown> | null) || null;
  const profile = guidanceDiscoveryProfileFromRow(educationProfileRow);
  const goals = (goalsResult.data || []) as EducationGoalRow[];
  const plans = (plansResult.data || []) as EducationPlanRow[];
  const certificates = (certificatesResult.data ||
    []) as EducationCertificateRow[];
  const activeGoal =
    goals.find((goal) => goal.status === "Active") || goals[0] || null;
  const activePlan =
    plans.find((plan) => plan.goal_id === activeGoal?.id) || plans[0] || null;
  const currentGoal = firstUseful([activeGoal?.title, profile.goal]);
  const currentCareerPath = firstUseful(profile.careerInterests);
  const currentPlan = firstUseful([activePlan?.summary, activePlan?.title]);
  const roadmap = buildLifelongEducationRoadmap({
    academicProgressPercent:
      typeof activeGoal?.progress === "number" ? activeGoal.progress : undefined,
    careerInterests: profile.careerInterests,
    activeGoal: currentGoal,
    goalCategory: activeGoal?.category || undefined,
    planSummary: currentPlan,
    currentCourses: [],
    earnedCertifications: certificates
      .map((certificate) => certificate.path_name || "")
      .filter(Boolean),
  });
  const recommendation = buildGuidanceWorkflowRecommendation({
    memberName: memberName || "there",
    profile,
    hasSavedGoal: Boolean(activeGoal),
    hasSavedPlan: Boolean(activePlan),
  });
  const loadErrors = [
    profileResult.error,
    educationProfileResult.error,
    goalsResult.error,
    plansResult.error,
    certificatesResult.error,
  ].filter(Boolean);
  const dataWarning =
    loadErrors.length > 0
      ? "Some saved education context could not be loaded. The workspace is preserving that uncertainty instead of treating unavailable records as empty."
      : "";
  const context = {
    educationalGoal: currentGoal || "No educational goal confirmed yet",
    interests:
      profile.careerInterests.join(", ") || "No interests confirmed yet",
    careerDirection:
      currentCareerPath || "No career direction confirmed yet",
    roadmap: currentPlan || "No roadmap has been saved yet",
  };
  const profileKnown = Boolean(
    profile.goal ||
      profile.careerInterests.length ||
      profile.educationalGoals.length ||
      profile.strengths ||
      profile.currentSituation
  );

  if (mode === "guidance-counselor") {
    return (
      <GuidanceCounselorExperience
        memberId={user.id}
        memberName={memberName || ""}
        profile={profile}
        context={context}
        recommendation={recommendation}
        dataWarning={dataWarning}
      />
    );
  }

  return (
    <DashboardExperience
      memberName={memberName || ""}
      currentGoal={currentGoal}
      currentCareerPath={currentCareerPath}
      currentPlan={currentPlan}
      goalProgress={
        typeof activeGoal?.progress === "number" ? activeGoal.progress : null
      }
      roadmap={roadmap}
      recommendation={recommendation}
      profileKnown={profileKnown}
      dataWarning={dataWarning}
    />
  );
}
