import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shared = readFileSync(
  "src/app/components/agents/ProfessionalConversationWorkspace.tsx",
  "utf8"
);
const framework = readFileSync(
  "src/app/components/agents/ProfessionalExperienceFramework.tsx",
  "utf8"
);
const agentExports = readFileSync("src/app/components/agents/index.ts", "utf8");
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
const identity = readFileSync(
  "src/app/components/agents/ProfessionalConversationIdentity.tsx",
  "utf8"
);

test("BE-223 provides one shared professional conversation workspace", () => {
  assert.match(agentExports, /ProfessionalConversationWorkspace/);
  assert.match(agentExports, /ProfessionalExperienceFramework/);
  assert.match(shared, /data-professional-conversation-workspace/);
  for (const source of [money, guidance]) {
    assert.match(source, /<ProfessionalExperienceFramework/);
    assert.match(source, /<ProfessionalConversationTimeline/);
    assert.match(source, /<ProfessionalConversationComposer/);
  }
  assert.match(framework, /<ProfessionalConversationWorkspace/);
});

test("BE-223 shares scrolling, streaming, message layout, and responsive behavior", () => {
  assert.match(shared, /useConversationScroll/);
  assert.match(shared, /showJumpToLatest/);
  assert.match(shared, /overscroll-contain/);
  assert.match(shared, /message\.streaming/);
  assert.match(shared, /data-message-role/);
  assert.match(shared, /grid gap-5/);
  assert.match(shared, /rounded-2xl border/);
  assert.match(shared, /lg:grid-cols-\[18rem_minmax\(0,1fr\)\]/);
  assert.match(shared, /lg:hidden/);
});

test("AP-001 gives every current Digital Professional a shared message identity", () => {
  assert.match(identity, /professionalConversationRegistry/);
  assert.match(identity, /digitalProfessionals\.map/);
  assert.match(identity, /professional\.portrait\.avatar_url/);
  assert.match(identity, /moneyCoachConversationIdentity/);
  assert.match(identity, /guidanceCounselorConversationIdentity/);
  assert.match(identity, /healthAdvisorConversationIdentity/);
  assert.match(shared, /<ProfessionalConversationAvatar/);
  assert.match(shared, /professionalIdentity\.name/);
  assert.match(shared, /professionalIdentity\.role/);
  assert.match(shared, /data-professional-accent/);

  for (const [source, identityName] of [
    [money, "moneyCoachConversationIdentity"],
    [guidance, "guidanceCounselorConversationIdentity"],
    [health, "healthAdvisorConversationIdentity"],
  ] as const) {
    assert.match(
      source,
      new RegExp(`professionalIdentity=[\\s\\S]{0,80}${identityName}`)
    );
  }
});

test("AP-001 timestamps persisted turns without inventing opening-message times", () => {
  assert.match(identity, /formatProfessionalMessageTime/);
  for (const source of [money, guidance, health]) {
    assert.match(source, /formatProfessionalMessageTime\(turn\.timestamp\)/);
  }
  assert.doesNotMatch(
    shared,
    /new Date\(\).*data-agent-conversation-timeline/
  );
});

test("BE-223 gives Guidance Counselor durable owner-scoped conversation history", () => {
  assert.match(guidance, /ServerAgentConversationRepository/);
  assert.match(guidance, /SupabaseAgentConversationStore/);
  assert.match(guidance, /agentId: professionalId/);
  assert.match(guidance, /ownerId: memberId/);
  assert.match(guidance, /<ProfessionalConversationHistory/);
  assert.match(framework, /Pinned conversations/);
  assert.match(framework, /Recent conversations/);
  assert.match(framework, /Archived/);
  assert.match(framework, /Search \{professionalName\} conversations/);
});

test("BE-223 preserves only the professional-specific identity and guidance", () => {
  assert.match(money, /professionalName="Money Coach"/);
  assert.match(guidance, /professionalName="Guidance Counselor"/);
  assert.match(guidance, /Guidance Counselor response/);
  assert.match(guidance, /guidanceCounselorSuggestedQuestions/);
  assert.doesNotMatch(shared, /Money Coach|Guidance Counselor|BeastMoney|BeastEducation/);
});
