import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");
const recommendation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
  "utf8"
);

test("BE-220 orders the office experience before the supporting workspace", () => {
  const greeting = page.indexOf("Welcome to your Guidance Counselor’s office");
  const orientation = page.indexOf("<GuidanceCounselorOrientation");
  const conversation = page.indexOf("<GuidanceCounselorConversation");
  const decision = page.indexOf("<GuidanceCounselorRecommendation");
  const supporting = page.indexOf('data-guidance-supporting-workspace="true"');

  assert.ok(greeting < orientation);
  assert.ok(orientation < conversation);
  assert.ok(conversation < decision);
  assert.ok(decision < supporting);
});

test("BE-220 orders recommendation roadmap summary and assignment explicitly", () => {
  const current = recommendation.indexOf("Current recommendation");
  const roadmap = recommendation.indexOf("Educational Roadmap summary");
  const assignment = recommendation.indexOf(
    "Today’s assignment from your Guidance Counselor"
  );

  assert.ok(current < roadmap);
  assert.ok(roadmap < assignment);
  assert.match(
    recommendation,
    /data-guidance-decision-flow="recommendation-roadmap-assignment"/
  );
});

test("BE-220 keeps identity goals and next action visible while collapsing detailed context", () => {
  assert.match(page, /memberName=\{fallbackName \|\| "Member"\}/);
  assert.match(page, /direction=/);
  assert.match(page, /nextStep=\{missionControl\.mission\.missionTitle\}/);
  assert.match(recommendation, /nextAction\.actionLabel/);
  assert.match(page, /Open the context behind your guidance/);
  assert.match(page, /<GuidanceCounselorHome/);
  assert.match(page, /Open detailed learning progress/);
});

test("BE-220 preserves detailed planning and learning functionality below", () => {
  assert.match(page, /<EducationalCareerRoadmap/);
  assert.match(page, /<MobileLearningQuickActions/);
  assert.match(page, /Learning Goals/);
  assert.match(page, /WeeklyGuidanceReviewPanel/);
  assert.match(page, /CertificatePreviewPanel/);
});
