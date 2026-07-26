export type BeastAdminModuleAdoptionMetric = {
  moduleId: string;
  moduleLabel: string;
  memberCount: number;
  adoptionRate: number | null;
};

export type BeastAdminProfessionalMetric = {
  agentId: string;
  conversationCount: number;
  memberCount: number;
};

export type BeastAdminFeatureMetric = {
  featureId: string;
  featureLabel: string;
  usageCount: number;
  memberCount: number;
};

export type BeastAdminDailyActivityMetric = {
  date: string;
  activeMemberCount: number;
  eventCount: number;
};

export type BeastAdminExecutiveMetricsSnapshot = {
  windowDays: number;
  generatedAt: string;
  members: {
    total: number;
    newInWindow: number;
    newInPreviousWindow: number;
  };
  activity: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    trackedMemberCount: number;
    trackedEventCount: number;
    retentionEligibleMembers: number;
    retainedMembers: number;
    retentionRate: number | null;
  };
  conversations: {
    count: number;
    previousCount: number;
    messageCount: number;
  };
  moduleAdoption: BeastAdminModuleAdoptionMetric[];
  professionalUsage: BeastAdminProfessionalMetric[];
  featureUsage: BeastAdminFeatureMetric[];
  dailyActivity: BeastAdminDailyActivityMetric[];
  revenue: {
    status: "not_connected";
    monthlyRecurringRevenue: null;
    annualRecurringRevenue: null;
    evidence: string;
  };
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
  if (value === null) return null;
  const rate = nonNegativeNumber(value);
  return rate !== null && rate <= 1 ? rate : undefined;
}

function normalizeModuleAdoption(
  value: unknown
): BeastAdminModuleAdoptionMetric[] | null {
  if (!Array.isArray(value)) return null;
  const metrics = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.moduleId !== "string" ||
      typeof entry.moduleLabel !== "string"
    ) {
      return [];
    }
    const memberCount = nonNegativeNumber(entry.memberCount);
    const adoptionRate = nullableRate(entry.adoptionRate);
    if (
      !entry.moduleId.trim() ||
      !entry.moduleLabel.trim() ||
      memberCount === null ||
      adoptionRate === undefined
    ) {
      return [];
    }
    return [
      {
        moduleId: entry.moduleId.trim(),
        moduleLabel: entry.moduleLabel.trim(),
        memberCount,
        adoptionRate,
      },
    ];
  });

  return metrics.length === value.length ? metrics : null;
}

function normalizeProfessionalUsage(
  value: unknown
): BeastAdminProfessionalMetric[] | null {
  if (!Array.isArray(value)) return null;
  const metrics = value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.agentId !== "string") return [];
    const conversationCount = nonNegativeNumber(entry.conversationCount);
    const memberCount = nonNegativeNumber(entry.memberCount);
    if (
      !entry.agentId.trim() ||
      conversationCount === null ||
      memberCount === null
    ) {
      return [];
    }
    return [
      {
        agentId: entry.agentId.trim(),
        conversationCount,
        memberCount,
      },
    ];
  });

  return metrics.length === value.length ? metrics : null;
}

function normalizeFeatureUsage(
  value: unknown
): BeastAdminFeatureMetric[] | null {
  if (!Array.isArray(value)) return null;
  const metrics = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.featureId !== "string" ||
      typeof entry.featureLabel !== "string"
    ) {
      return [];
    }
    const usageCount = nonNegativeNumber(entry.usageCount);
    const memberCount = nonNegativeNumber(entry.memberCount);
    if (
      !entry.featureId.trim() ||
      !entry.featureLabel.trim() ||
      usageCount === null ||
      memberCount === null
    ) {
      return [];
    }
    return [
      {
        featureId: entry.featureId.trim(),
        featureLabel: entry.featureLabel.trim(),
        usageCount,
        memberCount,
      },
    ];
  });

  return metrics.length === value.length ? metrics : null;
}

function normalizeDailyActivity(
  value: unknown
): BeastAdminDailyActivityMetric[] | null {
  if (!Array.isArray(value)) return null;
  const metrics = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    ) {
      return [];
    }
    const activeMemberCount = nonNegativeNumber(entry.activeMemberCount);
    const eventCount = nonNegativeNumber(entry.eventCount);
    if (activeMemberCount === null || eventCount === null) return [];
    return [{ date: entry.date, activeMemberCount, eventCount }];
  });

  return metrics.length === value.length ? metrics : null;
}

