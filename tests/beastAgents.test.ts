import test from "node:test";
import assert from "node:assert/strict";
import {
  BeastAgentsPlatform,
  InMemoryAgentMemoryStore,
  generationTwoDesignPrinciples,
  type AgentDefinition,
  type AgentModuleManifest,
} from "../src/lib/platform/agents";

const experience = {
  userStoryProviderId: "foundation.user-story",
  proactiveGuidance: true,
  progressiveCompletion: true,
  relationshipMemoryScope: "user",
  fallbackAction: "Return to the module's safe starting point.",
} as const;

function foundationAgent(overrides: Partial<AgentDefinition> = {}): AgentDefinition {
  return {
    id: "foundation-guide",
    moduleId: "foundation",
    displayName: "Foundation Guide",
    description: "Domain-neutral test agent.",
    version: "1.0.0",
    promptTemplateId: "foundation.prompt",
    requestedToolIds: ["foundation.echo"],
    requestedPermissions: [
      { resource: "foundation.story", actions: ["read"], effect: "allow" },
      { resource: "foundation.echo", actions: ["execute"], effect: "allow" },
    ],
    experience,
    ...overrides,
  };
}

function foundationManifest(): AgentModuleManifest {
  return {
    id: "foundation",
    displayName: "Foundation Module",
    version: "1.0.0",
    agents: [foundationAgent()],
    tools: [
      {
        id: "foundation.echo",
        moduleId: "foundation",
        description: "Echoes platform-neutral input.",
        inputSchema: { type: "string" },
        requiredPermission: { resource: "foundation.echo", action: "execute" },
        execute: async (input) => input,
      },
    ],
    contextProviders: [
      {
        id: "foundation.user-story",
        moduleId: "foundation",
        description: "Provides a permissioned user-story fragment.",
        provide: async () => [
          {
            id: "story-1",
            providerId: "foundation.user-story",
            source: "foundation",
            content: { summary: "A meaningful user story." },
            sensitivity: "sensitive",
            requiredPermission: { resource: "foundation.story", action: "read" },
          },
          {
            id: "restricted-1",
            providerId: "foundation.user-story",
            source: "foundation",
            content: { secret: true },
            sensitivity: "sensitive",
            requiredPermission: { resource: "foundation.secret", action: "read" },
          },
        ],
      },
    ],
    promptTemplates: [
      {
        id: "foundation.prompt",
        moduleId: "foundation",
        version: "1.0.0",
        system: "Guide {{name}} through the next useful step.",
        constraints: ["Preserve {{name}}'s control."],
        variables: ["name"],
      },
    ],
  };
}

test("BeastAgents lets a module register through one manifest boundary", () => {
  const platform = new BeastAgentsPlatform();
  platform.registerModule(foundationManifest());
  assert.equal(platform.registry.require("foundation-guide").moduleId, "foundation");
  assert.equal(platform.registry.listModules()[0].id, "foundation");
  assert.equal(platform.tools.get("foundation.echo")?.moduleId, "foundation");
  assert.throws(() => platform.registerModule(foundationManifest()), /already registered/);
});

test("module registration rejects invalid ownership atomically", () => {
  const platform = new BeastAgentsPlatform();
  const manifest = foundationManifest();
  assert.throws(
    () => platform.registerModule({
      ...manifest,
      tools: manifest.tools?.map((tool) => ({ ...tool, moduleId: "other-module" })),
    }),
    /must be owned by module foundation/,
  );
  assert.equal(platform.registry.listModules().length, 0);
  assert.equal(platform.registry.list().length, 0);
  assert.equal(platform.tools.get("foundation.echo"), undefined);
});

test("agent permissions default deny and explicit deny wins", () => {
  const platform = new BeastAgentsPlatform();
  const agent = foundationAgent({
    requestedPermissions: [
      { resource: "record", actions: ["read"], effect: "allow" },
      { resource: "record", actions: ["read"], effect: "deny" },
    ],
  });
  assert.equal(platform.permissions.can(agent, "record", "read"), false);
  assert.equal(platform.permissions.can(agent, "record", "write"), false);
});

test("tools require registration request and permission at invocation time", async () => {
  const platform = new BeastAgentsPlatform();
  platform.registerModule(foundationManifest());
  assert.equal(await platform.tools.invoke("foundation.echo", "hello", { agentId: "foundation-guide", moduleId: "foundation" }), "hello");

  const blocked = new BeastAgentsPlatform();
  blocked.registerModule({ ...foundationManifest(), agents: [foundationAgent({ requestedPermissions: [] })] });
  await assert.rejects(
    blocked.tools.invoke("foundation.echo", "hello", { agentId: "foundation-guide", moduleId: "foundation" }),
    /not permitted/,
  );
});

