import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { digitalProfessionals } from "../src/lib/digitalStaff";

const identity = readFileSync(
  "src/app/components/agents/ProfessionalConversationIdentity.tsx",
  "utf8"
);
const avatar = readFileSync(
  "src/app/components/agents/AgentExperience.tsx",
  "utf8"
);
const timeline = readFileSync(
  "src/app/components/agents/ProfessionalConversationWorkspace.tsx",
  "utf8"
);
const money = readFileSync(
  "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
  "utf8"
);
const guidance = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
  "utf8"
);
const health = readFileSync(
  "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
  "utf8"
);
const documentation = readFileSync(
  "docs/AI_PROFESSIONAL_CONVERSATION_ARCHITECTURE.md",
  "utf8"
);

test("AP-001 registry provides unique complete identity for every current professional", () => {
  assert.deepEqual(
    digitalProfessionals.map((professional) => professional.id),
    ["fusion-director", "money-coach", "guidance-counselor", "health-advisor"]
  );
  assert.equal(
    new Set(digitalProfessionals.map((professional) => professional.canonicalId)).size,
    digitalProfessionals.length
  );
  assert.equal(
    new Set(digitalProfessionals.map((professional) => professional.portrait.avatar_url)).size,
    digitalProfessionals.length
  );
  for (const professional of digitalProfessionals) {
    assert.equal(Boolean(professional.name && professional.role && professional.title), true);
    assert.equal(professional.portrait.avatar_url, `/digital-staff/${professional.id}.webp`);
  }
  for (const field of [
    "canonicalId",
    "avatarDescription",
    "moduleAssociation",
    "accent",
  ]) {
    assert.match(identity, new RegExp(field));
  }
  assert.match(identity, /Unknown Digital Professional/);
});

test("AP-001 avatar falls back intentionally when a configured image fails", () => {
  assert.match(avatar, /imageFailed/);
  assert.match(avatar, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(avatar, /data-agent-avatar-fallback/);
  assert.match(identity, /initials: getDigitalProfessionalInitials/);
  assert.match(identity, /accessibleLabel=\{identity\.avatarDescription\}/);
});

test("AP-001 stored streaming and reloaded turns retain registered professional identity", () => {
  for (const [source, identityName] of [
    [money, "moneyCoachConversationIdentity"],
    [guidance, "guidanceCounselorConversationIdentity"],
    [health, "healthAdvisorConversationIdentity"],
  ] as const) {
    assert.match(source, /restore(?:Thread|HealthAdvisorTurns)/);
    assert.match(source, /streaming:/);
    assert.match(source, new RegExp(`professionalIdentity=[\\s\\S]{0,100}${identityName}`));
  }
  assert.match(timeline, /message\.role === "agent" && professionalIdentity/);
  assert.match(timeline, /ProfessionalConversationAvatar/);
});

test("AP-001 New Conversation creates a separate thread and clears only the active view", () => {
  for (const [source, clearPattern] of [
    [money, /setTurns\(\[\]\)/],
    [guidance, /setTurns\(\[\]\)/],
    [health, /setQuestionTurns\(\[\]\)/],
  ] as const) {
    assert.match(source, /\.create\(\{/);
    assert.match(source, clearPattern);
    assert.match(source, /setActive(?:ThreadId|ConversationId)\(thread\.id\)/);
    assert.match(source, /refresh(?:Threads|ConversationThreads)/);
  }
  assert.match(timeline, /previousConversationIdRef\.current !== conversationId/);
  assert.match(timeline, /headingRef\.current\?\.focus/);
});

test("AP-001 message accessibility and responsive layout do not depend on avatar or color", () => {
  assert.match(timeline, /aria-label=\{`Message from/);
  assert.match(timeline, /professionalIdentity\.name/);
  assert.match(timeline, /professionalIdentity\.role/);
  assert.match(timeline, /shrink-0/);
  assert.match(timeline, /min-w-0 max-w-full overflow-x-auto break-words/);
  assert.match(timeline, /tabIndex=\{-1\}/);
});

test("AP-001 documents registration and shared presentation boundaries", () => {
  assert.match(documentation, /canonical professional registry/i);
  assert.match(documentation, /ProfessionalConversationTimeline/);
  assert.match(documentation, /failed image renders the registered professional’s initials/i);
  assert.match(documentation, /do not change conversation ownership, RLS/i);
});
