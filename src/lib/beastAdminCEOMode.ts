import { normalizeBeastAdminAIAnalytics, type BeastAdminAIAnalyticsSnapshot } from "./beastAdminAIAnalytics";
import { normalizeBeastAdminCanonicalReadModel, type BeastAdminCanonicalReadModel } from "./beastAdminCanonicalProjection";
import { normalizeBeastAdminFeedbackItems, type BeastAdminFeedbackItem } from "./beastAdminFeedback";
import { normalizeBeastAdminMemberDirectory, type BeastAdminMemberDirectoryEntry } from "./beastAdminMemberTimeline";
import type { BeastAdminPlatformHealthSnapshot } from "./beastAdminPlatformHealth";
import { normalizeBeastAdminRepositoryReleaseSnapshot, type BeastAdminRepositoryReleaseSnapshot } from "./beastAdminRepositoryReleaseIntelligence";
import { normalizeBeastFeatureFlags, type BeastFeatureFlag } from "./beastFeatureFlags";

export const beastAdminCEOSourceIds = ["canonicalGovernance", "repositoryIntelligence", "feedback", "members", "betaTesting", "aiActivity", "opportunityRecommendations"] as const;
export type BeastAdminCEOSourceId = (typeof beastAdminCEOSourceIds)[number];
export type BeastAdminCEOSourceState = "available" | "unavailable" | "stale" | "error";

export type BeastAdminCEOOpportunityRecommendation = { id: string; professionalName: string; recommendation: string; whySurfaced: string; createdAt: string };
export type BeastAdminCEOSourceSnapshot = {
  generatedAt: string;
  canonical: BeastAdminCanonicalReadModel | null;
  repositoryRelease: BeastAdminRepositoryReleaseSnapshot | null;
  feedback: BeastAdminFeedbackItem[];
  members: BeastAdminMemberDirectoryEntry[];
  aiAnalytics: BeastAdminAIAnalyticsSnapshot | null;
  featureFlags: BeastFeatureFlag[];
  opportunityRecommendations: { state: BeastAdminCEOSourceState; detail: string; items: BeastAdminCEOOpportunityRecommendation[] };
  sources: Record<BeastAdminCEOSourceId, BeastAdminCEOSourceState>;
};

