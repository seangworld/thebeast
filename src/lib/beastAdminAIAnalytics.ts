export type BeastAdminAIProfessionalUsage = {
  agentId: string;
  conversationCount: number;
  messageCount: number;
};

export type BeastAdminAITopic = {
  topic: string;
  conversationCount: number;
};

export type BeastAdminAIDailyActivity = {
  date: string;
  conversationCount: number;
};

export type BeastAdminAIAnalyticsSnapshot = {
  windowDays: number;
  generatedAt: string;
  conversationCount: number;
  engagedMemberCount: number;
  messageCount: number;
  archivedCount: number;
  abandonedCount: number;
  averageSessionSeconds: number | null;
  completionRate: number | null;
  helpfulResponseRate: number | null;
  professionalUsage: BeastAdminAIProfessionalUsage[];
  commonTopics: BeastAdminAITopic[];
  dailyActivity: BeastAdminAIDailyActivity[];
};

const professionalNames: Record<string, string> = {
  "beastmoney.money-coach": "Money Coach",
  "beasteducation.guidance-counselor": "Guidance Counselor",
  "beasthealth.health-advisor": "Health Advisor",
  "beastos.personal-assistant": "Personal Assistant",
  "beastgoals.goals-coach": "Goals Coach",
  "beasthome.home-assistant": "Home Assistant",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function nullableRate(value: unknown) {
  const number = nonNegativeNumber(value);
  return number !== null && number <= 1 ? number : null;
}

function normalizeProfessionalUsage(
  value: unknown
): BeastAdminAIProfessionalUsage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.agentId !== "string") return [];
    const conversationCount = nonNegativeNumber(entry.conversationCount);
    const messageCount = nonNegativeNumber(entry.messageCount);
    if (conversationCount === null || messageCount === null) return [];

    return [
      {
        agentId: entry.agentId,
        conversationCount,
        messageCount,
      },
    ];
  });
}

function normalizeTopics(value: unknown): BeastAdminAITopic[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.topic !== "string") return [];
    const conversationCount = nonNegativeNumber(entry.conversationCount);
    const topic = entry.topic.trim();
    if (!topic || conversationCount === null) return [];

    return [{ topic, conversationCount }];
  });
}

function normalizeDailyActivity(value: unknown): BeastAdminAIDailyActivity[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.date !== "string") return [];
    const conversationCount = nonNegativeNumber(entry.conversationCount);
    if (
      conversationCount === null ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    ) {
      return [];
    }

    return [{ date: entry.date, conversationCount }];
  });
}

export function normalizeBeastAdminAIAnalytics(
  value: unknown
): BeastAdminAIAnalyticsSnapshot | null {
  if (!isRecord(value) || typeof value.generatedAt !== "string") return null;

  const windowDays = nonNegativeNumber(value.windowDays);
  const conversationCount = nonNegativeNumber(value.conversationCount);
  const engagedMemberCount = nonNegativeNumber(value.engagedMemberCount);
  const messageCount = nonNegativeNumber(value.messageCount);
  const archivedCount = nonNegativeNumber(value.archivedCount);
  const abandonedCount = nonNegativeNumber(value.abandonedCount);
  const hasValidAverageSession =
    value.averageSessionSeconds === null ||
    nonNegativeNumber(value.averageSessionSeconds) !== null;
  const averageSessionSeconds =
    value.averageSessionSeconds === null
      ? null
      : nonNegativeNumber(value.averageSessionSeconds);

  if (
    windowDays === null ||
    conversationCount === null ||
    engagedMemberCount === null ||
    messageCount === null ||
    archivedCount === null ||
    abandonedCount === null ||
    !hasValidAverageSession
  ) {
    return null;
  }

  return {
    windowDays,
    generatedAt: value.generatedAt,
    conversationCount,
    engagedMemberCount,
    messageCount,
    archivedCount,
    abandonedCount,
    averageSessionSeconds,
    completionRate: nullableRate(value.completionRate),
    helpfulResponseRate: nullableRate(value.helpfulResponseRate),
    professionalUsage: normalizeProfessionalUsage(value.professionalUsage),
    commonTopics: normalizeTopics(value.commonTopics),
    dailyActivity: normalizeDailyActivity(value.dailyActivity),
  };
}

export function getBeastAdminProfessionalName(agentId: string) {
  const known = professionalNames[agentId];
  if (known) return known;

  const segment = agentId.split(".").at(-1) || agentId;
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatBeastAdminSessionLength(seconds: number | null) {
  if (seconds === null) return "Not measured";
  if (seconds < 60) return `${Math.round(seconds)} sec`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

export function formatBeastAdminAnalyticsRate(rate: number | null) {
  return rate === null ? "Not measured" : `${Math.round(rate * 100)}%`;
}

export function getBeastAdminAbandonmentRate({
  abandonedCount,
  conversationCount,
}: Pick<
  BeastAdminAIAnalyticsSnapshot,
  "abandonedCount" | "conversationCount"
>) {
  return conversationCount > 0 ? abandonedCount / conversationCount : 0;
}
