export type KnowledgeSourceTier = 1 | 2 | 3 | 4;
export type MemberKnowledgeKind = "beast-module" | "document" | "current-conversation" | "previous-conversation" | "durable-memory" | "goal" | "calendar" | "family" | "preference";
export type BeastKnowledgeKind = "professional-playbook" | "internal-documentation" | "calculation-engine" | "policy" | "educational-content" | "shared-knowledge";
export type ExternalAuthorityKind = "official-government" | "official-institution" | "official-education" | "peer-reviewed";
export type KnowledgeSourceKind = MemberKnowledgeKind | BeastKnowledgeKind | "trusted-external" | "reasoning";
export type KnowledgeAuthority = "authenticated-member-data" | "beast-authority" | "trusted-external-authority" | "derived-reasoning";
export type KnowledgeFreshness = "current" | "aging" | "stale" | "unknown";

export type KnowledgeCitation = {
  capable: boolean;
  reference?: string;
  url?: string;
};

export type KnowledgeSourceDescriptor = {
  id: string;
  label: string;
  tier: KnowledgeSourceTier;
  kind: KnowledgeSourceKind;
  authority: KnowledgeAuthority;
  externalAuthorityKind?: ExternalAuthorityKind;
  verified?: boolean;
};

export type RetrievedKnowledgeItem<TContent = unknown> = {
  id: string;
  claimKey: string;
  source: KnowledgeSourceDescriptor;
  content: TContent;
  observedAt?: string;
  expiresAt?: string;
  freshness: KnowledgeFreshness;
  confidence: number;
  ownerScope: { kind: "owner"; ownerId: string } | { kind: "public" };
  citation: KnowledgeCitation;
  retrievedAt: string;
  limitations?: readonly string[];
  supportingSourceIds?: readonly string[];
};

export type KnowledgeRetrievalRequest = {
  specialistId: string;
  ownerId: string;
  providerIds?: readonly string[];
  query?: string;
  now?: Date;
};

export type KnowledgeSourceProvider = {
  descriptor: KnowledgeSourceDescriptor;
  retrieve(request: KnowledgeRetrievalRequest): Promise<readonly Omit<RetrievedKnowledgeItem, "source" | "freshness" | "retrievedAt">[]>;
};

export type SpecialistKnowledgeSourcePolicy = {
  specialistId: string;
  allowedProviderIds: readonly string[] | "registered";
  allowedTiers: readonly KnowledgeSourceTier[];
  allowedKinds?: readonly KnowledgeSourceKind[];
  sourcePriority?: Partial<Record<KnowledgeSourceKind, number>>;
  requireOwnerScopeForMemberData: boolean;
};

export type ResolvedKnowledgeClaim = {
  claimKey: string;
  authoritative: RetrievedKnowledgeItem;
  supporting: readonly RetrievedKnowledgeItem[];
  conflicts: readonly RetrievedKnowledgeItem[];
};

export type KnowledgeSelection = {
  specialistId: string;
  ownerId: string;
  retrieved: readonly RetrievedKnowledgeItem[];
  claims: readonly ResolvedKnowledgeClaim[];
  explainWhy: KnowledgeExplainWhy;
};

export type KnowledgeBackedRecommendation<TRecommendation> = {
  recommendation: TRecommendation;
  knowledge: KnowledgeSelection;
  explainWhy: KnowledgeExplainWhy;
};

export type KnowledgeExplainWhy = {
  sourcesUsed: readonly { id: string; label: string; tier: KnowledgeSourceTier; authority: KnowledgeAuthority; freshness: KnowledgeFreshness; confidence: number; citation: KnowledgeCitation }[];
  selectionReasons: readonly string[];
  authoritativeSources: readonly string[];
  uncertainty: readonly string[];
};

const defaultKindPriority: Record<KnowledgeSourceKind, number> = {
  "beast-module": 100, document: 90, goal: 85, calendar: 85, family: 85, preference: 80,
  "current-conversation": 75, "previous-conversation": 35, "durable-memory": 30,
  "professional-playbook": 75, "calculation-engine": 75, policy: 70, "internal-documentation": 65,
  "educational-content": 60, "shared-knowledge": 55, "trusted-external": 50, reasoning: 10,
};

const authorityPriority: Record<KnowledgeAuthority, number> = {
  "authenticated-member-data": 400,
  "beast-authority": 300,
  "trusted-external-authority": 200,
  "derived-reasoning": 100,
};

