import {
  calculateObservationPriority,
  createObservationEvidenceSignature,
  createObservationFingerprint,
  sharedAgentActionTools,
  SharedObservationIntelligence,
  type Observation,
  type ObservationAssessment,
  type ObservationDetector,
  type ObservationDraft,
  type ObservationEvidenceItem,
  type ObservationSeverity,
  type ObservationType,
} from "./platform/agents";

const specialistId = "beastmoney.money-coach";

export type MoneyObservationBill = {
  id?: string;
  name: string;
  amount: number;
  dueDate: string;
  status?: string;
  incomePot?: string;
};

export type MoneyObservationDebt = {
  id?: string;
  name: string;
  balance: number;
  minimumPayment: number;
  interestRate: number;
  minimumPaymentKnown?: boolean;
  interestRateKnown?: boolean;
  utilization?: number;
};

export type MoneyObservationSnapshot = {
  capturedAt: string;
  monthlyIncome: number;
  monthlyOutflow: number;
  projectedSurplus: number;
  currentCash: number;
  cashBuffer: number;
  totalDebt: number;
  utilization?: number;
  bills?: readonly MoneyObservationBill[];
  debts?: readonly MoneyObservationDebt[];
  velocity?: {
    recoveryMonths?: number;
    protectedReserve?: number;
    availableCredit?: number;
    modeledBenefit?: number;
    assumptionsCurrent?: boolean;
  };
  retirement?: {
    balance?: number;
    contribution?: number;
    targetDate?: string;
    updatedAt?: string;
  };
  paymentConfigurations?: readonly {
    obligationName: string;
    strategyId: string;
    complete: boolean;
    reviewMessages: readonly string[];
  }[];
};

export type MoneyObservationData = {
  current: MoneyObservationSnapshot;
  history: readonly MoneyObservationSnapshot[];
};

type DraftValues = {
  fingerprintParts: readonly (string | number | undefined)[];
  category: string;
  type: ObservationType;
  title: string;
  summary: string;
  detail: string;
  whyNoticed: string;
  whatChanged?: string;
  whyItMayMatter?: string;
  ruleId: string;
  ruleDescription: string;
  evidence: ObservationEvidenceItem[];
  severity: ObservationSeverity;
  urgency: number;
  materiality: number;
  relevance: number;
  actionability: number;
  confidence?: number;
  workspaceTarget?: string;
  materiallyChanged?: boolean;
};

function draft(context: { asOf: string }, values: DraftValues): ObservationDraft {
  const confidence = values.confidence ?? 0.9;
  const ranked = calculateObservationPriority({
    urgency: values.urgency,
    materiality: values.materiality,
    memberRelevance: values.relevance,
    actionability: values.actionability,
    confidence,
  });
  const assessment: ObservationAssessment = {
    ...ranked,
    severity: values.severity,
    confidence,
    urgency: values.urgency,
    materiality: values.materiality,
    memberRelevance: values.relevance,
    actionability: values.actionability,
  };
  const tool = values.workspaceTarget ? sharedAgentActionTools.findNavigationByTarget(values.workspaceTarget) : undefined;
  const action = tool ? sharedAgentActionTools.prepare({
    toolId: tool.id,
    specialistId,
    grantedPermissions: [tool.permission],
    actionId: `observation:${values.ruleId}`,
  }) : undefined;
  return {
    fingerprint: createObservationFingerprint([specialistId, ...values.fingerprintParts]),
    evidenceSignature: createObservationEvidenceSignature(values.evidence),
    domain: "money",
    category: values.category,
    type: values.type,
    time: { observedAt: context.asOf, periodLabel: "Current personal financial review" },
    evidence: values.evidence,
    provenance: {
      ruleId: values.ruleId,
      ruleDescription: values.ruleDescription,
      sourceSystems: Array.from(new Set(values.evidence.map((item) => item.source))),
      supportingRecordIds: values.evidence.flatMap((item) => item.recordId ? [item.recordId] : []),
      retrievedAt: context.asOf,
      freshness: "current",
      limitations: ["The observation uses only the authenticated BeastMoney records supplied for this review."],
    },
    assessment,
    presentation: {
      title: values.title,
      summary: values.summary,
      detail: values.detail,
      whyNoticed: values.whyNoticed,
      whatChanged: values.whatChanged,
      whyItMayMatter: values.whyItMayMatter,
      workspaceTarget: values.workspaceTarget,
      action,
    },
    relatedEntityIds: values.evidence.flatMap((item) => item.recordId ? [item.recordId] : []),
    materiallyChanged: values.materiallyChanged,
  };
}

