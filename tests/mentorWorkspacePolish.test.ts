import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/app/dashboard/learning/activities/LessonEngine.tsx",
  "utf8"
);

test("BL-409 polishes Mentor message grouping and conversation rhythm", () => {
  assert.match(source, /groupedWithPrevious/);
  assert.match(source, /mx-auto max-w-3xl space-y-5/);
  assert.match(source, /sm:text-\[0\.9375rem\] sm:leading-7/);
  assert.match(source, /Guidance Counselor Tutor and learner messages/);
  assert.match(source, /Your learning specialist is responding/);
  assert.match(source, /motion-reduce:transition-none/);
});

test("BL-409 preserves learner-controlled scrolling with a latest-message affordance", () => {
  assert.match(source, /distanceFromLatest <= 56/);
  assert.match(source, /onScroll=\{handleConversationScroll\}/);
  assert.match(source, /!followingLatest/);
  assert.match(source, /Jump to latest/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /overscroll-contain/);
});

test("BL-409 presents a compact accessible composer prompts and reflection flow", () => {
  assert.match(source, /aria-label="Suggested learning prompts"/);
  assert.match(source, /rows=\{2\}/);
  assert.match(source, /focus-within:border-indigo-300\/45/);
  assert.match(source, /Enter to send · Shift \+ Enter for a new line/);
  assert.match(source, /aria-label=\{isResponding \? "Sending message" : "Send message"\}/);
  assert.match(source, /Reflection captured/);
  assert.match(source, /Add a reflection to finish/);
  assert.match(source, /Finish lesson/);
});