const freshnessPriority: Record<KnowledgeFreshness, number> = { current: 30, aging: 20, unknown: 10, stale: 0 };

export function determineKnowledgeFreshness(item: { observedAt?: string; expiresAt?: string }, now = new Date()): KnowledgeFreshness {
  if (item.expiresAt && Date.parse(item.expiresAt) <= now.getTime()) return "stale";
  if (!item.observedAt || Number.isNaN(Date.parse(item.observedAt))) return "unknown";
  const age = now.getTime() - Date.parse(item.observedAt);
  if (age <= 24 * 60 * 60 * 1000) return "current";
  if (age <= 30 * 24 * 60 * 60 * 1000) return "aging";
  return "stale";
}

function validateDescriptor(descriptor: KnowledgeSourceDescriptor) {
  if (!descriptor.id.trim() || !descriptor.label.trim()) throw new Error("Knowledge sources require an id and label.");
  if (descriptor.tier === 1 && descriptor.authority !== "authenticated-member-data") throw new Error("Tier 1 knowledge must be authenticated member data.");
  if (descriptor.tier === 2 && descriptor.authority !== "beast-authority") throw new Error("Tier 2 knowledge must be Beast authority.");
  if (descriptor.tier === 3 && (descriptor.kind !== "trusted-external" || descriptor.authority !== "trusted-external-authority" || !descriptor.externalAuthorityKind || descriptor.verified !== true)) throw new Error("Tier 3 providers must be verified trusted external authorities.");
  if (descriptor.tier === 4 && descriptor.authority !== "derived-reasoning") throw new Error("Tier 4 knowledge must be derived reasoning.");
  const memberKinds: readonly KnowledgeSourceKind[] = ["beast-module", "document", "current-conversation", "previous-conversation", "durable-memory", "goal", "calendar", "family", "preference"];
  const beastKinds: readonly KnowledgeSourceKind[] = ["professional-playbook", "internal-documentation", "calculation-engine", "policy", "educational-content", "shared-knowledge"];
  if (descriptor.tier === 1 && !memberKinds.includes(descriptor.kind)) throw new Error("Tier 1 providers must use a member-data source kind.");
  if (descriptor.tier === 2 && !beastKinds.includes(descriptor.kind)) throw new Error("Tier 2 providers must use a Beast knowledge source kind.");
  if (descriptor.tier === 4 && descriptor.kind !== "reasoning") throw new Error("Tier 4 providers must use the reasoning source kind.");
  return descriptor;
}

function contentEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class KnowledgeSourceFramework {
  private readonly providers = new Map<string, KnowledgeSourceProvider>();
  private readonly policies = new Map<string, SpecialistKnowledgeSourcePolicy>();

  registerProvider(provider: KnowledgeSourceProvider) {
    validateDescriptor(provider.descriptor);
    if (this.providers.has(provider.descriptor.id)) throw new Error(`Knowledge provider ${provider.descriptor.id} is already registered.`);
    this.providers.set(provider.descriptor.id, provider);
    return provider;
  }

  registerPolicy(policy: SpecialistKnowledgeSourcePolicy) {
    if (!policy.specialistId.trim() || !policy.allowedTiers.length) throw new Error("Knowledge source policies require a specialist and allowed tiers.");
    if (this.policies.has(policy.specialistId)) throw new Error(`Specialist ${policy.specialistId} already has a knowledge source policy.`);
    this.policies.set(policy.specialistId, Object.freeze({ ...policy }));
    return policy;
  }

  hasPolicy(specialistId: string) { return this.policies.has(specialistId); }

  policy(specialistId: string) {
    const policy = this.policies.get(specialistId);
    if (!policy) throw new Error(`Specialist ${specialistId} has no knowledge source policy.`);
    return policy;
  }

  async retrieve(request: KnowledgeRetrievalRequest): Promise<KnowledgeSelection> {
    const policy = this.policy(request.specialistId);
    const requested = request.providerIds || Array.from(this.providers.keys());
    const allowedIds = policy.allowedProviderIds === "registered" ? requested : requested.filter((id) => policy.allowedProviderIds.includes(id));
    const providers = allowedIds.map((id) => this.providers.get(id)).filter((provider): provider is KnowledgeSourceProvider => Boolean(provider));
    const retrievedAt = (request.now || new Date()).toISOString();
    const batches = await Promise.all(providers.map(async (provider) => {
      if (!policy.allowedTiers.includes(provider.descriptor.tier)) return [];
      if (policy.allowedKinds && !policy.allowedKinds.includes(provider.descriptor.kind)) return [];
      const values = await provider.retrieve(request);
      return values.map((value): RetrievedKnowledgeItem => ({ ...value, source: provider.descriptor, freshness: determineKnowledgeFreshness(value, request.now), retrievedAt }));
    }));
    const items = batches.flat().filter((item) => {
      if (item.confidence < 0 || item.confidence > 1) throw new Error(`Knowledge item ${item.id} confidence must be between 0 and 1.`);
      if (item.source.tier === 1 && policy.requireOwnerScopeForMemberData) return item.ownerScope.kind === "owner" && item.ownerScope.ownerId === request.ownerId;
      return item.ownerScope.kind === "public" || item.ownerScope.ownerId === request.ownerId;
    });
    return this.resolve(request.specialistId, request.ownerId, items);
  }

  resolve(specialistId: string, ownerId: string, items: readonly RetrievedKnowledgeItem[]): KnowledgeSelection {
    const policy = this.policy(specialistId);
    const score = (item: RetrievedKnowledgeItem) => {
      const configuredPriority = policy.sourcePriority?.[item.source.kind];
      const boundedKindPriority = configuredPriority === undefined ? defaultKindPriority[item.source.kind] : Math.max(-100, Math.min(100, configuredPriority));
      const authenticatedRecordInvariant = item.source.tier === 1 && item.source.kind === "beast-module" ? 10_000 : 0;
      return authenticatedRecordInvariant + authorityPriority[item.source.authority] + boundedKindPriority + freshnessPriority[item.freshness] + item.confidence;
    };
    const grouped = new Map<string, RetrievedKnowledgeItem[]>();
    for (const item of items) grouped.set(item.claimKey, [...(grouped.get(item.claimKey) || []), item]);
    const claims = Array.from(grouped.entries()).map(([claimKey, claimItems]): ResolvedKnowledgeClaim => {
      const sorted = [...claimItems].sort((left, right) => score(right) - score(left) || right.retrievedAt.localeCompare(left.retrievedAt));
      const authoritative = sorted[0];
      return { claimKey, authoritative, supporting: sorted.filter((item) => item.id !== authoritative.id && contentEqual(item.content, authoritative.content)), conflicts: sorted.filter((item) => item.id !== authoritative.id && !contentEqual(item.content, authoritative.content)) };
    });
    const authoritativeSources = Array.from(new Set(claims.map((claim) => claim.authoritative.source.label)));
    const uncertainty = claims.flatMap((claim) => [
      ...claim.conflicts.map((item) => `${claim.claimKey} conflicts with ${item.source.label}; ${claim.authoritative.source.label} remains authoritative.`),
      ...(claim.authoritative.limitations || []),
      ...(claim.authoritative.freshness === "stale" || claim.authoritative.freshness === "unknown" ? [`${claim.claimKey} has ${claim.authoritative.freshness} freshness.`] : []),
    ]);
    return {
      specialistId, ownerId, retrieved: items, claims,
      explainWhy: {
        sourcesUsed: items.map((item) => ({ id: item.source.id, label: item.source.label, tier: item.source.tier, authority: item.source.authority, freshness: item.freshness, confidence: item.confidence, citation: item.citation })),
        selectionReasons: claims.map((claim) => `${claim.authoritative.source.label} was selected for ${claim.claimKey} based on authority, configured source priority, freshness, and confidence.`),
        authoritativeSources,
        uncertainty,
      },
    };
  }
}

export function createKnowledgeBackedRecommendation<TRecommendation>(knowledge: KnowledgeSelection, recommendation: TRecommendation): KnowledgeBackedRecommendation<TRecommendation> {
  if (!knowledge.retrieved.length || !knowledge.claims.length) throw new Error("Recommendations require retrieved knowledge and authoritative claims.");
  return { recommendation, knowledge, explainWhy: knowledge.explainWhy };
}

const sharedPolicy = (specialistId: string): SpecialistKnowledgeSourcePolicy => ({ specialistId, allowedProviderIds: "registered", allowedTiers: [1, 2, 3, 4], requireOwnerScopeForMemberData: true });
export const specialistKnowledgeSourcePolicies = {
  moneyCoach: sharedPolicy("beastmoney.money-coach"),
  guidanceCounselor: sharedPolicy("beasteducation.guidance-counselor"),
  healthAdvisor: sharedPolicy("beasthealth.health-advisor"),
  personalAssistant: sharedPolicy("beastos.personal-assistant"),
} as const;