function fact(id: string, label: string, value: string | number | boolean | null, source: string, observedAt: string, recordId?: string): ObservationEvidenceItem {
  return { id, kind: "fact", label, value, source, observedAt, recordId };
}

const cashFlowDetector: ObservationDetector<MoneyObservationData> = {
  id: "money.cash-flow-observations",
  specialistId,
  domain: "money",
  supportedTypes: ["Change", "Trend", "Anomaly", "Improvement", "Regression", "Risk"],
  detect(context) {
    const current = context.data.current;
    const prior = context.data.history[0];
    if (!prior) return { observations: [] };
    const observations: ObservationDraft[] = [];
    const threshold = context.thresholds?.cashFlowChangePercent ?? 10;
    const change = current.projectedSurplus - prior.projectedSurplus;
    const percent = prior.projectedSurplus === 0 ? undefined : Math.abs(change / prior.projectedSurplus) * 100;
    if (percent !== undefined && percent >= threshold) {
      const improving = change > 0;
      const evidence = [
        fact("current-surplus", "Current projected surplus", current.projectedSurplus, "beastmoney.cash-flow", current.capturedAt),
        fact("baseline-surplus", "Prior projected surplus", prior.projectedSurplus, "beastmoney.cash-flow", prior.capturedAt),
      ];
      observations.push(draft(context, {
        fingerprintParts: ["cash-flow", "projected-surplus-change"],
        category: "Cash flow",
        type: improving ? "Improvement" : "Regression",
        title: `Projected cash flow ${improving ? "improved" : "declined"}`,
        summary: `Projected monthly surplus changed by ${Math.abs(change).toFixed(2)} from the member's prior snapshot.`,
        detail: `The current projected surplus is ${current.projectedSurplus.toFixed(2)}, compared with ${prior.projectedSurplus.toFixed(2)} previously.`,
        whyNoticed: `The change exceeded the configured ${threshold}% personal-change threshold.`,
        whatChanged: `Projected surplus moved ${improving ? "up" : "down"} by ${Math.abs(change).toFixed(2)}.`,
        whyItMayMatter: improving ? "More cash may remain after known obligations." : "Less cash may remain after known obligations.",
        ruleId: "money.cash-flow.surplus-change",
        ruleDescription: "Compare current projected monthly surplus with the member's immediately prior snapshot.",
        evidence,
        severity: improving ? "positive" : "important",
        urgency: improving ? 25 : 75,
        materiality: Math.min(100, percent),
        relevance: 90,
        actionability: 75,
        workspaceTarget: "/dashboard/money/cashflow",
        materiallyChanged: true,
      }));
    }
    const recent = [current, ...context.data.history].slice(0, 3);
    if (recent.length === 3 && recent[0].projectedSurplus < recent[1].projectedSurplus && recent[1].projectedSurplus < recent[2].projectedSurplus) {
      const evidence = recent.map((item, index) => fact(`surplus-${index}`, `Projected surplus snapshot ${index + 1}`, item.projectedSurplus, "beastmoney.cash-flow", item.capturedAt));
      observations.push(draft(context, {
        fingerprintParts: ["cash-flow", "declining-surplus-trend"],
        category: "Cash flow",
        type: "Trend",
        title: "Projected surplus has declined across three snapshots",
        summary: "The member's own recent snapshots show a sustained downward direction.",
        detail: "This is a directional trend in saved projected surplus, not a forecast of what must happen next.",
        whyNoticed: "Three consecutive personal snapshots moved in the same direction.",
        whyItMayMatter: "A sustained decline can reduce flexibility if it continues.",
        ruleId: "money.cash-flow.declining-trend",
        ruleDescription: "Detect three consecutive decreases in projected monthly surplus.",
        evidence,
        severity: "caution",
        urgency: 65,
        materiality: 70,
        relevance: 90,
        actionability: 70,
        workspaceTarget: "/dashboard/money/cashflow",
      }));
    }
    return { observations };
  },
};