export type BeastAdminCEOArea = "Development" | "Configuration" | "Feedback" | "Errors" | "Members" | "Beta testing" | "Releases" | "Roadmap" | "Governance" | "Repositories" | "AI";
export type BeastAdminCEODailyItem = { id: string; area: BeastAdminCEOArea; title: string; detail: string; occurredAt: string; href: string };
export type BeastAdminCEOAction = { id: string; priority: "critical" | "high" | "medium" | "low"; area: BeastAdminCEOArea; title: string; why: string; href: string; actionLabel: string };
export type BeastAdminCEORepositoryStatus = { repository: string; branch: string | null; worktree: "clean" | "dirty" | "unavailable" | "planning"; ahead: number | null; behind: number | null; latestCommit: string | null; detail: string };
export type BeastAdminCEOModeSnapshot = {
  generatedAt: string; greeting: string; dateLabel: string; windowLabel: string;
  happenedYesterday: BeastAdminCEODailyItem[]; changedOvernight: BeastAdminCEODailyItem[];
  needsAttention: BeastAdminCEOAction[]; configurationItems: BeastAdminCEOAction[]; operationalErrors: BeastAdminCEOAction[]; workNext: BeastAdminCEOAction[];
  repositories: BeastAdminCEORepositoryStatus[];
  summaries: {
    development: { currentSprint: number | null; openPrompts: number | null; completedPrompts: number | null; upcomingWork: number | null };
    feedback: { total: number | null; new: number | null; open: number | null; changedYesterday: number | null };
    errors: { status: BeastAdminPlatformHealthSnapshot["overallStatus"] | "unavailable"; errors: number | null; warnings: number | null; configurationItems: number | null };
    members: { total: number | null; newYesterday: number | null; activeOvernight: number | null };
    betaTesting: { flags: number | null; assignments: number | null; activeAssignments: number | null };
    releases: { total: number | null; releasedYesterday: number | null; latestLabel: string };
    roadmap: { planned: number | null; inProgress: number | null; testing: number | null; released: number | null };
    opportunityRecommendations: BeastAdminCEOSourceSnapshot["opportunityRecommendations"];
    aiActivity: { conversations: number | null; abandoned: number | null; yesterday: number | null };
  };
  sources: Record<BeastAdminCEOSourceId | "platformHealth", BeastAdminCEOSourceState>;
  sourceGaps: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isTimestamp(value: unknown): value is string { return typeof value === "string" && !Number.isNaN(Date.parse(value)); }

function normalizeSourceStates(value: unknown) {
  if (!isRecord(value)) return null;
  const allowed = ["available", "unavailable", "stale", "error"];
  if (beastAdminCEOSourceIds.some((id) => !allowed.includes(String(value[id])))) return null;
  return value as Record<BeastAdminCEOSourceId, BeastAdminCEOSourceState>;
}

function normalizeRecommendations(value: unknown) {
  if (!isRecord(value) || typeof value.detail !== "string" || !Array.isArray(value.items) || !["available", "unavailable", "stale", "error"].includes(String(value.state))) return null;
  const items = value.items.filter((item) => isRecord(item) && typeof item.id === "string" && typeof item.professionalName === "string" && typeof item.recommendation === "string" && Boolean(item.recommendation.trim()) && typeof item.whySurfaced === "string" && Boolean(item.whySurfaced.trim()) && isTimestamp(item.createdAt)) as BeastAdminCEOOpportunityRecommendation[];
  if (items.length !== value.items.length || (value.state !== "available" && items.length)) return null;
  return { state: value.state as BeastAdminCEOSourceState, detail: value.detail, items };
}

export function normalizeBeastAdminCEOSourceSnapshot(value: unknown): BeastAdminCEOSourceSnapshot | null {
  if (!isRecord(value) || !isTimestamp(value.generatedAt)) return null;
  const canonical = value.canonical === null ? null : normalizeBeastAdminCanonicalReadModel(value.canonical);
  const repositoryRelease = value.repositoryRelease === null ? null : normalizeBeastAdminRepositoryReleaseSnapshot(value.repositoryRelease);
  const feedback = normalizeBeastAdminFeedbackItems(value.feedback);
  const members = normalizeBeastAdminMemberDirectory(value.members);
  const featureFlags = normalizeBeastFeatureFlags(value.featureFlags);
  const aiAnalytics = value.aiAnalytics === null ? null : normalizeBeastAdminAIAnalytics(value.aiAnalytics);
  const opportunityRecommendations = normalizeRecommendations(value.opportunityRecommendations);
  const sources = normalizeSourceStates(value.sources);
  if ((value.canonical !== null && !canonical) || (value.repositoryRelease !== null && !repositoryRelease) || !feedback || !members || !featureFlags || (value.aiAnalytics !== null && !aiAnalytics) || !opportunityRecommendations || !sources) return null;
  return { generatedAt: value.generatedAt, canonical, repositoryRelease, feedback, members, aiAnalytics, featureFlags, opportunityRecommendations, sources };
}

const operationalTimeZone = "America/New_York";
function zonedParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: operationalTimeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(value);
  const part = (type: "year" | "month" | "day" | "hour" | "minute") => parts.find((entry) => entry.type === type)?.value || "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, minutes: Number(part("hour")) * 60 + Number(part("minute")) };
}
function previousDateKey(dateKey: string) { const date = new Date(`${dateKey}T12:00:00.000Z`); date.setUTCDate(date.getUTCDate() - 1); return date.toISOString().slice(0, 10); }
function isYesterday(timestamp: string, yesterdayKey: string) { return /^\d{4}-\d{2}-\d{2}$/.test(timestamp) ? timestamp === yesterdayKey : zonedParts(new Date(timestamp)).date === yesterdayKey; }
function isOvernight(timestamp: string, yesterdayKey: string, todayKey: string, currentMinutes: number) {
  if (!isTimestamp(timestamp)) return false;
  const parts = zonedParts(new Date(timestamp));
  const overnightEnd = Math.min(currentMinutes, 8 * 60);
  return (parts.date === yesterdayKey && parts.minutes >= 18 * 60) || (parts.date === todayKey && parts.minutes <= overnightEnd);
}
function stableNoon(date: string) { return `${date}T12:00:00.000Z`; }
function sortDaily(items: BeastAdminCEODailyItem[]) { return items.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || left.id.localeCompare(right.id)); }

