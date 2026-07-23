import type { AgentConversationThread } from "./conversationPersistence";
import type { MemberUnderstandingReasoningItem } from "./memberUnderstanding";
import type { Observation } from "./observations";
import type { ProfessionalJournalReasoningItem } from "./professionalJournal";

export type ReflectionCadence = "weekly" | "monthly" | "quarterly" | "annual" | "since-start";
export type ReflectionDirection = "improvement" | "regression" | "consistent" | "milestone" | "context";
export type ReflectionSourceType = "observation" | "professional-journal" | "member-understanding" | "conversation-history";

export type ReflectionEvidence = {
  id: string;
  sourceType: ReflectionSourceType;
  sourceId: string;
  capturedAt: string;
  statement: string;
  direction: ReflectionDirection;
  metric?: { name: string; value: number; unit: string };
};

export type ReflectionComparison = {
  metric: string;
  currentValue: number;
  priorValue: number;
  change: number;
  percentChange?: number;
  unit: string;
  direction: Exclude<ReflectionDirection, "milestone" | "context">;
};

export type SpecialistReflection = {
  id: string;
  ownerId: string;
  specialistId: string;
  cadence: ReflectionCadence;
  period: { startsAt: string; endsAt: string; comparedStartsAt?: string; comparedEndsAt?: string };
  title: string;
  narrative: string;
  highlights: readonly string[];
  improvements: readonly ReflectionEvidence[];
  regressions: readonly ReflectionEvidence[];
  consistencies: readonly ReflectionEvidence[];
  milestones: readonly ReflectionEvidence[];
  comparisons: readonly ReflectionComparison[];
  evidence: readonly ReflectionEvidence[];
  generatedAt: string;
  limitations: readonly string[];
};

export type GenerateReflectionInput = {
  ownerId: string;
  specialistId: string;
  cadence: ReflectionCadence;
  asOf: string;
  observations?: readonly Observation[];
  journalEntries?: readonly ProfessionalJournalReasoningItem[];
  memberUnderstanding?: readonly MemberUnderstandingReasoningItem[];
  conversations?: readonly AgentConversationThread[];
  evidence?: readonly ReflectionEvidence[];
};

function cadenceDays(cadence: ReflectionCadence) {
  return cadence === "weekly" ? 7 : cadence === "monthly" ? 30 : cadence === "quarterly" ? 91 : cadence === "annual" ? 365 : undefined;
}

function shift(iso: string, days: number) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function directionFromObservation(observation: Observation): ReflectionDirection {
  if (observation.type === "Improvement") return "improvement";
  if (observation.type === "Regression" || observation.type === "Risk") return "regression";
  if (observation.type === "Milestone") return "milestone";
  if (observation.type === "Trend" && observation.assessment.severity === "positive") return "improvement";
  return "context";
}

function percentChange(current: number, prior: number) {
  return prior === 0 ? undefined : Math.round(((current - prior) / Math.abs(prior)) * 1000) / 10;
}

function metricComparisons(current: readonly ReflectionEvidence[], prior: readonly ReflectionEvidence[]) {
  const priorMetrics = new Map(prior.filter((item) => item.metric).map((item) => [item.metric!.name, item.metric!]));
  return current.flatMap((item): ReflectionComparison[] => {
    if (!item.metric) return [];
    const baseline = priorMetrics.get(item.metric.name);
    if (!baseline || baseline.unit !== item.metric.unit) return [];
    const change = item.metric.value - baseline.value;
    return [{
      metric: item.metric.name,
      currentValue: item.metric.value,
      priorValue: baseline.value,
      change,
      percentChange: percentChange(item.metric.value, baseline.value),
      unit: item.metric.unit,
      direction: change > 0 ? "improvement" : change < 0 ? "regression" : "consistent",
    }];
  });
}

