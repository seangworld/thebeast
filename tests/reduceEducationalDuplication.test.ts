import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");
const recommendation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
  "utf8"
);
const roadmap = readFileSync(
  "src/app/dashboard/learning/EducationalCareerRoadmap.tsx",
  "utf8"
);
const missionControl = readFileSync(
  "src/app/dashboard/learning/LearningMissionControl.tsx",
  "utf8"
);

test("BE-207 gives mission, roadmap, and progress one primary presentation", () => {
  assert.match(page, /showCurrentMission=\{false\}/);
  assert.match(page, /showWeeklyProgress=\{false\}/);
  assert.match(page, /showAchievements=\{false\}/);
  assert.match(missionControl, /showCurrentMission = true/);
  assert.match(missionControl, /showWeeklyProgress = true/);
  assert.match(missionControl, /showAchievements = true/);
});

test("BE-207 summarizes roadmap status without repeating roadmap section copy", () => {
  assert.match(recommendation, /roadmapStatus/);
  assert.match(recommendation, /A status overview of the roadmap below/);
  assert.doesNotMatch(recommendation, /section\.summary/);
  assert.match(roadmap, /id="mentor-plan"/);
});

test("BE-207 preserves existing deep links at their clearest destinations", () => {
  assert.match(recommendation, /id="mentor-session"/);
  assert.match(missionControl, /id="mentor-progress"/);
  assert.match(roadmap, /id="mentor-plan"/);
});

test("BE-207 keeps access cards action-oriented instead of repeating live values", () => {
  assert.doesNotMatch(page, /\["goals", "Learning Goals", learningGoals\[0\]/);
  assert.doesNotMatch(page, /\["study-plan", "Study Plan", learningPlan\.summary/);
  assert.doesNotMatch(page, /\["certificate-access", "Certificates", `\$\{learningCertificates\.length\}/);
  assert.match(page, /Open certificate records and available downloads/);
});