const priorityRank = new Map([["critical", 0], ["urgent", 0], ["p0", 0], ["p1", 1], ["high", 1], ["medium", 2], ["normal", 2], ["low", 3]]);
function canonicalPriority(value: string): BeastAdminCEOAction["priority"] { return (["critical", "high", "medium", "low"] as const)[priorityRank.get(value.toLowerCase()) ?? 2]; }
function isCompleteStatus(value: string) { return /complete|released|closed|retired|superseded/i.test(value); }
function isTestingStatus(value: string) { return /test|validat|measure|preview|acceptance/i.test(value); }
function isActiveStatus(value: string) { return /active|progress|execut|started|implement/i.test(value); }

function sourceGapLabel(sourceId: BeastAdminCEOSourceId) {
  return ({ canonicalGovernance: "BeastFusion governance projection", repositoryIntelligence: "Repository and release intelligence", feedback: "Beta Feedback", members: "Member directory", betaTesting: "Feature Flags", aiActivity: "AI Analytics", opportunityRecommendations: "Opportunity recommendations" } as const)[sourceId];
}
function sourceHref(sourceId: BeastAdminCEOSourceId) {
  if (sourceId === "feedback") return "/dashboard/admin/feedback";
  if (sourceId === "members") return "/dashboard/admin/members";
  if (sourceId === "betaTesting") return "/dashboard/admin/flags";
  if (sourceId === "aiActivity" || sourceId === "opportunityRecommendations") return "/dashboard/admin/analytics";
  return "/dashboard/admin/development";
}
function repositoryStatuses(source: BeastAdminCEOSourceSnapshot): BeastAdminCEORepositoryStatus[] {
  return (source.repositoryRelease?.repositories || []).map((repository) => ({ repository: repository.label, branch: repository.defaultBranch, worktree: "unavailable", ahead: null, behind: null, latestCommit: repository.headCommit, detail: `${repository.detail} Production: ${repository.production.detail}` }));
}
function configurationTitle(signal: BeastAdminPlatformHealthSnapshot["services"][number]) {
  if (signal.id === "ai") return /credentials are not configured/i.test(signal.summary) ? "AI provider not configured" : "AI provider monitoring not configured";
  if (signal.id === "email") return "Email delivery not configured";
  if (signal.id === "background_jobs") return "Background monitoring not configured";
  return `${signal.id.replaceAll("_", " ")} monitoring not configured`;
}

