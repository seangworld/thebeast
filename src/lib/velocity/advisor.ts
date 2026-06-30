import type { VelocityEngineResult } from "./types";

type AdvisorSectionId =
  | "recommendation"
  | "why"
  | "expected_result"
  | "risks"
  | "alternatives";

type AdvisorFact = {
  label: string;
  value: string;
};

export type VelocityAdvisorInput = {
  engineResult: VelocityEngineResult;
};

export type AdvisorRecommendationSection = {
  id: AdvisorSectionId;
  title: string;
  summary: string;
  items: string[];
  facts: AdvisorFact[];
};

export type VelocityAdvisorResult = {
  sections: Record<AdvisorSectionId, AdvisorRecommendationSection>;
  assumptions: string[];
  validation_errors: string[];
};

function formatMoney(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null;

  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null;

  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function section(
  id: AdvisorSectionId,
  title: string,
  summary: string,
  items: string[] = [],
  facts: AdvisorFact[] = []
): AdvisorRecommendationSection {
  return {
    id,
    title,
    summary,
    items,
    facts,
  };
}

function compactFacts(facts: Array<AdvisorFact | null>) {
  return facts.filter((fact): fact is AdvisorFact => Boolean(fact));
}

function compactItems(items: Array<string | null | undefined>) {
  return items.filter((item): item is string => Boolean(item));
}

export function buildVelocityAdvisorResult(
  engineResult: VelocityEngineResult
): VelocityAdvisorResult {
  const recommendation = engineResult.recommendation;
  const projection = engineResult.cashflow_projection;
  const targetDebt = engineResult.target_debt;
  const assumptions = [
    ...(engineResult.assumptions || []),
    ...(engineResult.risk_summary.assumptions || []),
  ].filter((item, index, list) => list.indexOf(item) === index);

  const recommendationFacts = compactFacts([
    recommendation
      ? { label: "Candidate", value: recommendation.label }
      : null,
    recommendation?.payment_amount != null
      ? {
          label: "Payment amount",
          value: formatMoney(recommendation.payment_amount) || "",
        }
      : null,
    recommendation?.debt_name
      ? { label: "Debt", value: recommendation.debt_name }
      : null,
    recommendation?.score != null
      ? { label: "Score", value: formatNumber(recommendation.score) || "" }
      : null,
    { label: "Confidence", value: formatStatus(engineResult.risk_summary.confidence) },
  ]);

  const expectedResultFacts = compactFacts([
    projection
      ? {
          label: "Projected cash before velocity payment",
          value:
            formatMoney(projection.projected_cash_before_velocity_payment) ||
            "",
        }
      : null,
    recommendation?.projected_cash_after_payment != null
      ? {
          label: "Projected cash after payment",
          value: formatMoney(recommendation.projected_cash_after_payment) || "",
        }
      : null,
    {
      label: "Available cash above buffer",
      value: formatMoney(engineResult.available_cash_above_buffer) || "",
    },
    targetDebt
      ? {
          label: "Target balance",
          value: formatMoney(targetDebt.balance) || "",
        }
      : null,
  ]);

  const alternativeItems = engineResult.alternatives.map((alternative) => {
    const paymentAmount = formatMoney(alternative.payment_amount);
    const score = formatNumber(alternative.score);
    return compactItems([
      alternative.label,
      paymentAmount ? `Payment: ${paymentAmount}` : null,
      score ? `Score: ${score}` : null,
      alternative.reason,
    ]).join(" | ");
  });

  // Future AI language hook: replace these deterministic summaries with
  // model-generated copy after the product has a safe AI request boundary.
  const sections: VelocityAdvisorResult["sections"] = {
    recommendation: section(
      "recommendation",
      "Recommendation",
      recommendation
        ? recommendation.reason
        : "No velocity recommendation was produced by the engine.",
      compactItems([
        recommendation?.rationale?.[0],
        targetDebt?.name ? `Target debt: ${targetDebt.name}` : null,
      ]),
      recommendationFacts
    ),
    why: section(
      "why",
      "Why",
      engineResult.rationale?.[0] ||
        engineResult.risk_summary.reasons[0] ||
        "The engine did not provide a rationale.",
      compactItems([
        ...(engineResult.rationale || []),
        ...(recommendation?.rationale || []),
      ]),
      compactFacts([
        recommendation?.score_breakdown
          ? {
              label: "Interest priority",
              value: formatNumber(
                recommendation.score_breakdown.interest_priority
              ) || "",
            }
          : null,
        recommendation?.score_breakdown
          ? {
              label: "Liquidity safety",
              value: formatNumber(
                recommendation.score_breakdown.liquidity_safety
              ) || "",
            }
          : null,
        recommendation?.score_breakdown
          ? {
              label: "Strategy alignment",
              value: formatNumber(
                recommendation.score_breakdown.strategy_alignment
              ) || "",
            }
          : null,
        recommendation?.score_breakdown
          ? {
              label: "Risk reduction",
              value: formatNumber(
                recommendation.score_breakdown.risk_reduction
              ) || "",
            }
          : null,
      ])
    ),
    expected_result: section(
      "expected_result",
      "Expected Result",
      projection
        ? "Expected result uses the engine cashflow projection and selected candidate."
        : "No cashflow projection was provided by the engine.",
      compactItems([
        projection
          ? `Projection window: ${projection.period_days} days`
          : null,
        recommendation?.projected_cash_after_payment != null
          ? "Projected cash after payment is provided by the selected candidate."
          : null,
      ]),
      expectedResultFacts
    ),
    risks: section(
      "risks",
      "Risks",
      `Risk level: ${formatStatus(engineResult.risk_summary.risk_level)}`,
      compactItems([
        ...engineResult.risk_summary.warnings,
        ...(engineResult.constraints || []).map(
          (constraint) => `${constraint.label}: ${constraint.detail}`
        ),
      ]),
      compactFacts([
        { label: "Risk level", value: formatStatus(engineResult.risk_summary.risk_level) },
        { label: "Confidence", value: formatStatus(engineResult.risk_summary.confidence) },
      ])
    ),
    alternatives: section(
      "alternatives",
      "Alternatives",
      engineResult.alternatives.length > 0
        ? "Alternative candidates are listed in engine score order."
        : "No alternative candidates were provided by the engine.",
      alternativeItems,
      []
    ),
  };

  return {
    sections,
    assumptions,
    validation_errors: engineResult.validation_errors,
  };
}
