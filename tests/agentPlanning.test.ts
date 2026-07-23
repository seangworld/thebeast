import assert from "node:assert/strict";
import test from "node:test";
import { BeastAgentsPlatform, SharedAgentPlanningEngine, specialistAgentPlanningPolicies, type AgentPlanStep } from "../src/lib/platform/agents";

test("AGENT-207 exposes one reusable planner for every specialist", () => {
  const platform = new BeastAgentsPlatform();
  assert.equal(platform.planner instanceof SharedAgentPlanningEngine, true);
  assert.equal(platform.planner.policy("beastmoney.money-coach").specialistId, "beastmoney.money-coach");
  assert.equal(platform.planner.policy("beasteducation.guidance-counselor").specialistId, "beasteducation.guidance-counselor");
  assert.equal(platform.planner.policy("beasthealth.health-advisor").specialistId, "beasthealth.health-advisor");
  assert.equal(platform.planner.policy("beastos.personal-assistant").specialistId, "beastos.personal-assistant");
});

test("AGENT-207 plans understand retrieve reason and answer across all need types", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.guidanceCounselor);
  const plan = planner.createPlan({ specialistId: "beasteducation.guidance-counselor", input: "Help me compare two paths", intent: "compare", topics: ["path-a", "path-b"], confidence: 0.95, requirements: [
    { id: "records", kind: "information", description: "Retrieve current learner records", required: true },
    { id: "preferences", kind: "memory", description: "Retrieve relevant preferences", required: false },
    { id: "curriculum", kind: "specialist-knowledge", description: "Retrieve curriculum knowledge", required: true, providerId: "curriculum" },
    { id: "official", kind: "external-knowledge", description: "Retrieve official provider guidance", required: false, providerId: "official-provider" },
    { id: "comparison", kind: "tool", description: "Run comparison tool", required: true, toolId: "compare-paths" },
  ] }, new Date("2026-07-22T12:00:00Z"));
  assert.deepEqual(plan.steps.map((step) => step.kind), ["understand", "retrieve-information", "retrieve-memory", "retrieve-specialist-knowledge", "retrieve-external-knowledge", "use-tool", "reason", "answer"]);
  assert.equal(plan.requiresClarification, false);
});

test("AGENT-207 asks focused clarification before retrieval when confidence is low", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.healthAdvisor);
  const plan = planner.createPlan({ specialistId: "beasthealth.health-advisor", input: "What about that?", topics: ["care plan"], confidence: 0.45, ambiguous: true });
  assert.equal(plan.requiresClarification, true);
  assert.deepEqual(plan.steps.map((step) => step.kind), ["understand", "clarify"]);
  assert.match(plan.clarificationQuestion || "", /care plan/i);
});

test("AGENT-207 respects specialist tool knowledge and external-source permissions", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy({ specialistId: "future.specialist", clarificationConfidenceThreshold: 0.7, maximumSteps: 8, allowedToolIds: ["allowed-tool"], allowedKnowledgeProviderIds: ["allowed-provider"], allowExternalKnowledge: false, stopWhenEnoughInformationExists: true });
  const plan = planner.createPlan({ specialistId: "future.specialist", input: "Evaluate this", confidence: 0.9, requirements: [
    { id: "allowed-tool", kind: "tool", description: "Allowed tool", required: true, toolId: "allowed-tool" },
    { id: "blocked-tool", kind: "tool", description: "Blocked tool", required: false, toolId: "blocked-tool" },
    { id: "knowledge", kind: "specialist-knowledge", description: "Allowed knowledge", required: true, providerId: "allowed-provider" },
    { id: "external", kind: "external-knowledge", description: "External knowledge", required: false, providerId: "allowed-provider" },
  ] });
  assert.ok(plan.steps.some((step) => step.toolId === "allowed-tool"));
  assert.ok(!plan.steps.some((step) => step.toolId === "blocked-tool"));
  assert.ok(!plan.steps.some((step) => step.kind === "retrieve-external-knowledge"));
});

test("AGENT-207 terminates retrieval early once enough information exists", async () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.personalAssistant);
  const plan = planner.createPlan({ specialistId: "beastos.personal-assistant", input: "What is next?", confidence: 0.95, requirements: [
    { id: "calendar", kind: "information", description: "Retrieve calendar", required: true },
    { id: "memory", kind: "memory", description: "Retrieve memory", required: false },
  ] });
  const executed: string[] = [];
  const execution = await planner.execute(plan, { async execute(step: AgentPlanStep) { executed.push(step.id); return step.requirementId === "calendar" ? { stepId: step.id, kind: step.kind, content: "Enough", sufficient: true } : undefined; } });
  assert.equal(execution.terminatedEarly, true);
  assert.equal(execution.steps.find((step) => step.requirementId === "memory")?.status, "skipped");
  assert.equal(execution.answerReady, true);
  assert.ok(executed.includes("reason"));
  assert.ok(executed.includes("answer"));
});

test("AGENT-207 clarification execution stops without fabricating an answer", async () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy({ ...specialistAgentPlanningPolicies.moneyCoach, specialistId: "future.money-like" });
  const plan = planner.createPlan({ specialistId: "future.money-like", input: "Which one?", confidence: 0.4, ambiguous: true });
  const execution = await planner.execute(plan, { async execute() { throw new Error("should not execute retrieval"); } });
  assert.equal(execution.requiresClarification, true);
  assert.equal(execution.answerReady, false);
  assert.equal(execution.artifacts.length, 0);
});

test("AGENT-207 enforces bounded multi-step plans", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy({ ...specialistAgentPlanningPolicies.moneyCoach, specialistId: "bounded", maximumSteps: 3 });
  assert.throws(() => planner.createPlan({ specialistId: "bounded", input: "Review", confidence: 0.9, requirements: [{ id: "one", kind: "information", description: "One", required: true }, { id: "two", kind: "memory", description: "Two", required: true }] }), /policy allows 3/);
});