const billDetector: ObservationDetector<MoneyObservationData> = {
  id: "money.bill-observations",
  specialistId,
  domain: "money",
  supportedTypes: ["Change", "Missing information", "Inconsistency", "Risk"],
  detect(context) {
    const current = context.data.current;
    const bills = current.bills;
    if (!bills) return { observations: [] };
    const observations: ObservationDraft[] = [];
    for (const bill of bills.filter((item) => !item.incomePot)) {
      const recordId = bill.id || bill.name;
      const evidence = [fact("missing-assignment", "Income Pot assigned", false, "beastmoney.bills", current.capturedAt, recordId)];
      observations.push(draft(context, {
        fingerprintParts: ["bill", recordId, "missing-income-pot"],
        category: "Bills",
        type: "Missing information",
        title: `${bill.name} has no Income Pot assignment`,
        summary: "A saved bill is missing its funding assignment.",
        detail: `${bill.name} cannot be included in assignment-specific planning until an Income Pot is selected.`,
        whyNoticed: "The bill record has no Income Pot value.",
        whyItMayMatter: "Unassigned obligations can make income planning incomplete.",
        ruleId: "money.bills.missing-income-pot",
        ruleDescription: "Identify active bill records without an Income Pot assignment.",
        evidence,
        severity: "caution",
        urgency: 55,
        materiality: 55,
        relevance: 80,
        actionability: 95,
        workspaceTarget: "/dashboard/money/cashflow#bills",
      }));
    }
    const priorBills = context.data.history[0]?.bills;
    if (priorBills) {
      const priorByName = new Map(priorBills.map((item) => [item.name.toLowerCase(), item]));
      for (const bill of bills) {
        const prior = priorByName.get(bill.name.toLowerCase());
        if (!prior) continue;
        const threshold = context.thresholds?.billAmountChangePercent ?? 10;
        const percent = prior.amount === 0 ? undefined : Math.abs((bill.amount - prior.amount) / prior.amount) * 100;
        if (percent === undefined || percent < threshold) continue;
        const evidence = [
          fact("current-amount", "Current amount", bill.amount, "beastmoney.bills", current.capturedAt, bill.id || bill.name),
          fact("prior-amount", "Prior amount", prior.amount, "beastmoney.bills", context.data.history[0].capturedAt, prior.id || prior.name),
        ];
        observations.push(draft(context, {
          fingerprintParts: ["bill", bill.id || bill.name, "amount-change"],
          category: "Bills",
          type: "Change",
          title: `${bill.name} amount changed`,
          summary: `The saved amount changed from ${prior.amount.toFixed(2)} to ${bill.amount.toFixed(2)}.`,
          detail: "This compares two saved records for the same bill.",
          whyNoticed: `The change exceeded the configured ${threshold}% personal-change threshold.`,
          whatChanged: `The amount changed by ${Math.abs(bill.amount - prior.amount).toFixed(2)}.`,
          whyItMayMatter: "A recurring bill change can alter available monthly cash.",
          ruleId: "money.bills.amount-change",
          ruleDescription: "Compare current and prior amounts for the same saved bill.",
          evidence,
          severity: bill.amount > prior.amount ? "caution" : "positive",
          urgency: 55,
          materiality: Math.min(100, percent),
          relevance: 80,
          actionability: 75,
          workspaceTarget: "/dashboard/money/cashflow#bills",
          materiallyChanged: true,
        }));
      }
    }
    return { observations };
  },
};

