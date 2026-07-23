import assert from "node:assert/strict";
import test from "node:test";
import { buildLearningAIContext } from "../src/lib/learning/contextBuilder";
import { buildMentorConversationPresentationPrompt } from "../src/lib/learning/mentorConversationPresentation";
import { buildOpenAILearningMessages } from "../src/lib/learning/openai";
import { getHomeworkPolicyForRequest } from "../src/lib/learning/homeworkPolicy";

const emptyMastery = {
  overallMasteryPercent: 0,
  confidence: "low" as const,
  concepts: [],
  weakConcepts: [],
  strongestConcepts: [],
  suggestedReviewTopics: [],
};

test("BL-402 loads shared professional identity and role philosophy into live responses", () => {
  const context = buildLearningAIContext({
    learnerName: "Sean",
    mastery: emptyMastery,
    weakAreas: [],
    currentLesson: "Fractions",
  });
  const prompt = buildMentorConversationPresentationPrompt({
    context,
    conversationType: "Explanation",
  });

  assert.match(prompt, /Professional role: Guidance Counselor/);
  assert.match(prompt, /motivational; educational; future-focused/);
  assert.match(prompt, /Teaching philosophy: teach choices and tradeoffs/);
  assert.match(prompt, /Answer the learner's actual question first/);
  assert.match(prompt, /specific encouragement grounded in the learner's effort or evidence/);
});

test("BL-402 keeps explanations age-appropriate without inventing learner age", () => {
  const unknownLearner = buildLearningAIContext({
    learnerName: "Learner",
    mastery: emptyMastery,
    weakAreas: [],
    currentLesson: "Fractions",
  });
  const knownLearner = { ...unknownLearner, profile: "Sean" };

  assert.match(
    buildMentorConversationPresentationPrompt({
      context: unknownLearner,
      conversationType: "Question",
    }),
    /age and level are not established[\s\S]*do not infantilize/
  );
  assert.match(
    buildMentorConversationPresentationPrompt({
      context: knownLearner,
      conversationType: "Question",
    }),
    /without making unsupported assumptions about age or ability/
  );
});

test("BL-402 presentation is part of the centralized AI path and preserves reasoning inputs", () => {
  const context = buildLearningAIContext({
    learnerName: "Sean",
    mastery: emptyMastery,
    weakAreas: ["Equivalent fractions"],
    currentLesson: "Fractions",
  });
  const messages = buildOpenAILearningMessages({
    specialistId: "homework-coach",
    specialistName: "Homework Coach",
    conversationType: "Explanation",
    messages: [{ role: "user", content: "Why are these fractions equivalent?" }],
    context,
    homeworkPolicy: getHomeworkPolicyForRequest(
      "Why are these fractions equivalent?"
    ),
  });

  assert.match(messages[0].content, /Mentor conversation presentation/);
  assert.match(messages[0].content, /Prefer a short conversational paragraph/);
  assert.match(messages[0].content, /Avoid documentation voice/);
  assert.match(messages[0].content, /Weak areas: Equivalent fractions/);
  assert.match(messages[0].content, /Never immediately answer: yes/);
  assert.equal(messages[1].content, "Why are these fractions equivalent?");
});
