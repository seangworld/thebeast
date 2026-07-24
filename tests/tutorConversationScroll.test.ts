import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tutor = readFileSync(
  "src/app/dashboard/learning/activities/LessonEngine.tsx",
  "utf8"
);
const moneyCoach = readFileSync(
  "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
  "utf8"
);
const professionalWorkspace = readFileSync(
  "src/app/components/agents/ProfessionalConversationWorkspace.tsx",
  "utf8"
);
const sharedScroll = readFileSync(
  "src/app/components/agents/useConversationScroll.ts",
  "utf8"
);

test("BE-213 Tutor and Money Coach reuse one conversation scroll behavior", () => {
  assert.match(tutor, /useConversationScroll/);
  assert.match(moneyCoach, /ProfessionalConversationTimeline/);
  assert.match(professionalWorkspace, /useConversationScroll/);
  assert.doesNotMatch(tutor, /useLayoutEffect/);
  assert.doesNotMatch(tutor, /const distanceFromLatest/);
});

test("BE-213 preserves manual position during messages and streaming", () => {
  assert.match(sharedScroll, /if \(followingLatestRef\.current\) scrollToLatest/);
  assert.match(sharedScroll, /ResizeObserver/);
  assert.match(sharedScroll, /pauseFollowingLatest/);
  assert.match(sharedScroll, /event\.deltaY < 0/);
  assert.match(sharedScroll, /currentY > touchStartYRef\.current/);
  assert.match(sharedScroll, /requestAnimationFrame/);
  assert.doesNotMatch(sharedScroll, /scrollIntoView/);
});

test("BE-213 follows a member send and offers an accessible return to latest", () => {
  assert.match(tutor, /scrollToLatest\("smooth"\)/);
  assert.match(tutor, /showJumpToLatest/);
  assert.match(tutor, /aria-label="Jump to latest Tutor response"/);
  assert.match(tutor, /overscroll-contain/);
});

test("BE-213 preserves composer focus and IME input behavior", () => {
  assert.match(tutor, /event\.nativeEvent\.isComposing/);
  assert.match(tutor, /\.focus\(\{ preventScroll: true \}\)/);
  assert.match(tutor, /requestAnimationFrame/);
});