const debtDetector: ObservationDetector<MoneyObservationData> = {
  id: "money.debt-observations",
  specialistId,
  domain: "money",
  supportedTypes: ["Change", "Missing information", "Risk", "Improvement", "Regression", "Milestone"],
  detect(context) {
    const current = context.data.current;
    const debts = current.debts;
    const observations: ObservationDraft[] = [];
    for (const debt of debts || []) {
      const missing = [
        ...(debt.interestRateKnown === false ? ["interest rate"] : []),
        ...(debt.minimumPaymentKnown === false ? ["minimum payment"] : []),
      ];
      if (!missing.length) continue;
      const missingLabel =
        missing.length === 2
          ? "interest rate and minimum payment"
          : missing[0];
      const impact =
        missing.length === 2
          ? "Without an APR, interest cost cannot be modeled; without a minimum payment, required monthly cash and payoff timing may be incomplete."
          : missing[0] === "interest rate"
            ? "Without an APR, interest cost and rate-based payoff comparisons cannot be modeled reliably."
            : "Without a minimum payment, required monthly cash and baseline payoff timing may be incomplete.";
      const evidence = missing.map((field) =>
        fact(
          `missing-${field}`,
          `${field} recorded`,
          null,
          "beastmoney.debts",
          current.capturedAt,
          debt.id || debt.name
        )
      );
      observations.push(draft(context, {
        fingerprintParts: ["debt", debt.id || debt.name, "missing-fields"],
        category: "Debts",
        type: "Missing information",
        title: `${debt.name} needs ${missingLabel} for planning`,
        summary: `${debt.name} does not have a recorded ${missingLabel}.`,
        detail: impact,
        whyNoticed: `The ${missingLabel} field ${missing.length === 1 ? "is" : "are"} null, undefined, or blank. Numeric zero is treated as known information.`,
        whyItMayMatter: impact,
        ruleId: "money.debts.missing-planning-fields",
        ruleDescription: "Check whether debt rate and minimum-payment fields are known; numeric zero is valid.",
        evidence,
        severity: "important",
        urgency: 60,
        materiality: 70,
        relevance: 85,
        actionability: 95,
        workspaceTarget: "/dashboard/money/debts",
      }));
    }
    const prior = context.data.history[0];
    if (prior && current.totalDebt !== prior.totalDebt) {
      const difference = current.totalDebt - prior.totalDebt;
      const evidence = [
        fact("current-total-debt", "Current total debt", current.totalDebt, "beastmoney.debts", current.capturedAt),
        fact("prior-total-debt", "Prior total debt", prior.totalDebt, "beastmoney.debts", prior.capturedAt),
      ];
      observations.push(draft(context, {
        fingerprintParts: ["debts", "total-balance-change"],
        category: "Debts",
        type: difference < 0 ? "Improvement" : "Regression",
        title: `Total tracked debt ${difference < 0 ? "decreased" : "increased"}`,
        summary: `Total debt changed by ${Math.abs(difference).toFixed(2)}.`,
        detail: `The current total is ${current.totalDebt.toFixed(2)}, compared with ${prior.totalDebt.toFixed(2)} previously.`,
        whyNoticed: "The total of current saved debt balances differs from the prior personal snapshot.",
        whatChanged: `Tracked debt moved ${difference < 0 ? "down" : "up"} by ${Math.abs(difference).toFixed(2)}.`,
        whyItMayMatter: difference < 0 ? "This is measurable progress in tracked balances." : "An increase can extend payoff timing or increase interest cost.",
        ruleId: "money.debts.total-balance-change",
        ruleDescription: "Compare total tracked debt with the member's prior snapshot.",
        evidence,
        severity: difference < 0 ? "positive" : "important",
        urgency: difference < 0 ? 20 : 70,
        materiality: prior.totalDebt ? Math.min(100, Math.abs(difference / prior.totalDebt) * 100) : 50,
        relevance: 90,
        actionability: 70,
        workspaceTarget: "/dashboard/money/debts",
        materiallyChanged: true,
      }));
    }
    return { observations };
  },
};

