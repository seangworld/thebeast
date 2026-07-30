import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const conversationPath =
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx";
const pagePath =
  "src/app/dashboard/learning/BeastEducationExperience.tsx";

test("BE-202 opens BeastEducation with the Guidance Counselor conversation", () => {
  const page = readFileSync(pagePath, "utf8");

  assert.match(page, /<GuidanceCounselorConversation/);
  assert.ok(page.includes("<GuidanceCounselorConversation"));
  assert.match(
    page,
    /<GuidanceCounselorConversation[\s\S]*recommendation=\{recommendation\}/
  );
});

test("BE-202 provides history, input, context, and the required suggested questions", () => {
  const source = readFileSync(conversationPath, "utf8");

  assert.match(source, /AgentExperience/);
  assert.match(source, /ProfessionalConversationTimeline/);
  assert.match(source, /ProfessionalConversationWorkspace/);
  assert.match(source, /AgentConversationInput/);
  assert.match(source, /ProfessionalKnowledgeWorkspace/);
  assert.match(source, /Start a conversation/);
  assert.match(source, /guidanceCounselorSuggestedQuestions\.map/);
});

test("BE-230 suggested prompts sound like messages a student would type", () => {
  const source = readFileSync(conversationPath, "utf8");

  for (const prompt of [
    "I’m not sure what career fits me.",
    "I want to make more money.",
    "Should I go to college?",
    "Should I learn a trade?",
    "Help me figure out what to study.",
    "I don’t know where to start.",
  ]) {
    assert.ok(source.includes(prompt), `missing natural prompt: ${prompt}`);
  }

  assert.doesNotMatch(source, /Let’s review my educational goals/);
  assert.doesNotMatch(source, /Help me explore career paths that fit me/);
  assert.doesNotMatch(source, /Let’s update my roadmap/);
});

test("BE-202 keeps a member-scoped relationship across navigation", () => {
  const source = readFileSync(conversationPath, "utf8");
  const liveExperience = readFileSync(
    "src/lib/education/guidanceCounselorLive.ts",
    "utf8"
  );

  assert.match(source, /ServerAgentConversationRepository/);
  assert.match(source, /SupabaseAgentConversationStore/);
  assert.match(source, /beasteducation\.guidance-counselor/);
  assert.match(source, /ownerId: memberId/);
  assert.match(source, /Your primary BeastEducation professional/);
  assert.match(liveExperience, /I’m your Guidance Counselor/);
  assert.match(liveExperience, /Tell me about your educational journey/);
});

test("BE-205 presents the relationship before its supporting dashboard", () => {
  const page = readFileSync(pagePath, "utf8");
  const source = readFileSync(conversationPath, "utf8");
  const recommendation = readFileSync(
    "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
    "utf8"
  );

  assert.match(source, /ProfessionalConversationWorkspace/);
  assert.match(source, /cardsPlacement="after-conversation"/);
  assert.match(source, /Current recommendation/);
  assert.match(page, /Open the workspace that owns the next decision/);
  assert.match(recommendation, /Current recommendation/);
  assert.match(recommendation, /Educational Roadmap summary/);
  assert.match(recommendation, /View full roadmap/);
});
