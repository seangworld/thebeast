import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync("src/app/components/agents/ProfessionalConversationWorkspace.tsx", "utf8");
const guidance = readFileSync("src/app/dashboard/learning/GuidanceCounselorConversation.tsx", "utf8");
const money = readFileSync("src/app/dashboard/money/components/MoneyCoachExperience.tsx", "utf8");

test("DS-UX-02 keeps member professional history on demand", () => {
  assert.match(workspace, /data-professional-history-on-demand/);
  assert.doesNotMatch(workspace, /lg:grid-cols-\[18rem_minmax\(0,1fr\)\]/);
  assert.match(workspace, /fixed inset-0 z-50 bg-black\/70 p-3/);
  assert.match(workspace, /role="dialog"/);
  for (const source of [guidance, money]) {
    assert.match(source, /Conversations/);
    assert.match(source, /New conversation/);
    assert.doesNotMatch(source, /min-h-11 lg:hidden/);
  }
});

test("DS-UX-02 preserves the shared conversation geometry", () => {
  assert.match(workspace, /max-w-3xl/);
  assert.match(workspace, /data-professional-active-scroll/);
  assert.match(workspace, /ProfessionalConversationComposer/);
  assert.match(workspace, /Jump to Latest/);
  assert.match(guidance, /ProfessionalConversationTimeline/);
  assert.match(money, /ProfessionalConversationTimeline/);
});
