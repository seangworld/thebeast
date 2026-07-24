import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildTutorContextualResponse,
  understandTutorMemberIntent,
} from "../src/lib/learning/tutorContextAwareness";

const tutor = readFileSync(
  "src/app/dashboard/learning/activities/LessonEngine.tsx",
  "utf8"
);
const awareness = readFileSync(
  "src/lib/learning/tutorContextAwareness.ts",
  "utf8"
);

test("BE-226 recognizes explicit platform testing without treating it as coursework", () => {
  const understanding = understandTutorMemberIntent(
    "I'm testing the BeastEducation platform."
  );
  const response = buildTutorContextualResponse(understanding) || "";

  assert.equal(understanding.context, "platform-test");
  assert.equal(understanding.explicit, true);
  assert.match(response, /testing the Tutor experience/i);
  assert.match(response, /not as evidence/i);
});

test("BE-226 distinguishes evaluation demonstration and Beast development", () => {
  assert.equal(
    understandTutorMemberIntent("I'm evaluating BeastEducation.").context,
    "product-evaluation"
  );
  assert.equal(
    understandTutorMemberIntent("We're demonstrating the Tutor functionality.").context,
    "demonstration"
  );
  assert.equal(
    understandTutorMemberIntent("I'm building Beast and debugging this Tutor.").context,
    "product-development"
  );
});

test("BE-226 does not mistake ordinary mastery checks for platform testing", () => {
  const check = understandTutorMemberIntent("Test me on this lesson.");
  const question = understandTutorMemberIntent("Check my understanding.");

  assert.equal(check.context, "learning");
  assert.equal(check.explicit, false);
  assert.equal(question.context, "learning");
  assert.equal(buildTutorContextualResponse(check), undefined);
});

test("BE-226 preserves explicit context and allows an explicit return to learning", () => {
  const followUp = understandTutorMemberIntent(
    "Show me how hints work.",
    "product-evaluation"
  );
  assert.equal(followUp.context, "product-evaluation");
  assert.match(buildTutorContextualResponse(followUp) || "", /evaluation mode/i);

  const learning = understandTutorMemberIntent(
    "I'm actually taking this course now.",
    "product-evaluation"
  );
  assert.equal(learning.context, "learning");
  assert.equal(learning.explicit, true);
});

test("BE-226 reuses Beast Agent understanding and avoids false learning evidence", () => {
  assert.match(awareness, /SharedConsultationIntelligence/);
  assert.match(awareness, /recognizeConversationIntent/);
  assert.match(tutor, /understandTutorMemberIntent/);
  assert.match(tutor, /buildTutorContextualResponse/);
  assert.match(tutor, /intentUnderstanding\.context === "learning"/);
  assert.match(tutor, /memberIntentContext/);
  assert.match(tutor, /learningTurnCount >= 2/);
  assert.match(tutor, /Here is the hint behavior using this lesson’s real content/);
  assert.match(tutor, /Here is the knowledge-check behavior using this lesson’s real content/);
});
