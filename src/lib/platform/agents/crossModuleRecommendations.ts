import type { SharedAIContextItem } from "../sharedAI";
import { buildSharedAIContext } from "../sharedAI";
import type { PlatformModule } from "../types";

export type CrossModuleProfessional = {
  agentId: string;
  module: PlatformModule;
  displayName: string;
};

export type CrossModuleRecommendationProposal = {
  id: string;
  ownerId: string;
  sourceProfessional: CrossModuleProfessional;
  recipientProfessional: CrossModuleProfessional;
  recommendation: string;
  whySurfaced: string;
  suggestedAction?: string;
  sharedContext: readonly SharedAIContextItem[];
  sourceContextIds: readonly string[];
  createdAt: string;
};

export type CrossModuleRecommendation = {
  id: string;
  ownerId: string;
  sourceProfessional: Readonly<CrossModuleProfessional>;
  recipientProfessional: Readonly<CrossModuleProfessional>;
  recommendation: string;
  whySurfaced: string;
  suggestedAction?: string;
  evidence: readonly Readonly<SharedAIContextItem>[];
  createdAt: string;
  status: "advisory";
  collaboration: {
    broker: "BeastOS";
    contextAccess: "read-only";
    crossModuleWritesAllowed: false;
    sourceProfessionalOwnsReasoning: true;
    recipientProfessionalOwnsResponse: true;
    memberDecisionRequired: true;
    autonomousExecution: false;
  };
};

export const crossModuleRecommendationRules = [
  "BeastOS brokers permissioned, owner-scoped context between professionals; it does not take ownership of professional reasoning.",
  "A professional may reference read-only shared context but cannot write to or modify another professional's module data.",
  "Every cross-module recommendation must identify the evidence used and explain why it is being surfaced.",
  "Cross-module recommendations are advisory, require member choice, and never execute actions autonomously.",
  "The receiving professional independently decides how to discuss a recommendation within its own professional boundaries.",
] as const;

function requireText(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`Cross-module recommendation ${label} is required.`);
  }
}

function snapshotProfessional(professional: CrossModuleProfessional) {
  requireText(professional.agentId, "professional id");
  requireText(professional.displayName, "professional name");
  return Object.freeze({ ...professional });
}

function snapshotContext(item: SharedAIContextItem) {
  return Object.freeze({ ...item });
}

export class SharedCrossModuleRecommendationExchange {
  private readonly recommendationsByOwner = new Map<
    string,
    Map<string, CrossModuleRecommendation>
  >();

  publish(
    proposal: CrossModuleRecommendationProposal
  ): CrossModuleRecommendation {
    requireText(proposal.id, "id");
    requireText(proposal.ownerId, "owner id");
    requireText(proposal.recommendation, "guidance");
    requireText(proposal.whySurfaced, "explanation");
    requireText(proposal.createdAt, "created timestamp");

    const sourceProfessional = snapshotProfessional(
      proposal.sourceProfessional
    );
    const recipientProfessional = snapshotProfessional(
      proposal.recipientProfessional
    );

    if (sourceProfessional.agentId === recipientProfessional.agentId) {
      throw new Error(
        "Cross-module recommendations require two independent professionals."
      );
    }
    if (sourceProfessional.module === recipientProfessional.module) {
      throw new Error(
        "Cross-module recommendations must cross module ownership boundaries."
      );
    }
    if (!proposal.sourceContextIds.length) {
      throw new Error(
        "Cross-module recommendations require shared BeastOS context evidence."
      );
    }

    const contextById = new Map(
      proposal.sharedContext.map((item) => [item.id, item])
    );
    const selectedContext = proposal.sourceContextIds.map((contextId) => {
      const item = contextById.get(contextId);
      if (!item) {
        throw new Error(
          `Cross-module recommendation context ${contextId} is unavailable.`
        );
      }
      if (item.permission !== "Allowed") {
        throw new Error(
          `Cross-module recommendation context ${contextId} is restricted.`
        );
      }
      return item;
    });
    const allowedContext = buildSharedAIContext([...selectedContext]);

    const ownerRecommendations =
      this.recommendationsByOwner.get(proposal.ownerId) ||
      new Map<string, CrossModuleRecommendation>();
    if (ownerRecommendations.has(proposal.id)) {
      throw new Error(
        `Cross-module recommendation ${proposal.id} already exists for this owner.`
      );
    }

    const recommendation = Object.freeze({
      id: proposal.id,
      ownerId: proposal.ownerId,
      sourceProfessional,
      recipientProfessional,
      recommendation: proposal.recommendation.trim(),
      whySurfaced: proposal.whySurfaced.trim(),
      suggestedAction: proposal.suggestedAction?.trim() || undefined,
      evidence: Object.freeze(allowedContext.map(snapshotContext)),
      createdAt: proposal.createdAt,
      status: "advisory" as const,
      collaboration: Object.freeze({
        broker: "BeastOS" as const,
        contextAccess: "read-only" as const,
        crossModuleWritesAllowed: false as const,
        sourceProfessionalOwnsReasoning: true as const,
        recipientProfessionalOwnsResponse: true as const,
        memberDecisionRequired: true as const,
        autonomousExecution: false as const,
      }),
    });

    ownerRecommendations.set(recommendation.id, recommendation);
    this.recommendationsByOwner.set(proposal.ownerId, ownerRecommendations);
    return recommendation;
  }

  listForOwner(
    ownerId: string,
    recipientProfessionalId?: string
  ): readonly CrossModuleRecommendation[] {
    requireText(ownerId, "owner id");
    return Array.from(
      this.recommendationsByOwner.get(ownerId)?.values() || []
    )
      .filter(
        (recommendation) =>
          !recipientProfessionalId ||
          recommendation.recipientProfessional.agentId ===
            recipientProfessionalId
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}
