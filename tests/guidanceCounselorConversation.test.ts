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
      page.indexOf("<GuidanceCounselorRecommendation"),
    "planning dashboards should follow the primary relationship"
  );
});

test("BE-202 provides history, input, context, and the required suggested questions", () => {
  const source = readFileSync(conversationPath, "utf8");

  assert.match(source, /AgentExperience/);
  assert.match(source, /ProfessionalConversationTimeline/);
  assert.match(source, /ProfessionalConversationWorkspace/);
  assert.match(source, /AgentConversationInput/);
  assert.match(source, /AgentContextSummary/);
  assert.match(source, /Start a conversation/);
  assert.match(source, /Let’s review my educational goals\./);
  assert.match(source, /Help me explore career paths that fit me\./);
  assert.match(source, /What should I learn next\?/);
  assert.match(source, /Let’s update my roadmap\./);
});

test("BE-202 keeps a member-scoped relationship across navigation", () => {
  const source = readFileSync(conversationPath, "utf8");

  assert.match(source, /ServerAgentConversationRepository/);
  assert.match(source, /SupabaseAgentConversationStore/);
  assert.match(source, /beasteducation\.guidance-counselor/);
  assert.match(source, /ownerId: memberId/);
  assert.match(source, /Your primary BeastEducation professional/);
  assert.match(source, /I’m your Guidance Counselor/);
  assert.match(source, /How can I help you today/);
});

test("BE-205 presents the relationship before its supporting dashboard", () => {
  const page = readFileSync(pagePath, "utf8");
  const source = readFileSync(conversationPath, "utf8");
  const recommendation = readFileSync(
    "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
    "utf8"
  );

  assert.match(source, /ProfessionalConversationWorkspace/);
  assert.ok(
    page.indexOf("<GuidanceCounselorConversation") <
      page.indexOf("<GuidanceCounselorRecommendation"),
    "the conversation should precede the current recommendation"
  );
  assert.ok(
    page.indexOf("<GuidanceCounselorRecommendation") <
      page.indexOf("<EducationalCareerRoadmap"),
    "the current recommendation and roadmap summary should precede the full roadmap"
  );
  assert.match(recommendation, /Current recommendation/);
  assert.match(recommendation, /Educational Roadmap summary/);
  assert.match(recommendation, /View full roadmap/);
});