export function buildBeastAdminCEOModeSnapshot({ source, platformHealth, platformHealthAvailable, now = new Date(source.generatedAt) }: { source: BeastAdminCEOSourceSnapshot; platformHealth: BeastAdminPlatformHealthSnapshot | null; platformHealthAvailable: boolean; now?: Date }): BeastAdminCEOModeSnapshot {
  const nowParts = zonedParts(now);
  const yesterdayKey = previousDateKey(nowParts.date);
  const canonical = source.canonical;
  const happenedYesterday: BeastAdminCEODailyItem[] = [];
  const changedOvernight: BeastAdminCEODailyItem[] = [];
  const addEvent = (item: BeastAdminCEODailyItem) => {
    if (isYesterday(item.occurredAt, yesterdayKey)) happenedYesterday.push(item);
    if (isOvernight(item.occurredAt, yesterdayKey, nowParts.date, nowParts.minutes)) changedOvernight.push(item);
  };

  for (const event of canonical?.execution || []) {
    const occurredAt = event.occurredAt || event.completedAt || event.startedAt;
    if (!occurredAt) continue;
    addEvent({ id: `execution-${event.id}`, area: /release|deploy/i.test(event.status) ? "Releases" : "Development", title: `${event.package || event.product}: ${event.status.replaceAll("_", " ")}`, detail: event.result || "Canonical BeastFusion execution evidence recorded.", occurredAt, href: "/dashboard/admin/development" });
  }
  for (const release of canonical?.releases || []) {
    if (!release.releaseDate) continue;
    addEvent({ id: `release-${release.id}`, area: "Releases", title: `${release.product}${release.version ? ` v${release.version}` : ""}: ${release.status}`, detail: `${release.validationState || "Validation not recorded"} · ${release.declaredDeployment}`, occurredAt: /^\d{4}-\d{2}-\d{2}$/.test(release.releaseDate) ? stableNoon(release.releaseDate) : release.releaseDate, href: "/dashboard/admin/releases" });
  }
  for (const repository of source.repositoryRelease?.repositories || []) {
    if (repository.headCommittedAt) addEvent({ id: `repository-${repository.id}-${repository.headCommit}`, area: "Repositories", title: `${repository.label} default branch advanced`, detail: repository.headCommit ? `Verified head ${repository.headCommit.slice(0, 12)}.` : repository.detail, occurredAt: repository.headCommittedAt, href: "/dashboard/admin/development" });
    for (const deployment of [repository.preview, repository.production]) {
      if (!deployment.deployedAt || deployment.state !== "connected") continue;
      addEvent({ id: `deployment-${repository.id}-${deployment.environment}-${deployment.deploymentId}`, area: "Releases", title: `${repository.label} ${deployment.environment} deployed`, detail: deployment.servedCommit ? `Verified served commit ${deployment.servedCommit.slice(0, 12)}.` : deployment.detail, occurredAt: deployment.deployedAt, href: "/dashboard/admin/development" });
    }
  }
  for (const item of source.feedback) addEvent({ id: `feedback-${item.id}`, area: "Feedback", title: item.submittedAt === item.updatedAt ? `Feedback received from ${item.memberName}` : `Feedback moved to ${item.status}`, detail: item.message, occurredAt: item.updatedAt, href: "/dashboard/admin/feedback" });
  for (const member of source.members) {
    if (isYesterday(member.registeredAt, yesterdayKey)) happenedYesterday.push({ id: `member-registered-${member.id}`, area: "Members", title: `${member.displayName} registered`, detail: "A new authenticated Beast member profile was created.", occurredAt: member.registeredAt, href: "/dashboard/admin/members" });
    if (member.lastActivityAt && isOvernight(member.lastActivityAt, yesterdayKey, nowParts.date, nowParts.minutes)) changedOvernight.push({ id: `member-activity-${member.id}`, area: "Members", title: `${member.displayName} had recorded activity`, detail: `${member.eventCount} permissioned journey events are currently indexed.`, occurredAt: member.lastActivityAt, href: "/dashboard/admin/members" });
  }
  const assignments = source.featureFlags.flatMap((flag) => flag.assignments.map((assignment) => ({ flag, assignment })));
  for (const { flag, assignment } of assignments) addEvent({ id: `beta-${assignment.id}`, area: "Beta testing", title: `${flag.name}: ${assignment.stage}`, detail: `A ${assignment.scopeType} feature assignment changed.`, occurredAt: assignment.updatedAt, href: "/dashboard/admin/flags" });
  const yesterdayAIConversations = source.aiAnalytics?.dailyActivity.find((item) => item.date === yesterdayKey)?.conversationCount ?? null;
  if (yesterdayAIConversations) happenedYesterday.push({ id: `ai-activity-${yesterdayKey}`, area: "AI", title: `${yesterdayAIConversations} professional conversation${yesterdayAIConversations === 1 ? "" : "s"} started`, detail: "Privacy-bounded AI Analytics recorded conversation activity.", occurredAt: stableNoon(yesterdayKey), href: "/dashboard/admin/analytics" });

  const needsAttention: BeastAdminCEOAction[] = [];
  const configurationItems: BeastAdminCEOAction[] = [];
  const operationalErrors: BeastAdminCEOAction[] = [];
  const healthSignals = new Map((platformHealth?.services || []).map((service) => [service.id, service]));
  for (const issue of platformHealth?.errors || []) operationalErrors.push({ id: `health-error-${issue.serviceId}`, priority: "critical", area: "Errors", title: `${issue.serviceLabel}: ${issue.message}`, why: "A current live or configured platform-health signal is critical.", href: "/dashboard/admin/platform-health", actionLabel: "Investigate" });
  for (const issue of platformHealth?.warnings || []) {
    const signal = healthSignals.get(issue.serviceId);
    if (signal && ["configuration", "not_connected"].includes(signal.source)) configurationItems.push({ id: `health-configuration-${issue.serviceId}`, priority: "low", area: "Configuration", title: configurationTitle(signal), why: signal.evidence, href: "/dashboard/admin/platform-health", actionLabel: "Review configuration" });
    else operationalErrors.push({ id: `health-warning-${issue.serviceId}`, priority: "high", area: "Errors", title: `${issue.serviceLabel}: ${issue.message}`, why: "A live or request-sample signal reported degraded operation.", href: "/dashboard/admin/platform-health", actionLabel: "Review health" });
  }

  const failedRelease = source.repositoryRelease?.releases.find((release) => ["drift_detected", "provider_error"].includes(release.evidenceState) || /failed|rolled.?back/i.test(`${release.status} ${release.validationState || ""}`));
  if (failedRelease) operationalErrors.push({ id: `release-failure-${failedRelease.id}`, priority: "critical", area: "Releases", title: `${failedRelease.product}${failedRelease.version ? ` v${failedRelease.version}` : ""}: release evidence requires attention`, why: failedRelease.evidenceDetail, href: "/dashboard/admin/development", actionLabel: "Review release evidence" });

  for (const item of canonical?.attention || []) needsAttention.push({ id: `canonical-${item.id}`, priority: item.kind === "failure" || item.kind === "drift" ? "high" : "medium", area: "Governance", title: item.kind === "measurement" ? "Canonical measurement requires review" : "Canonical governance requires attention", why: item.detail, href: "/dashboard/admin/development", actionLabel: item.kind === "blocker" ? "Review blocker" : "Review evidence" });
  const newFeedback = source.feedback.filter((item) => item.status === "New");
  if (source.sources.feedback === "available" && newFeedback.length) needsAttention.push({ id: "new-feedback", priority: "high", area: "Feedback", title: `${newFeedback.length} new feedback item${newFeedback.length === 1 ? "" : "s"}`, why: "New member feedback has not been acknowledged.", href: "/dashboard/admin/feedback", actionLabel: "Review feedback" });
  if (source.sources.aiActivity === "available" && (source.aiAnalytics?.abandonedCount || 0) > 0) needsAttention.push({ id: "abandoned-conversations", priority: "medium", area: "AI", title: `${source.aiAnalytics!.abandonedCount} potentially abandoned conversation${source.aiAnalytics!.abandonedCount === 1 ? "" : "s"}`, why: "Persisted conversation evidence shows a member message without a timely professional response.", href: "/dashboard/admin/analytics", actionLabel: "Inspect AI activity" });

  for (const sourceId of beastAdminCEOSourceIds) {
    const state = source.sources[sourceId];
    if (state === "available") continue;
    const detail = sourceId === "opportunityRecommendations" ? source.opportunityRecommendations.detail : state === "stale" ? "The last verified evidence is retained but is no longer current." : state === "error" ? "The provider failed closed; no replacement truth was inferred." : "CEO Mode cannot verify this part of the operating picture.";
    configurationItems.push({ id: `source-${sourceId}`, priority: sourceId === "canonicalGovernance" && state !== "unavailable" ? "high" : "low", area: "Configuration", title: `${sourceGapLabel(sourceId)} ${state === "stale" ? "stale" : state === "error" ? "error" : "not connected"}`, why: detail, href: sourceHref(sourceId), actionLabel: "Review source" });
  }
  if (!platformHealthAvailable) configurationItems.push({ id: "source-platform-health", priority: "low", area: "Configuration", title: "Platform Health source not connected", why: "Current service errors and warnings could not be verified.", href: "/dashboard/admin/platform-health", actionLabel: "Open health" });

  const workNext: BeastAdminCEOAction[] = [];
  const critical = operationalErrors.find((item) => item.priority === "critical");
  if (critical) workNext.push(critical);
  else if (source.sources.canonicalGovernance !== "available" || canonical?.provider.status !== "connected") workNext.push({ id: "next-canonical-provider", priority: "high", area: "Governance", title: "Restore current canonical governance evidence", why: "CEO Mode fails closed and will not select execution work while the BeastFusion projection is unavailable, stale, or in error.", href: "/dashboard/admin/development", actionLabel: "Review governance status" });
  else {
    const blocked = canonical.roadmap.filter((item) => item.blocked && item.ownerApproved && !isCompleteStatus(item.status)).sort((left, right) => (priorityRank.get(left.priority.toLowerCase()) ?? 2) - (priorityRank.get(right.priority.toLowerCase()) ?? 2) || left.id.localeCompare(right.id))[0];
    if (blocked) workNext.push({ id: `next-blocker-${blocked.id}`, priority: canonicalPriority(blocked.priority), area: "Governance", title: `Resolve the owner decision blocking ${blocked.id}`, why: `${blocked.title} is canonically blocked. This is a decision, not execution authorization.`, href: "/dashboard/admin/development", actionLabel: "Review blocker" });
    else if (canonical.cursor.executableWorkAvailable) {
      const selected = canonical.roadmap.find((item) => (item.id === canonical.cursor.selectedPackage || item.product === canonical.cursor.selectedProduct) && item.executable && item.ownerApproved && item.executionAuthorized && !item.blocked);
      if (selected) workNext.push({ id: `next-executable-${selected.id}`, priority: canonicalPriority(selected.priority), area: "Development", title: `Continue authorized package ${selected.id}`, why: `${selected.title} is the canonical selected package and all projected authorization gates are satisfied.`, href: "/dashboard/admin/development", actionLabel: "Open package evidence" });
    }
    if (!workNext.length) {
      const awaitingDecision = canonical.roadmap.filter((item) => !item.ownerApproved && !item.blocked && !isCompleteStatus(item.status)).sort((left, right) => (priorityRank.get(left.priority.toLowerCase()) ?? 2) - (priorityRank.get(right.priority.toLowerCase()) ?? 2) || left.id.localeCompare(right.id))[0];
      if (awaitingDecision) workNext.push({ id: `next-decision-${awaitingDecision.id}`, priority: canonicalPriority(awaitingDecision.priority), area: "Governance", title: `Decide whether to approve ${awaitingDecision.id}`, why: `${awaitingDecision.title} is awaiting owner approval. No execution is implied.`, href: "/dashboard/admin/roadmap", actionLabel: "Review decision" });
      else {
        const directive = canonical.cursor.recommendedDirective || "Owner Strategy Review";
        workNext.push({ id: "next-canonical-directive", priority: "medium", area: "Governance", title: directive, why: `${canonical.cursor.mode || "Planning mode"}; BeastFusion reports no authorized executable package.`, href: "/dashboard/admin/development", actionLabel: "Open canonical roadmap" });
      }
    }
  }

  const roadmapCounts = canonical ? canonical.roadmap.reduce((counts, item) => { if (isCompleteStatus(item.status)) counts.released += 1; else if (isTestingStatus(item.status)) counts.testing += 1; else if (isActiveStatus(item.status)) counts.inProgress += 1; else counts.planned += 1; return counts; }, { planned: 0, inProgress: 0, testing: 0, released: 0 }) : null;
  const openFeedback = source.feedback.filter((item) => !["Released", "Declined"].includes(item.status));
  const releasedYesterday = canonical?.releases.filter((release) => release.releaseDate && isYesterday(release.releaseDate, yesterdayKey)).length ?? null;
  const activeBetaAssignments = assignments.filter(({ assignment }) => ["internal_testing", "beta"].includes(assignment.stage)).length;
  const sortedActions = (items: BeastAdminCEOAction[]) => items.sort((left, right) => (priorityRank.get(left.priority) ?? 2) - (priorityRank.get(right.priority) ?? 2) || left.id.localeCompare(right.id)).slice(0, 12);
  const completed = canonical?.roadmap.filter((item) => isCompleteStatus(item.status)).length ?? null;
  const open = canonical?.roadmap.filter((item) => !isCompleteStatus(item.status)).length ?? null;
  const current = canonical?.roadmap.filter((item) => isActiveStatus(item.status) || isTestingStatus(item.status)).length ?? null;

  return {
    generatedAt: source.generatedAt,
    greeting: nowParts.minutes < 12 * 60 ? "Good morning" : nowParts.minutes < 17 * 60 ? "Good afternoon" : "Good evening",
    dateLabel: new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: operationalTimeZone }).format(now),
    windowLabel: "Yesterday is the prior calendar day. Overnight is 6:00 PM yesterday through 8:00 AM today, America/New_York.",
    happenedYesterday: sortDaily(happenedYesterday).slice(0, 12), changedOvernight: sortDaily(changedOvernight).slice(0, 12), needsAttention: sortedActions(needsAttention), configurationItems: sortedActions(configurationItems), operationalErrors: sortedActions(operationalErrors), workNext: workNext.slice(0, 4), repositories: repositoryStatuses(source),
    summaries: {
      development: { currentSprint: current, openPrompts: open, completedPrompts: completed, upcomingWork: roadmapCounts?.planned ?? null },
      feedback: { total: source.sources.feedback === "available" ? source.feedback.length : null, new: source.sources.feedback === "available" ? newFeedback.length : null, open: source.sources.feedback === "available" ? openFeedback.length : null, changedYesterday: source.sources.feedback === "available" ? source.feedback.filter((item) => isYesterday(item.updatedAt, yesterdayKey)).length : null },
      errors: { status: !platformHealthAvailable ? "unavailable" : operationalErrors.some((item) => item.priority === "critical") ? "critical" : operationalErrors.length ? "warning" : "operational", errors: platformHealthAvailable ? operationalErrors.filter((item) => item.priority === "critical").length : null, warnings: platformHealthAvailable ? operationalErrors.filter((item) => item.priority !== "critical").length : null, configurationItems: configurationItems.length },
      members: { total: source.sources.members === "available" ? source.members.length : null, newYesterday: source.sources.members === "available" ? source.members.filter((member) => isYesterday(member.registeredAt, yesterdayKey)).length : null, activeOvernight: source.sources.members === "available" ? source.members.filter((member) => member.lastActivityAt && isOvernight(member.lastActivityAt, yesterdayKey, nowParts.date, nowParts.minutes)).length : null },
      betaTesting: { flags: source.sources.betaTesting === "available" ? source.featureFlags.length : null, assignments: source.sources.betaTesting === "available" ? assignments.length : null, activeAssignments: source.sources.betaTesting === "available" ? activeBetaAssignments : null },
      releases: { total: canonical ? canonical.releases.length : null, releasedYesterday, latestLabel: canonical?.releases[0] ? `${canonical.releases[0].product}${canonical.releases[0].version ? ` v${canonical.releases[0].version}` : ""}` : canonical ? "No releases recorded" : "Unavailable" },
      roadmap: roadmapCounts || { planned: null, inProgress: null, testing: null, released: null },
      opportunityRecommendations: source.opportunityRecommendations,
      aiActivity: { conversations: source.sources.aiActivity === "available" ? source.aiAnalytics?.conversationCount ?? 0 : null, abandoned: source.sources.aiActivity === "available" ? source.aiAnalytics?.abandonedCount ?? 0 : null, yesterday: source.sources.aiActivity === "available" ? yesterdayAIConversations ?? 0 : null },
    },
    sources: { ...source.sources, platformHealth: platformHealthAvailable ? "available" : "unavailable" },
    sourceGaps: configurationItems.map((item) => item.title),
  };
}