export function normalizeBeastAdminExecutiveMetrics(
  value: unknown
): BeastAdminExecutiveMetricsSnapshot | null {
  if (
    !isRecord(value) ||
    !isRecord(value.members) ||
    !isRecord(value.activity) ||
    !isRecord(value.conversations) ||
    !isRecord(value.revenue) ||
    typeof value.generatedAt !== "string" ||
    Number.isNaN(Date.parse(value.generatedAt))
  ) {
    return null;
  }

  const windowDays = nonNegativeNumber(value.windowDays);
  const total = nonNegativeNumber(value.members.total);
  const newInWindow = nonNegativeNumber(value.members.newInWindow);
  const newInPreviousWindow = nonNegativeNumber(
    value.members.newInPreviousWindow
  );
  const dailyActiveUsers = nonNegativeNumber(value.activity.dailyActiveUsers);
  const weeklyActiveUsers = nonNegativeNumber(value.activity.weeklyActiveUsers);
  const trackedMemberCount = nonNegativeNumber(
    value.activity.trackedMemberCount
  );
  const trackedEventCount = nonNegativeNumber(value.activity.trackedEventCount);
  const retentionEligibleMembers = nonNegativeNumber(
    value.activity.retentionEligibleMembers
  );
  const retainedMembers = nonNegativeNumber(value.activity.retainedMembers);
  const retentionRate = nullableRate(value.activity.retentionRate);
  const conversationCount = nonNegativeNumber(value.conversations.count);
  const previousConversationCount = nonNegativeNumber(
    value.conversations.previousCount
  );
  const messageCount = nonNegativeNumber(value.conversations.messageCount);
  const moduleAdoption = normalizeModuleAdoption(value.moduleAdoption);
  const professionalUsage = normalizeProfessionalUsage(
    value.professionalUsage
  );
  const featureUsage = normalizeFeatureUsage(value.featureUsage);
  const dailyActivity = normalizeDailyActivity(value.dailyActivity);

  if (
    windowDays === null ||
    total === null ||
    newInWindow === null ||
    newInPreviousWindow === null ||
    dailyActiveUsers === null ||
    weeklyActiveUsers === null ||
    trackedMemberCount === null ||
    trackedEventCount === null ||
    retentionEligibleMembers === null ||
    retainedMembers === null ||
    retentionRate === undefined ||
    conversationCount === null ||
    previousConversationCount === null ||
    messageCount === null ||
    !moduleAdoption ||
    !professionalUsage ||
    !featureUsage ||
    !dailyActivity ||
    value.revenue.status !== "not_connected" ||
    value.revenue.monthlyRecurringRevenue !== null ||
    value.revenue.annualRecurringRevenue !== null ||
    typeof value.revenue.evidence !== "string" ||
    !value.revenue.evidence.trim()
  ) {
    return null;
  }

  return {
    windowDays,
    generatedAt: value.generatedAt,
    members: { total, newInWindow, newInPreviousWindow },
    activity: {
      dailyActiveUsers,
      weeklyActiveUsers,
      trackedMemberCount,
      trackedEventCount,
      retentionEligibleMembers,
      retainedMembers,
      retentionRate,
    },
    conversations: {
      count: conversationCount,
      previousCount: previousConversationCount,
      messageCount,
    },
    moduleAdoption,
    professionalUsage,
    featureUsage,
    dailyActivity,
    revenue: {
      status: "not_connected",
      monthlyRecurringRevenue: null,
      annualRecurringRevenue: null,
      evidence: value.revenue.evidence.trim(),
    },
  };
}

export function formatBeastAdminMetricRate(rate: number | null) {
  return rate === null ? "Not enough history" : `${Math.round(rate * 100)}%`;
}

export function getBeastAdminGrowthDelta(
  current: number,
  previous: number
): { direction: "up" | "down" | "flat"; percentage: number | null } {
  if (previous === 0) {
    return {
      direction: current > 0 ? "up" : "flat",
      percentage: current > 0 ? null : 0,
    };
  }

  const percentage = Math.round(((current - previous) / previous) * 100);
  return {
    direction: percentage > 0 ? "up" : percentage < 0 ? "down" : "flat",
    percentage,
  };
}
