import Link from "next/link";
import { requireMemberModuleEntitlement } from "@/lib/memberAgeServer";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { PlatformServiceHero } from "@/app/dashboard/platformServices";
import type { BeastDocumentDataClient } from "@/lib/platform/documents";
import { loadUserDocuments } from "@/lib/platform/documents";
import type { BeastGoalDataClient, GoalContribution } from "@/lib/platform/goals";
import { loadUserGoals } from "@/lib/platform/goals";
import {
  buildProfessionalActivities,
  getProfessionalActivityFilter,
  getProfessionalName,
  professionalActivityFilters,
  type EducationProfileActivityRecord,
  type RetirementReportActivityRecord,
  type RetirementTimelineActivityRecord,
} from "@/lib/platform/professionalActivity";
import {
  buildTimelineStream,
  groupTimelineByDate,
  type PlatformTimelineItem,
} from "@/lib/platform/timeline";
import { createRouteClient } from "@/lib/supabase/server";

type TimelinePageProps = {
  searchParams?: Promise<{
    source?: string;
  }>;
};

type ActivityLoadResult = {
  items: PlatformTimelineItem[];
  signedOut: boolean;
  unavailable: boolean;
};

function formatActivityTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapEducationProfile(
  row: Record<string, unknown> | null
): EducationProfileActivityRecord | undefined {
  if (!row) return undefined;

  return {
    ownerId: String(row.owner_id || ""),
    goal: String(row.goal || ""),
    careerInterests: Array.isArray(row.career_interests)
      ? row.career_interests.map(String)
      : [],
    educationalGoals: Array.isArray(row.educational_goals)
      ? row.educational_goals.map(String)
      : [],
    learningPreferences: Array.isArray(row.learning_preferences)
      ? row.learning_preferences.map(String)
      : [],
    certifications: Array.isArray(row.certifications)
      ? row.certifications.map(String)
      : [],
    strengths: String(row.strengths || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

async function loadProfessionalActivity(): Promise<ActivityLoadResult> {
  try {
    const client = createRouteClient();
    const { data: userData, error: userError } = await client.auth.getUser();

    if (userError || !userData.user) {
      return {
        items: [],
        signedOut: !userData.user,
        unavailable: Boolean(userError),
      };
    }

    const ownerId = userData.user.id;
    const [moneyAccess, healthAccess] = await Promise.all([requireMemberModuleEntitlement("money", {supabase:client,user:userData.user}), requireMemberModuleEntitlement("health", {supabase:client,user:userData.user})]);
    const empty = {data:[],error:null};
    const [
      goalResult,
      documentResult,
      educationProfileResult,
      retirementTimelineResult,
      retirementReportResult,
      healthResult,
      paymentsResult,
    ] = await Promise.all([
      loadUserGoals(client as unknown as BeastGoalDataClient),
      loadUserDocuments(client as unknown as BeastDocumentDataClient),
      client
        .from("education_profiles")
        .select(
          "owner_id, goal, strengths, career_interests, educational_goals, learning_preferences, certifications, updated_at"
        )
        .eq("owner_id", ownerId)
        .maybeSingle(),
      moneyAccess.ok ? client
        .from("retirement_timeline_runs")
        .select("id, calculation_version, created_at")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(25) : empty,
      moneyAccess.ok ? client
        .from("retirement_report_exports")
        .select("id, format, created_at")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(25) : empty,
      healthAccess.ok ? client.from("beast_health_records").select("id,title,updated_at").eq("owner_id",ownerId).neq("status","archived").order("updated_at",{ascending:false}).limit(25) : empty,
      moneyAccess.ok ? client.from("bill_payments").select("id,amount_paid,created_at").eq("user_id",ownerId).order("created_at",{ascending:false}).limit(25) : empty,
    ]);
    const recent:PlatformTimelineItem[] = [
      ...(healthResult.error ? [] : healthResult.data || []).map(row=>({id:`health:${row.id}`,source:"health" as const,sourceRecordId:row.id,kind:"Updated" as const,title:"Health record updated",summary:row.title,occurredAt:row.updated_at,visibility:"Owner" as const,href:"/dashboard/health",meaningful:true,details:[]})),
      ...(paymentsResult.error ? [] : paymentsResult.data || []).map(row=>({id:`bill-payment:${row.id}`,source:"money" as const,sourceRecordId:row.id,kind:"Completed" as const,title:"Bill payment recorded",summary:`$${Number(row.amount_paid).toFixed(2)} recorded in BeastMoney.`,occurredAt:row.created_at,visibility:"Owner" as const,href:"/dashboard/money/bills",meaningful:true,details:[]})),
    ];

    const goals = goalResult.status === "ready" ? goalResult.goals : [];
    const documents =
      documentResult.status === "ready" ? documentResult.documents : [];
    const contributions: GoalContribution[] = goals.flatMap(
      (goal) => goal.contributions
    );
    const educationProfile = educationProfileResult.error
      ? undefined
      : mapEducationProfile(
          educationProfileResult.data as Record<string, unknown> | null
        );
    const retirementTimelineRuns = retirementTimelineResult.error
      ? []
      : ((retirementTimelineResult.data || []) as Record<string, unknown>[]).map(
          (row): RetirementTimelineActivityRecord => ({
            id: String(row.id),
            calculationVersion: String(row.calculation_version),
            createdAt: String(row.created_at),
          })
        );
    const retirementReports = retirementReportResult.error
      ? []
      : ((retirementReportResult.data || []) as Record<string, unknown>[]).map(
          (row): RetirementReportActivityRecord => ({
            id: String(row.id),
            format: String(row.format),
            createdAt: String(row.created_at),
          })
        );

    return {
      items: [...recent,...buildProfessionalActivities({
        educationProfile,
        retirementTimelineRuns,
        retirementReports,
        documents: documents.filter(document=>document.status!=="Deleted"),
        goals,
        goalContributions: contributions,
      })],
      signedOut: false,
      unavailable:
        goalResult.status === "unavailable" ||
        documentResult.status === "unavailable" ||
        Boolean(educationProfileResult.error) ||
        Boolean(retirementTimelineResult.error) ||
        Boolean(retirementReportResult.error) || Boolean(healthResult.error) || Boolean(paymentsResult.error) || (!moneyAccess.ok && moneyAccess.status===503) || (!healthAccess.ok && healthAccess.status===503),
    };
  } catch {
    return { items: [], signedOut: false, unavailable: true };
  }
}

export default async function TimelinePage({
  searchParams,
}: TimelinePageProps) {
  const resolvedSearchParams = await searchParams;
  const activity = await loadProfessionalActivity();
  const selectedFilter = getProfessionalActivityFilter(resolvedSearchParams?.source);
  const stream = buildTimelineStream({
    items: activity.items,
    filters: selectedFilter.source
      ? { source: selectedFilter.source }
      : undefined,
    allowedVisibility: ["Owner"],
  });
  const groups = groupTimelineByDate(stream);

  const emptyMessage = activity.signedOut
    ? "Sign in to see how your Beast professionals have been working with you."
    : activity.unavailable
      ? "Some activity could not be loaded right now. Please refresh to try again."
      : selectedFilter.id === "all"
        ? "Your activity will appear here as you save goals, documents, and plans."
        : `No ${selectedFilter.label.toLowerCase()} activity yet.`;

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="timeline"
          eyebrow="Your activity"
          title="Your timeline"
          description="See your saved goals, documents, health updates, and recorded bill payments."
        />

        <DashboardCard accent="timeline">
          <SectionHeader
            eyebrow="Activity Feed"
            title="Your recent activity"
            description="Filter by area without losing the context of your shared history."
          />
          <nav
            aria-label="Filter professional activity"
            className="mt-5 flex flex-wrap gap-2"
          >
            {professionalActivityFilters.map((filter) => {
              const active = filter.id === selectedFilter.id;
              const href =
                filter.id === "all"
                  ? "/dashboard/timeline"
                  : `/dashboard/timeline?source=${filter.id}`;

              return (
                <Link
                  key={filter.id}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full border px-3.5 py-2 text-sm font-black transition ${
                    active
                      ? "border-[#91cbff] bg-[#17324a] text-white"
                      : "border-[#2a3242] bg-[#111827] text-[#aeb9c8] hover:border-[#53627a] hover:text-white"
                  }`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </nav>
        </DashboardCard>

        {activity.unavailable && groups.length > 0 && <p role="status" className="text-amber-100">Some activity could not be loaded. The items below are available; refresh to try again.</p>}
        {groups.length ? (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.key} aria-labelledby={`activity-${group.key}`}>
                <h2
                  id={`activity-${group.key}`}
                  className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-[#8f9caf]"
                >
                  {group.label}
                </h2>
                <div className="relative space-y-3 before:absolute before:bottom-5 before:left-[1.15rem] before:top-5 before:w-px before:bg-[#2a3242]">
                  {group.items.map((item) => (
                    <article
                      key={item.id}
                      className="relative rounded-2xl border border-[#2a3242] bg-[#111827] p-4 pl-14 shadow-sm sm:p-5 sm:pl-16"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute left-3 top-6 h-4 w-4 rounded-full border-4 border-[#111827] bg-[#91cbff] ring-1 ring-[#2a3242] sm:left-[0.95rem]"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <ModuleBadge
                          module={item.source}
                          label={getProfessionalName(item.source)}
                        />
                        <span className="text-xs font-bold text-[#7f8da3]">
                          {formatActivityTime(item.occurredAt)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-black text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#aeb9c8]">
                        {item.summary}
                      </p>
                      {item.details.length > 1 ? (
                        <dl className="mt-4 flex flex-wrap gap-2">
                          {item.details
                            .filter((detail) => detail.label !== "Professional")
                            .map((detail) => (
                              <div
                                key={`${item.id}-${detail.label}`}
                                className="rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-2"
                              >
                                <dt className="text-[0.65rem] font-black uppercase tracking-wide text-[#7f8da3]">
                                  {detail.label}
                                </dt>
                                <dd className="mt-0.5 text-xs font-bold text-[#d8dee8]">
                                  {detail.value}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      ) : null}
                      <Link
                        href={item.href}
                        className="mt-4 inline-flex text-sm font-black text-[#91cbff] hover:text-white"
                      >
                        Open in {getProfessionalName(item.source)}
                        <span aria-hidden="true" className="ml-1">
                          →
                        </span>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <DashboardCard accent="timeline">
            <div className="py-8 text-center">
              <div className="text-lg font-black text-white">
                No activity to show yet
              </div>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#9aa7b8]">
                {emptyMessage}
              </p>
            </div>
          </DashboardCard>
        )}
      </div>
    </main>
  );
}