export class SharedReflectionIntelligence {
  generate(input: GenerateReflectionInput): SpecialistReflection {
    if (!input.ownerId.trim() || !input.specialistId.trim()) throw new Error("Reflections require an owner and specialist.");
    if (!Number.isFinite(Date.parse(input.asOf))) throw new Error("Reflections require a valid generation timestamp.");
    const days = cadenceDays(input.cadence);
    const startsAt = days ? shift(input.asOf, -days) : "1970-01-01T00:00:00.000Z";
    const comparedStartsAt = days ? shift(startsAt, -days) : undefined;
    const evidence: ReflectionEvidence[] = [...(input.evidence || [])];
    for (const observation of input.observations || []) {
      if (observation.ownerId !== input.ownerId || observation.specialistId !== input.specialistId) continue;
      evidence.push({
        id: `observation:${observation.id}`,
        sourceType: "observation",
        sourceId: observation.id,
        capturedAt: observation.updatedAt,
        statement: observation.presentation.whatChanged || observation.presentation.summary,
        direction: directionFromObservation(observation),
      });
    }
    for (const entry of input.journalEntries || []) {
      evidence.push({ id: `journal:${entry.entryId}`, sourceType: "professional-journal", sourceId: entry.entryId, capturedAt: entry.timestamp, statement: entry.interpretation, direction: /improv|progress|increas|strength/i.test(entry.interpretation) ? "improvement" : /declin|regress|decreas|risk/i.test(entry.interpretation) ? "regression" : "consistent" });
    }
    for (const understanding of input.memberUnderstanding || []) {
      evidence.push({ id: `understanding:${understanding.understandingId}`, sourceType: "member-understanding", sourceId: understanding.understandingId, capturedAt: understanding.updatedAt, statement: understanding.understanding, direction: understanding.dimension === "strength" ? "improvement" : understanding.dimension === "weakness" ? "regression" : "context" });
    }
    for (const conversation of input.conversations || []) {
      if (conversation.ownerId !== input.ownerId || conversation.agentId !== input.specialistId || conversation.archived) continue;
      evidence.push({ id: `conversation:${conversation.id}`, sourceType: "conversation-history", sourceId: conversation.id, capturedAt: conversation.updatedAt, statement: conversation.summary.overview, direction: "context", metric: { name: "conversation messages", value: conversation.messageCount, unit: "messages" } });
    }
    const uniqueEvidence = Array.from(new Map(evidence.map((item) => [item.id, item])).values())
      .filter((item) => Number.isFinite(Date.parse(item.capturedAt)) && Date.parse(item.capturedAt) <= Date.parse(input.asOf));
    const current = uniqueEvidence.filter((item) => Date.parse(item.capturedAt) >= Date.parse(startsAt));
    const prior = days && comparedStartsAt
      ? uniqueEvidence.filter((item) => Date.parse(item.capturedAt) >= Date.parse(comparedStartsAt) && Date.parse(item.capturedAt) < Date.parse(startsAt))
      : [];
    const comparisons = metricComparisons(current, prior);
    const improvements = current.filter((item) => item.direction === "improvement");
    const regressions = current.filter((item) => item.direction === "regression");
    const consistencies = current.filter((item) => item.direction === "consistent");
    const milestones = current.filter((item) => item.direction === "milestone");
    const highlights = [
      ...milestones.map((item) => item.statement),
      ...improvements.map((item) => item.statement),
      ...regressions.map((item) => item.statement),
      ...consistencies.map((item) => item.statement),
    ].slice(0, 8);
    const periodLabel = input.cadence === "since-start" ? "Since we started" : `Over this ${input.cadence.replace("ly", "")} period`;
    const narrative = current.length
      ? `${periodLabel}, the available record shows ${improvements.length} improvement${improvements.length === 1 ? "" : "s"}, ${regressions.length} regression${regressions.length === 1 ? "" : "s"}, ${consistencies.length} consistency signal${consistencies.length === 1 ? "" : "s"}, and ${milestones.length} milestone${milestones.length === 1 ? "" : "s"}.`
      : `${periodLabel}, there is not enough dated evidence to describe long-term progress responsibly.`;
    return {
      id: `${input.specialistId}:${input.ownerId}:${input.cadence}:${input.asOf.slice(0, 10)}`,
      ownerId: input.ownerId,
      specialistId: input.specialistId,
      cadence: input.cadence,
      period: { startsAt, endsAt: input.asOf, comparedStartsAt, comparedEndsAt: days ? startsAt : undefined },
      title: input.cadence === "since-start" ? "Since we started" : `${input.cadence[0].toUpperCase()}${input.cadence.slice(1)} reflection`,
      narrative,
      highlights,
      improvements,
      regressions,
      consistencies,
      milestones,
      comparisons,
      evidence: current,
      generatedAt: input.asOf,
      limitations: [
        ...(current.length ? [] : ["No dated evidence falls within the selected reflection period."]),
        ...(comparisons.length ? [] : ["No comparable metric appeared in both the current and prior period."]),
        "Reflection summarizes recorded evidence and does not infer unrecorded outcomes.",
      ],
    };
  }
}
