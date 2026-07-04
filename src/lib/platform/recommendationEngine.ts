import { numberValue } from "../financialMetrics";
import type {
  ModuleHealth,
  ModuleSummary,
  PlatformActivity,
  PlatformIntelligence,
  PlatformModule,
  PlatformNotification,
  PlatformRecommendation,
  PlatformSeverity,
  PlatformTimelineEvent,
  RecommendationPriority,
} from "./types";

type MoneyDebt = {
  id: string;
  name?: string | null;
  balance?: number | null;
  minimum_payment?: number | null;
  due_date?: number | null;
  is_archived?: boolean | null;
  assigned_income_date?: string | null;
  created_at?: string | null;
};

type MoneyBill = {
  id: string;
  name?: string | null;
  amount?: number | null;
  due_date?: number | null;
  is_archived?: boolean | null;
  next_due_date_after_payment?: string | null;
  assigned_income_date?: string | null;
  created_at?: string | null;
};

type MoneyPayment = {
  id: string;
  amount?: number | null;
  amount_paid?: number | null;
  payment_date?: string | null;
  created_at?: string | null;
};

export type MoneyIntelligenceInput = {
  activeBills: MoneyBill[];
  activeDebts: MoneyDebt[];
  monthlyIncome: number;
  monthlyBills: number;
  debtMinimums: number;
  startingCash: number;
  buffer: number;
  billPayments?: MoneyPayment[];
  debtPayments?: MoneyPayment[];
  now?: Date;
};

const priorityRank: Record<RecommendationPriority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const futureModules: {
  module: PlatformModule;
  label: string;
  summary: string;
  status?: ModuleSummary["status"];
  health?: ModuleSummary["health"];
  href?: string;
}[] = [
  {
    module: "learning",
    label: "Learning",
    status: "ready",
    health: "stable",
    href: "/dashboard/learning",
    summary: "Learning goals, courses, study rhythm, and achievements have a foundation workspace.",
  },
  {
    module: "health",
    label: "Health",
    summary: "Health signals will contribute recommendations when the module is live.",
  },
  {
    module: "home",
    label: "Home",
    summary: "Home tasks and maintenance intelligence are reserved.",
  },
  {
    module: "projects",
    label: "Projects",
    summary: "Project milestones and blockers are reserved.",
  },
  {
    module: "documents",
    label: "Documents",
    summary: "Document and upload intelligence is reserved.",
  },
];

export function sortRecommendations(
  recommendations: PlatformRecommendation[]
) {
  return [...recommendations].sort((a, b) => {
    const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return a.title.localeCompare(b.title);
  });
}

function dateFromBillDueDate(bill: MoneyBill, now: Date) {
  if (bill.next_due_date_after_payment) {
    return new Date(bill.next_due_date_after_payment);
  }

  const safeDay = Math.min(Math.max(Number(bill.due_date || 1), 1), 28);
  const candidate = new Date(now.getFullYear(), now.getMonth(), safeDay);

  if (candidate < now) {
    return new Date(now.getFullYear(), now.getMonth() + 1, safeDay);
  }

  return candidate;
}

function dateFromDebtDueDate(debt: MoneyDebt, now: Date) {
  const safeDay = Math.min(Math.max(Number(debt.due_date || 1), 1), 28);
  const candidate = new Date(now.getFullYear(), now.getMonth(), safeDay);

  if (candidate < now) {
    return new Date(now.getFullYear(), now.getMonth() + 1, safeDay);
  }

  return candidate;
}

