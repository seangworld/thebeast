import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/app/dashboard/learning/activities/LessonEngine.tsx",
  "utf8"
);
const sharedScroll = readFileSync(
  "src/app/components/agents/useConversationScroll.ts",
  "utf8"
);
const workspace = readFileSync(
  "src/app/components/agents/ProfessionalConversationWorkspace.tsx",
  "utf8"
);
const agentExperience = readFileSync(
  "src/app/components/agents/AgentExperience.tsx",
  "utf8"
);

test("BL-409 polishes Mentor message grouping and conversation rhythm", () => {
  assert.match(source, /ProfessionalConversationTimeline/);
  assert.match(workspace, /max-w-3xl/);
  assert.match(workspace, /sm:py-8/);
  assert.match(source, /AgentStreamingResponseArea/);
  assert.match(workspace, /message\.streaming/);
});

test("BL-409 preserves learner-controlled scrolling with a latest-message affordance", () => {
  assert.match(workspace, /useConversationScroll/);
  assert.match(sharedScroll, /latestThreshold = 48/);
  assert.match(workspace, /onScroll=\{handleScroll\}/);
  assert.match(workspace, /showJumpToLatest/);
  assert.match(workspace, /Jump to Latest/);
  assert.match(sharedScroll, /followingLatestRef/);
  assert.match(workspace, /overscroll-contain/);
});

test("BL-409 presents a compact accessible composer prompts and reflection flow", () => {
  assert.match(source, /label="Suggested learning prompts"/);
  assert.match(source, /ProfessionalConversationComposer/);
  assert.match(agentExperience, /event\.nativeEvent\.isComposing/);
  assert.match(agentExperience, /Sending…/);
  assert.match(source, /Reflection captured/);
  assert.match(source, /Add a reflection to finish/);
  assert.match(source, /Finish lesson/);
});
