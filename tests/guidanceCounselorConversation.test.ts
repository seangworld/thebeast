import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const conversationPath =
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx";
const pagePath = "src/app/dashboard/learning/page.tsx";

test("BE-202 opens BeastEducation with the Guidance Counselor conversation", () => {
  const page = readFileSync(pagePath, "utf8");

  assert.match(page, /<GuidanceCounselorConversation/);
  assert.ok(
    page.indexOf("<GuidanceCounselorConversation") <
      page.indexOf("<LearningMissionControl"),
    "the conversation should lead the education experience"
  );
  assert.ok(
    page.indexOf("<GuidanceCounselorConversation") <
      page.indexOf("<EducationCommandCenter"),
    "planning dashboards should follow the primary relationship"
  );
});

test("BE-202 provides history, input, context, and the required suggested questions", () => {
  const source = readFileSync(conversationPath, "utf8");

  assert.match(source, /AgentExperience/);
  assert.match(source, /AgentConversationTimeline/);
  assert.match(source, /title="Conversation history"/);
  assert.match(source, /AgentConversationInput/);
  assert.match(source, /AgentContextSummary/);
  assert.match(source, /label="Suggested questions"/);
  assert.match(source, /Let's review your educational goals\./);
  assert.match(source, /Let's talk about your interests\./);
  assert.match(source, /Have your career goals changed\?/);
  assert.match(source, /Let's update your roadmap\./);
});

test("BE-202 keeps a member-scoped relationship across navigation", () => {
  const source = readFileSync(conversationPath, "utf8");

  assert.match(source, /beasteducation:guidance-counselor:\$\{memberId\}/);
  assert.match(source, /window\.localStorage\.getItem\(storageKey\)/);
  assert.match(source, /window\.localStorage\.setItem\(storageKey/);
  assert.match(source, /Your primary BeastEducation professional/);
  assert.match(source, /Courses and Tutor support remain available/);
});