test("context assembly includes only explicitly permissioned sensitive context", async () => {
  const platform = new BeastAgentsPlatform();
  platform.registerModule(foundationManifest());
  const context = await platform.context.assemble({ agentId: "foundation-guide", ownerId: "owner-1" });
  assert.deepEqual(context.map((item) => item.id), ["story-1"]);
});

test("shared memory remains owner scoped purpose limited expirable and deletable", async () => {
  const memory = new InMemoryAgentMemoryStore();
  const base = {
    agentId: "foundation-guide",
    scope: "user" as const,
    key: "relationship-summary",
    value: "Meaningful continuity",
    purpose: "Maintain the user relationship",
    createdAt: "2026-07-21T12:00:00.000Z",
    updatedAt: "2026-07-21T12:00:00.000Z",
  };
  await memory.put({ ...base, id: "memory-1", ownerId: "owner-1" });
  await memory.put({ ...base, id: "memory-2", ownerId: "owner-2" });
  await memory.put({ ...base, id: "expired", ownerId: "owner-1", expiresAt: "2020-01-01T00:00:00.000Z" });
  await assert.rejects(memory.put({ ...base, id: "memory-1", ownerId: "owner-2" }), /different owner or agent/);
  assert.deepEqual((await memory.query({ agentId: "foundation-guide", ownerId: "owner-1" })).map((item) => item.id), ["memory-1"]);
  assert.equal(await memory.delete({ agentId: "foundation-guide", ownerId: "owner-1" }), 2);
  assert.equal((await memory.query({ agentId: "foundation-guide", ownerId: "owner-2" })).length, 1);
});

test("event bus communication and lifecycle publish auditable events", async () => {
  const platform = new BeastAgentsPlatform();
  platform.registerModule(foundationManifest());
  const eventTypes: string[] = [];
  const unsubscribe = platform.events.subscribe("*", (event) => {
    eventTypes.push(event.type);
  });
  await platform.lifecycle.transition("foundation-guide", "initializing");
  await platform.lifecycle.transition("foundation-guide", "ready");
  await platform.communication.send({
    id: "message-1",
    threadId: "thread-1",
    sender: { kind: "user", id: "owner-1" },
    recipient: { kind: "agent", id: "foundation-guide" },
    content: "Help me continue.",
    timestamp: "2026-07-21T12:00:00.000Z",
  });
  unsubscribe();
  assert.deepEqual(eventTypes, ["agent.lifecycle.changed", "agent.lifecycle.changed", "agent.message.sent"]);
  assert.equal(platform.communication.history("thread-1").length, 1);
  await assert.rejects(platform.lifecycle.transition("foundation-guide", "initializing"), /Invalid agent lifecycle transition/);
});

test("prompt framework renders versioned templates and requires variables", () => {
  const platform = new BeastAgentsPlatform();
  platform.registerModule(foundationManifest());
  assert.deepEqual(platform.prompts.render("foundation.prompt", { name: "Alex" }), {
    templateId: "foundation.prompt",
    version: "1.0.0",
    system: "Guide Alex through the next useful step.",
    constraints: ["Preserve Alex's control."],
  });
  assert.throws(() => platform.prompts.render("foundation.prompt", {}), /variable name is required/);
});

test("communication API rejects unavailable agents with a no-dead-end fallback", async () => {
  const platform = new BeastAgentsPlatform();
  platform.registerModule(foundationManifest());
  const rejected = await platform.accept({
    requestId: "request-1",
    threadId: "thread-1",
    agentId: "foundation-guide",
    ownerId: "owner-1",
    input: "Continue",
  });
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.nextAction, experience.fallbackAction);

  await platform.lifecycle.transition("foundation-guide", "initializing");
  await platform.lifecycle.transition("foundation-guide", "ready");
  const accepted = await platform.accept({
    requestId: "request-2",
    threadId: "thread-1",
    agentId: "foundation-guide",
    ownerId: "owner-1",
    input: "Continue",
  });
  assert.equal(accepted.status, "accepted");
  assert.deepEqual(accepted.availableToolIds, ["foundation.echo"]);
  assert.deepEqual(accepted.context.map((item) => item.id), ["story-1"]);
  assert.match(accepted.nextAction, /smallest useful guided step/);
});

test("Generation 2 principles are explicit and registration enforces relationship design", () => {
  assert.equal(generationTwoDesignPrinciples.length, 10);
  assert.ok(generationTwoDesignPrinciples.includes("Agents own relationships."));
  const platform = new BeastAgentsPlatform();
  assert.throws(
    () => platform.registry.registerAgent(foundationAgent({ experience: { ...experience, fallbackAction: "" } })),
    /fallback action is required/,
  );
});
