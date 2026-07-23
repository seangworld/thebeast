import assert from "node:assert/strict";
import test from "node:test";
import { BeastAgentsPlatform, KnowledgeSourceFramework, createKnowledgeBackedRecommendation, specialistKnowledgeSourcePolicies, type KnowledgeSourceDescriptor } from "../src/lib/platform/agents";

const descriptor = (values: Partial<KnowledgeSourceDescriptor> & Pick<KnowledgeSourceDescriptor, "id" | "label" | "tier" | "kind" | "authority">): KnowledgeSourceDescriptor => values;

function provider(source: KnowledgeSourceDescriptor, values: { id: string; claimKey: string; content: unknown; observedAt?: string; ownerId?: string; confidence?: number; citation?: string; limitations?: string[] }[]) {
  return { descriptor: source, async retrieve() { return values.map((value) => ({ id: value.id, claimKey: value.claimKey, content: value.content, observedAt: value.observedAt, confidence: value.confidence ?? 0.9, ownerScope: value.ownerId ? { kind: "owner" as const, ownerId: value.ownerId } : { kind: "public" as const }, citation: { capable: Boolean(value.citation), reference: value.citation }, limitations: value.limitations })); } };
}

test("AGENT-206 exposes one four-tier source hierarchy for every specialist", () => {
  assert.deepEqual(specialistKnowledgeSourcePolicies.moneyCoach.allowedTiers, [1, 2, 3, 4]);
  assert.deepEqual(specialistKnowledgeSourcePolicies.guidanceCounselor.allowedTiers, [1, 2, 3, 4]);
  assert.deepEqual(specialistKnowledgeSourcePolicies.healthAdvisor.allowedTiers, [1, 2, 3, 4]);
  assert.deepEqual(specialistKnowledgeSourcePolicies.personalAssistant.allowedTiers, [1, 2, 3, 4]);
  const platform = new BeastAgentsPlatform();
  assert.equal(platform.knowledgeSources instanceof KnowledgeSourceFramework, true);
  assert.equal(platform.knowledgeSources.policy("beastmoney.money-coach").specialistId, "beastmoney.money-coach");
});

test("AGENT-206 authority invariants cannot be reversed by specialist priority overrides", async () => {
  const framework = new KnowledgeSourceFramework();
  framework.registerPolicy({ ...specialistKnowledgeSourcePolicies.moneyCoach, sourcePriority: { "beast-module": -10000, "durable-memory": 10000, "trusted-external": 10000 } });
  framework.registerProvider(provider(descriptor({ id: "record-invariant", label: "Authenticated record", tier: 1, kind: "beast-module", authority: "authenticated-member-data" }), [{ id: "record-invariant-item", claimKey: "balance", content: 100, observedAt: "2025-01-01T00:00:00Z", ownerId: "owner-1" }]));
  framework.registerProvider(provider(descriptor({ id: "memory-invariant", label: "Memory", tier: 1, kind: "durable-memory", authority: "authenticated-member-data" }), [{ id: "memory-invariant-item", claimKey: "balance", content: 900, observedAt: "2026-07-22T12:00:00Z", ownerId: "owner-1" }]));
  framework.registerProvider(provider(descriptor({ id: "external-invariant", label: "Official source", tier: 3, kind: "trusted-external", authority: "trusted-external-authority", externalAuthorityKind: "official-government", verified: true }), [{ id: "external-invariant-item", claimKey: "balance", content: 800, observedAt: "2026-07-22T12:00:00Z" }]));
  const result = await framework.retrieve({ specialistId: "beastmoney.money-coach", ownerId: "owner-1", now: new Date("2026-07-22T13:00:00Z") });
  assert.equal(result.claims[0].authoritative.id, "record-invariant-item");
});

test("AGENT-206 current authenticated records override stale memory and prior conversation", async () => {
  const framework = new KnowledgeSourceFramework();
  framework.registerPolicy(specialistKnowledgeSourcePolicies.moneyCoach);
  framework.registerProvider(provider(descriptor({ id: "records", label: "Current Beast records", tier: 1, kind: "beast-module", authority: "authenticated-member-data" }), [{ id: "record", claimKey: "cash", content: 2500, observedAt: "2026-07-22T12:00:00Z", ownerId: "owner-1" }]));
  framework.registerProvider(provider(descriptor({ id: "memory", label: "Durable memory", tier: 1, kind: "durable-memory", authority: "authenticated-member-data" }), [{ id: "memory-item", claimKey: "cash", content: 9999, observedAt: "2025-01-01T00:00:00Z", ownerId: "owner-1" }]));
  framework.registerProvider(provider(descriptor({ id: "prior", label: "Prior conversation", tier: 1, kind: "previous-conversation", authority: "authenticated-member-data" }), [{ id: "prior-item", claimKey: "cash", content: 8000, observedAt: "2026-07-20T00:00:00Z", ownerId: "owner-1" }]));
  const result = await framework.retrieve({ specialistId: "beastmoney.money-coach", ownerId: "owner-1", now: new Date("2026-07-22T13:00:00Z") });
  assert.equal(result.claims[0].authoritative.id, "record");
  assert.equal(result.claims[0].conflicts.length, 2);
  assert.match(result.explainWhy.uncertainty.join(" "), /conflicts/);
});

