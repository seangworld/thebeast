import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shared = readFileSync(
  "src/app/components/agents/ProfessionalConversationWorkspace.tsx",
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

test("BE-223 provides one shared professional conversation workspace", () => {
  assert.match(agentExports, /ProfessionalConversationWorkspace/);
  assert.match(shared, /data-professional-conversation-workspace/);
  for (const source of [money, guidance]) {
    assert.match(source, /<ProfessionalConversationWorkspace/);
    assert.match(source, /<ProfessionalConversationTimeline/);
    assert.match(source, /<ProfessionalConversationComposer/);
  }
});

test("BE-223 shares scrolling, streaming, message layout, and responsive behavior", () => {
  assert.match(shared, /useConversationScroll/);
  assert.match(shared, /showJumpToLatest/);
  assert.match(shared, /overscroll-contain/);
  assert.match(shared, /message\.streaming/);
  assert.match(shared, /data-message-role/);
  assert.match(shared, /sm:py-8/);
  assert.match(shared, /lg:grid-cols-\[18rem_minmax\(0,1fr\)\]/);
  assert.match(shared, /lg:hidden/);
});

test("BE-223 gives Guidance Counselor durable owner-scoped conversation history", () => {
  assert.match(guidance, /ServerAgentConversationRepository/);
  assert.match(guidance, /SupabaseAgentConversationStore/);
  assert.match(guidance, /agentId: professionalId/);
  assert.match(guidance, /ownerId: memberId/);
  assert.match(guidance, /Pinned Conversations/);
  assert.match(guidance, /Recent Conversations/);
  assert.match(guidance, /Archived/);
  assert.match(guidance, /Search conversations/);
});

test("BE-223 preserves only the professional-specific identity and guidance", () => {
  assert.match(money, /professionalName="Money Coach"/);
  assert.match(guidance, /professionalName="Guidance Counselor"/);
  assert.match(guidance, /Guidance Counselor response/);
  assert.match(guidance, /guidanceCounselorSuggestedQuestions/);
  assert.doesNotMatch(shared, /Money Coach|Guidance Counselor|BeastMoney|BeastEducation/);
});