const strategyAndDataDetector: ObservationDetector<MoneyObservationData> = {
  id: "money.strategy-and-data-observations",
  specialistId,
  domain: "money",
  supportedTypes: ["Change", "Missing information", "Inconsistency", "Risk", "Opportunity"],
  detect(context) {
    const current = context.data.current;
    const observations: ObservationDraft[] = [];
    if (current.velocity && current.velocity.assumptionsCurrent === false) {
      const evidence = [fact("velocity-assumptions-current", "Velocity assumptions current", false, "beastmoney.velocity", current.capturedAt)];
      observations.push(draft(context, {
        fingerprintParts: ["velocity", "stale-assumptions"],
        category: "Velocity",
        type: "Risk",
        title: "Velocity assumptions need review",
        summary: "The saved strategy assumptions are not marked current.",
        detail: "A modeled benefit should not be treated as current until its credit terms and recovery assumptions are reviewed.",
        whyNoticed: "The Velocity record explicitly marks its assumptions as not current.",
        whyItMayMatter: "Stale credit terms can change both expected benefit and risk.",
        ruleId: "money.velocity.stale-assumptions",
        ruleDescription: "Flag a Velocity model whose saved assumptions are not current.",
        evidence,
        severity: "important",
        urgency: 75,
        materiality: 80,
        relevance: 85,
        actionability: 90,
        workspaceTarget: "/dashboard/money/velocity",
      }));
    }
    if (current.retirement) {
      const missing = [
        ...(current.retirement.balance === undefined ? ["balance"] : []),
        ...(current.retirement.contribution === undefined ? ["contribution"] : []),
        ...(!current.retirement.targetDate ? ["target date"] : []),
      ];
      if (missing.length) {
        const evidence = missing.map((field) => fact(`retirement-${field}`, `${field} present`, false, "beastmoney.retirement", current.capturedAt));
        observations.push(draft(context, {
          fingerprintParts: ["retirement", "missing-inputs"],
          category: "Retirement",
          type: "Missing information",
          title: "Retirement planning inputs are incomplete",
          summary: `Missing ${missing.join(", ")}.`,
          detail: "The retirement record exists but lacks inputs needed for a current planning view.",
          whyNoticed: "Required values are absent from the saved retirement record.",
          whyItMayMatter: "Incomplete inputs limit retirement projections and comparisons.",
          ruleId: "money.retirement.missing-inputs",
          ruleDescription: "Check an existing retirement record for balance, contribution, and target date.",
          evidence,
          severity: "caution",
          urgency: 35,
          materiality: 55,
          relevance: 70,
          actionability: 95,
          workspaceTarget: "/dashboard/money/retirement",
        }));
      }
    }
    const incompletePaymentConfigurations =
      current.paymentConfigurations?.filter(
        (configuration) => !configuration.complete
      ) || [];
    if (incompletePaymentConfigurations.length) {
      const evidence = incompletePaymentConfigurations.map(
        (configuration, index) =>
          fact(
            `payment-configuration-${index}`,
            "Incomplete payment configuration",
            configuration.obligationName,
            "beastmoney.payment-configuration",
            current.capturedAt
          )
      );
      observations.push(draft(context, {
        fingerprintParts: ["payment-configuration", "missing-inputs"],
        category: "Payment configuration",
        type: "Missing information",
        title: "Payment workflows need configuration",
        summary: `${incompletePaymentConfigurations.length} active obligation${incompletePaymentConfigurations.length === 1 ? "" : "s"} do not identify the payment account, funding account, and strategy.`,
        detail: "Each obligation needs all three fields before BeastMoney can explain the complete movement of funds.",
        whyNoticed: "One or more current obligation records have an incomplete normalized payment configuration.",
        whyItMayMatter: "Incomplete payment paths can make cash-flow and Velocity reviews less reliable.",
        ruleId: "money.payment-configuration.missing-inputs",
        ruleDescription: "Check every active obligation for a payment account, funding account, and funding strategy.",
        evidence,
        severity: "caution",
        urgency: 45,
        materiality: 65,
        relevance: 85,
        actionability: 95,
        workspaceTarget: "/dashboard/money/cashflow#funding-sources",
      }));
    }
    const workflowReviews =
      current.paymentConfigurations?.filter(
        (configuration) => configuration.reviewMessages.length > 0
      ) || [];
    if (workflowReviews.length) {
      const evidence = workflowReviews.map((configuration, index) =>
        fact(
          `payment-workflow-review-${index}`,
          configuration.obligationName,
          configuration.reviewMessages.join(" "),
          "beastmoney.payment-configuration",
          current.capturedAt
        )
      );
      observations.push(draft(context, {
        fingerprintParts: ["payment-configuration", "workflow-review"],
        category: "Payment configuration",
        type: "Opportunity",
        title: "Payment workflows have review opportunities",
        summary: `${workflowReviews.length} payment workflow${workflowReviews.length === 1 ? "" : "s"} may need a clearer transfer or Velocity setup.`,
        detail: "The configured account relationship and selected strategy should describe the same movement of funds.",
        whyNoticed: "The deterministic payment-configuration review found a strategy or account mismatch.",
        whyItMayMatter: "Correct configuration helps Cash Flow and Money Coach distinguish draft accounts from funding origins.",
        ruleId: "money.payment-configuration.workflow-review",
        ruleDescription: "Compare normalized payment and funding accounts with the selected configuration-driven strategy.",
        evidence,
        severity: "informational",
        urgency: 30,
        materiality: 55,
        relevance: 80,
        actionability: 90,
        workspaceTarget: "/dashboard/money/cashflow#funding-sources",
      }));
    }
    const duplicateBillNames = current.bills
      ? Array.from(new Set(current.bills.map((item) => item.name.trim().toLowerCase()).filter((name, index, all) => all.indexOf(name) !== index)))
      : [];
    for (const name of duplicateBillNames) {
      const matching = current.bills!.filter((item) => item.name.trim().toLowerCase() === name);
      const evidence = matching.map((item, index) => fact(`duplicate-${index}`, "Duplicate bill name", item.name, "beastmoney.bills", current.capturedAt, item.id || item.name));
      observations.push(draft(context, {
        fingerprintParts: ["data-quality", "duplicate-bill", name],
        category: "Data quality",
        type: "Inconsistency",
        title: `Possible duplicate bill: ${matching[0].name}`,
        summary: "Multiple current bill records share the same normalized name.",
        detail: "This is a possible duplicate, not proof that either record is incorrect.",
        whyNoticed: "Two or more saved bill names match after case and whitespace normalization.",
        whyItMayMatter: "Duplicate obligations can overstate monthly outflow.",
        ruleId: "money.data.duplicate-bill-name",
        ruleDescription: "Compare normalized current bill names for duplicates.",
        evidence,
        severity: "caution",
        urgency: 50,
        materiality: 65,
        relevance: 80,
        actionability: 95,
        confidence: 0.75,
        workspaceTarget: "/dashboard/money/cashflow#bills",
      }));
    }
    return { observations };
  },
};

export const moneyCoachObservationDetectors = [
  cashFlowDetector,
  billDetector,
  debtDetector,
  strategyAndDataDetector,
] as const;

export function createMoneyCoachObservationIntelligence() {
  const engine = new SharedObservationIntelligence();
  moneyCoachObservationDetectors.forEach((detector) => engine.registerDetector(detector));
  return engine;
}

export function buildMoneyCoachObservations(data: MoneyObservationData, ownerId: string, asOf: string): Observation[] {
  const engine = createMoneyCoachObservationIntelligence();
  return engine.analyze({
    ownerId,
    specialistId,
    asOf,
    data,
    authorizedDomains: ["money"],
  });
}
