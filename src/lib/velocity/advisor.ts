import type {
  VelocityChunkConstraint,
  VelocityEngineResult,
} from "./types";

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

function formatConstraintName(id: string, fallback: string) {
  const labels: Record<string, string> = {
    liquidity_floor: "Cash cushion",
    safe_source_capacity: "Available credit source",
    recovery_window: "Recovery window",
    target_balance: "Target debt balance",
    max_recommended_payment: "Maximum payment guardrail",
    positive_net_savings: "Net savings",
  };

  return labels[id] || fallback;
}

function describeConstraint(constraint: VelocityChunkConstraint) {
  if (constraint.id === "liquidity_floor") {
    return constraint.passed
      ? "Your cash cushion remains protected after bills and minimum payments."
      : "Hold cash because upcoming bills and minimum payments would leave too little cash.";
  }

  if (constraint.id === "safe_source_capacity") {
    return constraint.passed
      ? "Your available credit source capacity is safe."
      : "Hold cash because the credit source does not have enough safe capacity.";
  }

  if (constraint.id === "recovery_window") {
    return constraint.passed
      ? "Your recovery plan is within the selected timeframe."
      : "Hold cash because repayment would take longer than your selected recovery window.";
  }

  if (constraint.id === "target_balance") {
    return constraint.passed
      ? "The target debt has enough remaining balance for this chunk."
      : "No active target debt is available for a Velocity chunk.";
  }

  if (constraint.id === "max_recommended_payment") {
    return constraint.passed
      ? "The recommended chunk stays within your payment guardrail."
      : "Hold cash because the chunk would exceed your payment guardrail.";
  }

  if (constraint.id === "positive_net_savings") {
    return constraint.passed
      ? "The projected savings are positive after source costs."
      : "Hold cash because the projected savings are not positive after source costs.";
  }

  return constraint.detail;
}

function formatAdvisorLine(label: string, value: string) {
  return `${label}: ${value}`;
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
  const seen = new Set<string>();

  return facts.filter((fact): fact is AdvisorFact => {
    if (!fact) return false;

    const key = `${fact.label}:${fact.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compactItems(items: Array<string | null | undefined>) {
  const seen = new Set<string>();

  return items.filter((item): item is string => {
    if (!item) return false;
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

export function buildVelocityAdvisorResult(
  engineResult: VelocityEngineResult
): VelocityAdvisorResult {
  const recommendation = engineResult.recommendation;
  const projection = engineResult.cashflow_projection;
  const targetDebt = engineResult.target_debt;
  const chunkRecommendation = engineResult.chunk_recommendation;
  const assumptions = [
    ...(engineResult.assumptions || []),
    ...(engineResult.risk_summary.assumptions || []),
  ].filter((item, index, list) => list.indexOf(item) === index);

  const recommendationFacts = compactFacts([
    chunkRecommendation
      ? {
          label: "Recommended chunk",
          value: formatMoney(chunkRecommendation.recommended_chunk) || "",
        }
      : null,
    chunkRecommendation
      ? {
          label: "Main guardrail",
          value: chunkRecommendation.limiting_constraint_label,
        }
      : null,
    chunkRecommendation?.hold_reason
      ? {
          label: "Hold reason",
          value: formatConstraintName(
            chunkRecommendation.hold_reason,
            formatStatus(chunkRecommendation.hold_reason)
          ),
        }
      : null,
    chunkRecommendation
      ? {
          label: "Projected net savings",
          value: formatMoney(chunkRecommendation.projected_net_savings) || "",
        }
      : null,
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
  const chunkConstraintItems = (chunkRecommendation?.constraints || []).map(
    (constraint) =>
      formatAdvisorLine(
        formatConstraintName(constraint.id, constraint.label),
        describeConstraint(constraint)
      )
  );
  const chunkReasonItems = chunkRecommendation
    ? compactItems([
        chunkRecommendation.recommended_chunk > 0
          ? formatAdvisorLine(
              "Recommended chunk",
              `${formatMoney(chunkRecommendation.recommended_chunk)} is the amount that fits your current guardrails.`
            )
          : formatAdvisorLine(
              "Recommended chunk",
              "Hold cash for now because one or more guardrails did not pass."
            ),
        formatAdvisorLine(
          "Main guardrail",
          describeConstraint(
            chunkRecommendation.constraints.find(
              (constraint) =>
                constraint.id === chunkRecommendation.limiting_constraint_id
            ) || {
              id: chunkRecommendation.limiting_constraint_id,
              label: chunkRecommendation.limiting_constraint_label,
              value: 0,
              passed: chunkRecommendation.recommended_chunk > 0,
              detail: chunkRecommendation.limiting_constraint_label,
            }
          )
        ),
      ])
    : [];

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
        ...chunkReasonItems,
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
        ...chunkReasonItems,
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
        chunkRecommendation
          ? `Projected net savings: ${
              formatMoney(chunkRecommendation.projected_net_savings) || "$0.00"
            }`
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
        ...chunkConstraintItems,
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
