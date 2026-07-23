import type { Observation } from "./platform/agents";

export type ObservationCenterGroup =
  | "Improvements"
  | "Opportunities"
  | "Risks"
  | "Questions"
  | "Missing Information"
  | "Data Quality"
  | "Completed Milestones";

export const observationCenterGroupOrder: readonly ObservationCenterGroup[] = [
  "Improvements",
  "Opportunities",
  "Risks",
  "Questions",
  "Missing Information",
  "Data Quality",
  "Completed Milestones",
] as const;

export type ObservationCenterItem = {
  id: string;
  group: ObservationCenterGroup;
  title: string;
  summary: string;
  whyItMatters: string;
  confidence: number;
  confidenceLabel: string;
  explainWhy: {
    whyNoticed: string;
    rule: string;
    evidence: readonly string[];
    limitations: readonly string[];
  };
  workspace?: { label: string; href: string };
  suggestedAction?: { label: string; href: string };
  suggestedQuestion?: string;
  status: Observation["status"];
  priority: Observation["assessment"]["priority"];
};

export type MoneyObservationCenterModel = {
  generatedAt: string;
  total: number;
  groups: readonly {
    id: string;
    label: ObservationCenterGroup;
    items: readonly ObservationCenterItem[];
  }[];
};

function groupObservation(
  observation: Observation
): ObservationCenterGroup {
  if (
    observation.type === "Milestone" ||
    observation.status === "Resolved"
  ) {
    return "Completed Milestones";
  }
  if (observation.type === "Improvement") return "Improvements";
  if (observation.type === "Opportunity") return "Opportunities";
  if (observation.type === "Missing information") {
    return "Missing Information";
  }
  if (observation.type === "Inconsistency") return "Data Quality";
  if (
    observation.type === "Risk" ||
    observation.type === "Regression" ||
    observation.type === "Anomaly"
  ) {
    return "Risks";
  }
  if (observation.type === "Follow-up item") return "Questions";
  if (observation.assessment.severity === "positive") return "Improvements";
  if (
    observation.assessment.severity === "caution" ||
    observation.assessment.severity === "important" ||
    observation.assessment.severity === "critical"
  ) {
    return "Risks";
  }
  return observation.presentation.suggestedQuestion
    ? "Questions"
    : "Opportunities";
}

function workspaceLabel(href: string) {
  if (href.includes("/debts")) return "Debts";
  if (href.includes("/velocity")) return "Velocity";
  if (href.includes("/retirement")) return "Retirement";
  if (href.includes("/income")) return "Income";
  if (href.includes("/cashflow")) return "Cash Flow";
  return "BeastMoney";
}

export function buildMoneyObservationCenter(
  observations: readonly Observation[],
  generatedAt: string
): MoneyObservationCenterModel {
  const items = observations
    .filter(
      (observation) =>
        observation.status !== "Dismissed" &&
        observation.status !== "Expired" &&
        observation.status !== "Superseded"
    )
    .map((observation): ObservationCenterItem => {
      const workspaceTarget =
        observation.presentation.workspaceTarget ||
        observation.presentation.action?.target;
      return {
        id: observation.id,
        group: groupObservation(observation),
        title: observation.presentation.title,
        summary: observation.presentation.summary,
        whyItMatters:
          observation.presentation.whyItMayMatter ||
          observation.presentation.detail,
        confidence: Math.round(observation.assessment.confidence * 100),
        confidenceLabel:
          observation.confidenceAnalysis?.confidence ||
          (observation.assessment.confidence >= 0.8
            ? "high"
            : observation.assessment.confidence >= 0.55
              ? "moderate"
              : "low"),
        explainWhy: {
          whyNoticed: observation.presentation.whyNoticed,
          rule: observation.provenance.ruleDescription,
          evidence: observation.evidence.map(
            (evidence) => `${evidence.label}: ${String(evidence.value)}`
          ),
          limitations: observation.provenance.limitations,
        },
        workspace: workspaceTarget
          ? { label: workspaceLabel(workspaceTarget), href: workspaceTarget }
          : undefined,
        suggestedAction: observation.presentation.action?.target
          ? {
              label: observation.presentation.action.title,
              href: observation.presentation.action.target,
            }
          : workspaceTarget
            ? {
                label: `Review ${workspaceLabel(workspaceTarget)}`,
                href: workspaceTarget,
              }
            : undefined,
        suggestedQuestion: observation.presentation.suggestedQuestion,
        status: observation.status,
        priority: observation.assessment.priority,
      };
    });

  return {
    generatedAt,
    total: items.length,
    groups: observationCenterGroupOrder
      .map((label) => ({
        id: label.toLowerCase().replace(/\s+/g, "-"),
        label,
        items: items.filter((item) => item.group === label),
      }))
      .filter((group) => group.items.length > 0),
  };
}