function daysUntil(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function createRecommendation(
  recommendation: Omit<
    PlatformRecommendation,
    "confidence" | "dismissible" | "completed"
  > & {
    dismissible?: boolean;
    completed?: boolean;
  }
): PlatformRecommendation {
  return {
    ...recommendation,
    confidence: "reserved",
    dismissible: recommendation.dismissible ?? true,
    completed: recommendation.completed ?? false,
  };
}

function createNotification(
  notification: Omit<PlatformNotification, "timestamp"> & { timestamp?: string },
  now: Date
): PlatformNotification {
  return {
    timestamp: notification.timestamp || now.toISOString(),
    ...notification,
  };
}

function getMoneyHealth(input: MoneyIntelligenceInput): ModuleHealth {
  if (input.startingCash < input.buffer) return "critical";
  if (input.monthlyIncome > 0 && input.monthlyBills > input.monthlyIncome) {
    return "watch";
  }
  return "stable";
}

export function buildMoneyIntelligence(
  input: MoneyIntelligenceInput
): PlatformIntelligence {
  const now = input.now || new Date();
  const recommendations: PlatformRecommendation[] = [];
  const notifications: PlatformNotification[] = [];
  const activities: PlatformActivity[] = [];
  const timelineEvents: PlatformTimelineEvent[] = [];
  const billsDueWithinThreeDays = input.activeBills
    .map((bill) => ({ bill, dueDate: dateFromBillDueDate(bill, now) }))
    .filter((item) => daysUntil(item.dueDate, now) <= 3)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  for (const { bill, dueDate } of billsDueWithinThreeDays.slice(0, 3)) {
    const billName = bill.name || "bill";
    recommendations.push(
      createRecommendation({
        id: `money-bill-due-${bill.id}`,
        module: "money",
        priority: daysUntil(dueDate, now) <= 1 ? "Critical" : "High",
        severity: daysUntil(dueDate, now) <= 1 ? "critical" : "warning",
        title: `Pay ${billName} before ${formatShortDate(dueDate)}.`,
        summary: `${billName} is due within ${Math.max(
          daysUntil(dueDate, now),
          0
        )} day${daysUntil(dueDate, now) === 1 ? "" : "s"}.`,
        reason: "Money has a recurring bill due within 3 days.",
        recommendedAction: "Open Cash Flow and confirm payment funding.",
        estimatedBenefit: "Avoid missed or rushed bill payments.",
        actionUrl: "/dashboard/money/cashflow#bills",
      })
    );
  }

  if (input.startingCash < input.buffer) {
    recommendations.push(
      createRecommendation({
        id: "money-cash-buffer-below-target",
        module: "money",
        priority: "Critical",
        severity: "critical",
        title: "Cash buffer is below target.",
        summary: "Tracked cash is below the configured Money buffer.",
        reason: "Cash buffer protection is one of the core BeastMoney guardrails.",
        recommendedAction: "Review near-term bills before optional payments.",
        estimatedBenefit: "Protect short-term liquidity.",
        actionUrl: "/dashboard/money/cashflow",
      })
    );
  }

  if (input.monthlyIncome > 0 && input.monthlyBills > input.monthlyIncome) {
    recommendations.push(
      createRecommendation({
        id: "money-bills-exceed-income",
        module: "money",
        priority: "High",
        severity: "warning",
        title: "Monthly bills exceed normalized monthly income.",
        summary: "Known recurring bills are higher than normalized recurring income.",
        reason: "Monthly recurring income and bills are compared using the shared financial metrics normalizer.",
        recommendedAction: "Review bills and income timing in Cash Flow.",
        estimatedBenefit: "Find pressure before it becomes a cash shortfall.",
        actionUrl: "/dashboard/money/cashflow",
      })
    );
  }

  if (input.activeDebts.length > 0) {
    recommendations.push(
      createRecommendation({
        id: "money-review-debt-strategy",
        module: "money",
        priority: "Medium",
        severity: "info",
        title: "Review the next debt payoff move.",
        summary: `${input.activeDebts.length} active debt${
          input.activeDebts.length === 1 ? "" : "s"
        } are tracked in Money.`,
        reason: "Debt strategy and Velocity planning are active Money capabilities.",
        recommendedAction: "Open Debt Strategy or Velocity Planner.",
        estimatedBenefit: "Keep payoff decisions visible in the daily command center.",
        actionUrl: "/dashboard/money/debts",
      })
    );
  }

  if (billsDueWithinThreeDays.length > 0) {
    notifications.push(
      createNotification(
        {
          id: "money-bills-due-soon",
          title: "Bills due within 3 days",
          module: "money",
          severity: "warning",
          actionUrl: "/dashboard/money/cashflow#bills",
          summary: `${billsDueWithinThreeDays.length} bill${
            billsDueWithinThreeDays.length === 1 ? "" : "s"
          } need attention soon.`,
        },
        now
      )
    );
  }

  if (input.startingCash < input.buffer) {
    notifications.push(
      createNotification(
        {
          id: "money-buffer-alert",
          title: "Cash buffer below target",
          module: "money",
          severity: "critical",
          actionUrl: "/dashboard/money/cashflow",
          summary: "Money recommends reviewing short-term liquidity.",
        },
        now
      )
    );
  }

  for (const payment of [...(input.billPayments || []), ...(input.debtPayments || [])]
    .slice(0, 4)) {
    const amount = numberValue(payment.amount_paid ?? payment.amount);
    activities.push({
      id: `money-payment-${payment.id}`,
      module: "money",
      title: "Payment recorded",
      summary: amount > 0 ? `Recorded payment of $${amount.toFixed(2)}.` : "Payment activity recorded.",
      timestamp: payment.payment_date || payment.created_at || now.toISOString(),
      actionUrl: "/dashboard/money/cashflow",
    });
  }

  for (const bill of input.activeBills.filter((item) => item.assigned_income_date).slice(0, 3)) {
    activities.push({
      id: `money-bill-assignment-${bill.id}`,
      module: "money",
      title: "Bill assigned to income",
      summary: `${bill.name || "Bill"} is assigned to ${bill.assigned_income_date}.`,
      timestamp: bill.created_at || now.toISOString(),
      actionUrl: "/dashboard/money/cashflow",
    });
  }

  for (const debt of input.activeDebts.filter((item) => item.assigned_income_date).slice(0, 3)) {
    activities.push({
      id: `money-debt-assignment-${debt.id}`,
      module: "money",
      title: "Debt payment assigned to income",
      summary: `${debt.name || "Debt"} is assigned to ${debt.assigned_income_date}.`,
      timestamp: debt.created_at || now.toISOString(),
      actionUrl: "/dashboard/money/cashflow",
    });
  }

  for (const { bill, dueDate } of input.activeBills
    .map((bill) => ({ bill, dueDate: dateFromBillDueDate(bill, now) }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 4)) {
    timelineEvents.push({
      id: `money-bill-event-${bill.id}`,
      module: "money",
      title: bill.name || "Upcoming bill",
      summary: `$${numberValue(bill.amount).toFixed(2)} due ${formatShortDate(dueDate)}.`,
      timestamp: dueDate.toISOString(),
      actionUrl: "/dashboard/money/cashflow",
    });
  }

  for (const debt of input.activeDebts.slice(0, 3)) {
    const dueDate = dateFromDebtDueDate(debt, now);
    timelineEvents.push({
      id: `money-debt-event-${debt.id}`,
      module: "money",
      title: `${debt.name || "Debt"} payment`,
      summary: `$${numberValue(debt.minimum_payment).toFixed(2)} minimum payment.`,
      timestamp: dueDate.toISOString(),
      actionUrl: "/dashboard/money/debts",
    });
  }

  const sortedRecommendations = sortRecommendations(recommendations);
  const alertCount = notifications.filter(
    (notification) => notification.severity !== "info"
  ).length;
  const moduleSummary: ModuleSummary = {
    module: "money",
    label: "Money",
    status: "live",
    health: getMoneyHealth(input),
    alerts: alertCount,
    recommendations: sortedRecommendations.length,
    activityCount: activities.length,
    summary: "Money contributes live bills, income, debt, payment, and assignment signals.",
    href: "/dashboard/money",
  };

  return {
    recommendations: sortedRecommendations,
    notifications,
    moduleSummaries: [moduleSummary],
    activities,
    timelineEvents,
  };
}

export function buildPlaceholderModuleSummaries(): ModuleSummary[] {
  return futureModules.map((item) => ({
    module: item.module,
    label: item.label,
    status: item.status || "coming_soon",
    health: item.health || "pending",
    alerts: 0,
    recommendations: 0,
    activityCount: 0,
    summary: item.summary,
    href: item.href,
  }));
}

export function buildBeastOSIntelligence(input: MoneyIntelligenceInput) {
  const money = buildMoneyIntelligence(input);

  return {
    ...money,
    moduleSummaries: [
      ...money.moduleSummaries,
      ...buildPlaceholderModuleSummaries(),
    ],
  };
}

export function buildLearningFoundationIntelligence(
  now = new Date()
): PlatformIntelligence {
  const recommendation = createRecommendation({
    id: "learning-select-primary-goal",
    module: "learning",
    priority: "Medium",
    severity: "info",
    title: "Choose a primary learning goal.",
    summary: "BeastLearning is ready to organize goals, courses, study rhythm, and achievements.",
    reason: "A focused goal gives future tutoring and recommendation layers a clear starting point.",
    recommendedAction: "Open Learning Goals and pick the course or skill that matters most right now.",
    estimatedBenefit: "Creates a durable learning context for future module intelligence.",
    actionUrl: "/dashboard/learning",
  });

  return {
    recommendations: sortRecommendations([recommendation]),
    notifications: [
      createNotification(
        {
          id: "learning-workspace-ready",
          title: "BeastLearning workspace ready",
          module: "learning",
          severity: "info",
          actionUrl: "/dashboard/learning",
          summary: "Learning can now contribute goals, course progress, study sessions, and achievements.",
        },
        now
      ),
    ],
    moduleSummaries: [
      {
        module: "learning",
        label: "Learning",
        status: "ready",
        health: "stable",
        alerts: 0,
        recommendations: 1,
        activityCount: 1,
        summary: "Learning foundation is active with profile, goals, courses, progress, and achievement surfaces.",
        href: "/dashboard/learning",
      },
    ],
    activities: [
      {
        id: "learning-foundation-initialized",
        module: "learning",
        title: "Learning foundation initialized",
        summary: "The first BeastLearning workspace is ready for future tutoring and course data.",
        timestamp: now.toISOString(),
        actionUrl: "/dashboard/learning",
      },
    ],
    timelineEvents: [
      {
        id: "learning-session-foundation",
        module: "learning",
        title: "Today's learning session",
        summary: "A reusable study block is reserved for the active learner.",
        timestamp: now.toISOString(),
        actionUrl: "/dashboard/learning",
      },
    ],
  };
}