test("AGENT-206 external knowledge never overrides authenticated Beast records", async () => {
  const framework = new KnowledgeSourceFramework();
  framework.registerPolicy(specialistKnowledgeSourcePolicies.healthAdvisor);
  framework.registerProvider(provider(descriptor({ id: "member-record", label: "Member record", tier: 1, kind: "beast-module", authority: "authenticated-member-data" }), [{ id: "member", claimKey: "status", content: "saved member value", observedAt: "2025-01-01T00:00:00Z", ownerId: "owner-1" }]));
  framework.registerProvider(provider(descriptor({ id: "official-source", label: "Official public authority", tier: 3, kind: "trusted-external", authority: "trusted-external-authority", externalAuthorityKind: "official-government", verified: true }), [{ id: "external", claimKey: "status", content: "general public value", observedAt: "2026-07-22T12:00:00Z", confidence: 1, citation: "official-guidance" }]));
  const result = await framework.retrieve({ specialistId: "beasthealth.health-advisor", ownerId: "owner-1", now: new Date("2026-07-22T13:00:00Z") });
  assert.equal(result.claims[0].authoritative.id, "member");
  assert.equal(result.claims[0].conflicts[0].id, "external");
});

test("AGENT-206 rejects arbitrary websites as Tier 3 authority", () => {
  const framework = new KnowledgeSourceFramework();
  assert.throws(() => framework.registerProvider(provider(descriptor({ id: "random-site", label: "Random website", tier: 3, kind: "trusted-external", authority: "trusted-external-authority" }), [])), /verified trusted external/);
  assert.doesNotThrow(() => framework.registerProvider(provider(descriptor({ id: "verified-official", label: "Verified official source", tier: 3, kind: "trusted-external", authority: "trusted-external-authority", externalAuthorityKind: "official-institution", verified: true }), [])));
});

test("AGENT-206 enforces specialist allowlists and owner scoping", async () => {
  const framework = new KnowledgeSourceFramework();
  framework.registerPolicy({ specialistId: "future.specialist", allowedProviderIds: ["allowed"], allowedTiers: [1], allowedKinds: ["beast-module"], requireOwnerScopeForMemberData: true });
  framework.registerProvider(provider(descriptor({ id: "allowed", label: "Allowed records", tier: 1, kind: "beast-module", authority: "authenticated-member-data" }), [{ id: "mine", claimKey: "one", content: 1, ownerId: "owner-1" }, { id: "other", claimKey: "two", content: 2, ownerId: "owner-2" }]));
  framework.registerProvider(provider(descriptor({ id: "blocked", label: "Blocked records", tier: 1, kind: "document", authority: "authenticated-member-data" }), [{ id: "blocked-item", claimKey: "three", content: 3, ownerId: "owner-1" }]));
  const result = await framework.retrieve({ specialistId: "future.specialist", ownerId: "owner-1" });
  assert.deepEqual(result.retrieved.map((item) => item.id), ["mine"]);
});

test("AGENT-206 Explain Why exposes source selection authority citations and uncertainty", async () => {
  const framework = new KnowledgeSourceFramework();
  framework.registerPolicy({ ...specialistKnowledgeSourcePolicies.personalAssistant, allowedProviderIds: ["calendar", "policy"] });
  framework.registerProvider(provider(descriptor({ id: "calendar", label: "Member calendar", tier: 1, kind: "calendar", authority: "authenticated-member-data" }), [{ id: "event", claimKey: "next-event", content: "Appointment", observedAt: "2026-07-22T12:00:00Z", ownerId: "owner-1", citation: "calendar:event-1", limitations: ["Time zone must remain current."] }]));
  framework.registerProvider(provider(descriptor({ id: "policy", label: "Scheduling policy", tier: 2, kind: "policy", authority: "beast-authority" }), [{ id: "policy-item", claimKey: "scheduling-rule", content: "Confirm before changing", observedAt: "2026-07-22T12:00:00Z", citation: "policy:v1" }]));
  const result = await framework.retrieve({ specialistId: "beastos.personal-assistant", ownerId: "owner-1", now: new Date("2026-07-22T13:00:00Z") });
  assert.equal(result.explainWhy.sourcesUsed.length, 2);
  assert.equal(result.explainWhy.sourcesUsed[0].citation.capable, true);
  assert.ok(result.explainWhy.authoritativeSources.includes("Member calendar"));
  assert.match(result.explainWhy.selectionReasons.join(" "), /authority.*freshness.*confidence/i);
  assert.match(result.explainWhy.uncertainty.join(" "), /Time zone/);
  const backed = createKnowledgeBackedRecommendation(result, { action: "Confirm before changing the event." });
  assert.deepEqual(backed.explainWhy, result.explainWhy);
  assert.equal(backed.recommendation.action, "Confirm before changing the event.");
});
