import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tutor = readFileSync(
  "src/app/dashboard/learning/activities/LessonEngine.tsx",
  "utf8"
);
const workspace = readFileSync(
  "src/app/components/agents/ProfessionalConversationWorkspace.tsx",
  "utf8"
);
const scroll = readFileSync(
  "src/app/components/agents/useConversationScroll.ts",
  "utf8"
);
const composer = readFileSync(
  "src/app/components/agents/AgentExperience.tsx",
  "utf8"
);

test("BE-224 reuses the BeastMoney message timeline and composer", () => {
  assert.match(tutor, /ProfessionalConversationTimeline/);
  assert.match(tutor, /ProfessionalConversationComposer/);
  assert.match(tutor, /AgentConversationInput/);
  assert.match(tutor, /AgentSuggestedActions/);
  assert.doesNotMatch(tutor, /function messageBubbleClasses/);
});

test("BE-224 preserves position while reading and streaming", () => {
  assert.match(workspace, /useConversationScroll/);
  assert.match(workspace, /streaming/);
  assert.match(scroll, /ResizeObserver/);
  assert.match(scroll, /if \(followingLatestRef\.current\) scrollToLatest/);
  assert.match(scroll, /pauseFollowingLatest/);
  assert.match(scroll, /scrollPositions\?\.current/);
  assert.match(tutor, /conversationScrollPositionsRef/);
});

test("BE-224 follows explicit Tutor sends and keeps composer focus", () => {
  assert.match(tutor, /followLatestSignal=\{learnerMessageCount\}/);
  assert.match(scroll, /followLatestSignal/);
  assert.match(scroll, /scrollToLatest\("smooth"\)/);
  assert.match(tutor, /\.focus\(\{ preventScroll: true \}\)/);
  assert.match(composer, /event\.nativeEvent\.isComposing/);
  assert.match(composer, /requestSubmit/);
});

test("BE-224 retains lesson conversation history and streaming rendering", () => {
  assert.match(tutor, /window\.localStorage\.getItem\(draftKey\)/);
  assert.match(tutor, /window\.localStorage\.setItem/);
  assert.match(tutor, /AgentStreamingResponseArea/);
  assert.match(tutor, /streamingTutorMessageId/);
  assert.match(workspace, /data-agent-conversation-timeline/);
  assert.match(workspace, /aria-live="polite"/);
});
