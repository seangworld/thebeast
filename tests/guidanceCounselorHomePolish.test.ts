import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");
const orientation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorOrientation.tsx",
  "utf8"
);
const conversation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
  "utf8"
);
const recommendation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
  "utf8"
);
const loading = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorHomeLoading.tsx",
  "utf8"
);

test("BE-212 immediately communicates identity direction and next step", () => {
  assert.match(orientation, /I know you/);
  assert.match(orientation, /Where we’re going/);
  assert.match(orientation, /What we should do next/);
  assert.match(page, /memberName=\{fallbackName \|\| "Member"\}/);
  assert.match(page, /nextStep=\{missionControl\.mission\.missionTitle\}/);
});

test("BE-212 makes the conversation the primary organized flow", () => {
  const orientationIndex = page.indexOf("<GuidanceCounselorOrientation");
  const conversationIndex = page.indexOf("<GuidanceCounselorConversation");
  const recommendationIndex = page.indexOf("<GuidanceCounselorRecommendation");
  const roadmapIndex = page.indexOf("<EducationalCareerRoadmap");

  assert.equal(orientationIndex < conversationIndex, true);
  assert.equal(conversationIndex < recommendationIndex, true);
  assert.equal(recommendationIndex < roadmapIndex, true);
  assert.match(page, /data-guidance-primary-flow="true"/);
  assert.match(conversation, /data-guidance-home-primary="true"/);
  assert.match(conversation, /shadow-\[0_26px_90px/);
});

test("BE-212 improves responsive hierarchy and restrained transitions", () => {
  assert.match(orientation, /sm:grid-cols-3/);
  assert.match(recommendation, /lg:grid-cols-/);
  assert.match(recommendation, /transition-\[border-color,box-shadow\]/);
  assert.match(conversation, /focus-within:border-indigo-300\/40/);
  assert.match(page, /space-y-8 sm:space-y-10/);
});

test("BE-212 provides honest homepage and conversation loading states", () => {
  assert.match(loading, /data-guidance-home-loading="true"/);
  assert.match(loading, /Preparing your relationship, direction, and next step/);
  assert.match(conversation, /aria-busy=\{!historyReady\}/);
  assert.match(conversation, /Restoring your Guidance Counselor conversation/);
  assert.match(
    readFileSync("src/app/dashboard/education/loading.tsx", "utf8"),
    /GuidanceCounselorHomeLoading/
  );
});

test("BE-212 keeps empty planning context honest without adding features", () => {
  assert.match(page, /We’ll define your educational direction together/);
  assert.match(page, /No career direction has been confirmed yet/);
  assert.match(conversation, /Courses and Tutor support remain available/);
  assert.doesNotMatch(orientation, /mock|sample|placeholder/i);
});
