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

export type BeastAdminExecutiveMetricsFailureKind =
  | "rpc_unavailable"
  | "wrong_environment"
  | "permission_denied"
  | "rpc_contract_mismatch"
  | "schema_cache_stale"
  | "invalid_response"
  | "unexpected";

export type BeastAdminExecutiveMetricsDiagnostic = {
  kind: BeastAdminExecutiveMetricsFailureKind;
  title: string;
  summary: string;
  action: string;
  projectRef: string;
  code: string | null;
  technicalDetails: string[];
};

type ExecutiveMetricsErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

const executiveMetricsMigration =
  "20260726000700_add_beast_admin_executive_metrics.sql";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeDiagnosticValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

function readExecutiveMetricsError(error: unknown) {
  const source: ExecutiveMetricsErrorLike = isRecord(error) ? error : {};
  return {
    code: safeDiagnosticValue(source.code),
    message:
      safeDiagnosticValue(source.message) ||
      (error instanceof Error ? safeDiagnosticValue(error.message) : ""),
    details: safeDiagnosticValue(source.details),
    hint: safeDiagnosticValue(source.hint),
  };
}

export function getBeastAdminSupabaseProjectRef(url: string | undefined) {
  if (!url) return "Not configured";

  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith(".supabase.co")
      ? hostname.slice(0, -".supabase.co".length)
      : hostname;
  } catch {
    return "Invalid Supabase URL";
  }
}

export function diagnoseBeastAdminExecutiveMetricsFailure(
  error: unknown,
  options: {
    projectRef?: string;
    expectedProjectRef?: string;
  } = {}
): BeastAdminExecutiveMetricsDiagnostic {
  const { code, message, details, hint } = readExecutiveMetricsError(error);
  const projectRef = options.projectRef || "Unknown";
  const technicalDetails = [
    code ? `API code: ${code}` : "",
    message ? `Message: ${message}` : "",
    details ? `Details: ${details}` : "",
    hint ? `Hint: ${hint}` : "",
  ].filter(Boolean);

  if (
    options.expectedProjectRef &&
    projectRef !== "Unknown" &&
    projectRef !== options.expectedProjectRef
  ) {
    return {
      kind: "wrong_environment",
      title: "Executive Metrics is connected to the wrong environment",
      summary: `This application is using Supabase project ${projectRef}, but Executive Metrics was verified in ${options.expectedProjectRef}.`,
      action:
        "Correct the environment’s public Supabase URL and anon key together, then redeploy that environment.",
      projectRef,
      code: code || null,
      technicalDetails,
    };
  }

  if (
    code === "42501" ||
    /permission denied|owner access|required|not authorized/i.test(message)
  ) {
    return {
      kind: "permission_denied",
      title: "Executive Metrics access was denied",
      summary:
        "The RPC exists, but the current authenticated account or database grant did not authorize this owner-only request.",
      action:
        "Confirm the signed-in user has profiles.role = 'admin', the authenticated role has EXECUTE on the RPC, and the request includes the active owner session.",
      projectRef,
      code: code || null,
      technicalDetails,
    };
  }

  if (
    code === "PGRST202" ||
    /could not find the function public\.get_beast_admin_executive_metrics/i.test(
      message
    )
  ) {
    return {
      kind: "rpc_unavailable",
      title: "Executive Metrics RPC is unavailable in this environment",
      summary: `Supabase project ${projectRef} does not currently expose public.get_beast_admin_executive_metrics(window_days).`,
      action: `Verify that ${executiveMetricsMigration}—not the separate BA-110 account-audit migration—was applied to this project. If the migration ledger confirms it was applied, reload the PostgREST schema cache and retry.`,
      projectRef,
      code: code || null,
      technicalDetails,
    };
  }

  if (
    code === "PGRST200" ||
    code === "PGRST204" ||
    (/schema cache/i.test(message) &&
      !/does not exist|could not find the function/i.test(message))
  ) {
    return {
      kind: "schema_cache_stale",
      title: "Executive Metrics schema metadata is stale",
      summary:
        "The database object appears to exist, but the Data API cannot resolve its current contract from the PostgREST schema cache.",
      action:
        "Reload the PostgREST schema cache, then retry without restarting or redeploying the application.",
      projectRef,
      code: code || null,
      technicalDetails,
    };
  }

  if (
    code === "42883" ||
    code === "42703" ||
    code === "42P01" ||
    /function .* does not exist|column .* does not exist|relation .* does not exist/i.test(
      message
    )
  ) {
    return {
      kind: "rpc_contract_mismatch",
      title: "Executive Metrics database contract does not match",
      summary:
        "The RPC was reached, but a function, table, view, parameter, or expected column does not match the application contract.",
      action:
        "Compare the deployed RPC signature and source columns with the repository migration before creating any forward-only correction.",
      projectRef,
      code: code || null,
      technicalDetails,
    };
  }

  if (
    code === "BEAST_METRICS_INVALID_RESPONSE" ||
    /Executive Metrics response was invalid/i.test(message)
  ) {
    return {
      kind: "invalid_response",
      title: "Executive Metrics returned an invalid snapshot",
      summary:
        "The RPC responded, but its JSON shape or return types do not match the Executive Metrics contract.",
      action:
        "Compare the deployed RPC return value with BeastAdminExecutiveMetricsSnapshot. Do not substitute estimated values.",
      projectRef,
      code: code || null,
      technicalDetails,
    };
  }

  return {
    kind: "unexpected",
    title: "Executive Metrics request failed unexpectedly",
    summary:
      "BeastAdmin could not load a verified aggregate snapshot. No business values were estimated.",
    action:
      "Review the owner-only technical details below, confirm the active Supabase project, and retry after the underlying API failure is resolved.",
    projectRef,
    code: code || null,
    technicalDetails:
      technicalDetails.length > 0
        ? technicalDetails
        : ["No structured database error was returned."],
  };
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
