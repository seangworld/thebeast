import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
  "utf8"
);
const sharedScroll = readFileSync(
  "src/app/components/agents/useConversationScroll.ts",
  "utf8"
);

test("BM-305A follows new messages and streaming content without fighting manual scroll", () => {
  assert.match(source, /useConversationScroll/);
  assert.match(source, /messageCount: messages\.length/);
  assert.match(sharedScroll, /followingLatestRef/);
  assert.match(sharedScroll, /ResizeObserver/);
  assert.match(sharedScroll, /if \(followingLatestRef\.current\) scrollToLatest/);
  assert.match(sharedScroll, /isAtLatest/);
  assert.match(sharedScroll, /requestAnimationFrame/);
  assert.match(sharedScroll, /pauseFollowingLatest/);
  assert.match(sharedScroll, /event\.deltaY < 0/);
  assert.match(sharedScroll, /touchStartYRef/);
  assert.match(sharedScroll, /currentY > touchStartYRef\.current/);
  assert.match(source, /overscroll-contain/);
  assert.doesNotMatch(sharedScroll, /scrollIntoView/);
});

test("BM-305A provides an accessible jump-to-latest control", () => {
  assert.match(source, /Jump to Latest/);
  assert.match(source, /aria-label="Jump to latest Money Coach response"/);
  assert.match(source, /onClick=\{\(\) => scrollToLatest\("smooth"\)\}/);
  assert.match(source, /min-h-11/);
});

test("BM-305A restores independent positions when conversations switch", () => {
  assert.match(source, /conversationScrollPositionsRef/);
  assert.match(source, /new Map<string, number>/);
  assert.match(sharedScroll, /scrollPositions\?\.current\.get\(conversationId\)/);
  assert.match(sharedScroll, /scrollPositions\?\.current\.set\(conversationId, region\.scrollTop\)/);
  assert.match(source, /conversationId=\{activeThreadId \|\| "new-conversation"\}/);
});

test("BM-305A focuses the composer without moving the viewport", () => {
  assert.match(source, /\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /window\.requestAnimationFrame\(focusQuestionInput\)/);
  assert.match(source, /finally\(\(\) => \{\s*setStreamingTurnId\(""\)/);
  assert.match(source, /startConversation/);
});

test("BM-305A keeps one bounded responsive conversation viewport", () => {
  assert.match(source, /h-\[36rem\]/);
  assert.match(source, /h-full overflow-y-auto/);
  assert.match(source, /max-w-3xl/);
  assert.match(source, /sm:px-4/);
  assert.match(source, /lg:grid-cols-\[18rem_minmax\(0,1fr\)\]/);
  assert.match(source, /ServerAgentConversationRepository/);
});
