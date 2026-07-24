import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildGuidanceCounselorUnderstanding,
  guidanceDiscoveryProfileFromRow,
  nextGuidanceUnderstandingQuestion,
} from "../src/lib/education";

const conversation = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
  "utf8"
);
const reasoning = readFileSync(
  "src/lib/education/guidanceCounselorReasoning.ts",
  "utf8"
);

test("BE-217 separates known provisional and missing understanding", () => {
  const model = buildGuidanceCounselorUnderstanding(
    guidanceDiscoveryProfileFromRow({
      goal: "Become a cybersecurity analyst",
      learning_preferences: ["hands-on"],
      college_interest: null,
      available_study_time_known: false,
    })
  );

  const career = model.items.find((item) => item.area === "career-goals");
  const learningStyle = model.items.find(
    (item) => item.area === "learning-style"
  );
  const college = model.items.find((item) => item.area === "college-interest");
  const studyTime = model.items.find(
    (item) => item.area === "weekly-study-time"
  );

  assert.equal(career?.confidence, "high");
  assert.equal(career?.state, "known");
  assert.equal(learningStyle?.confidence, "medium");
  assert.equal(learningStyle?.state, "thought");
  assert.equal(college?.confidence, "unknown");
  assert.equal(studyTime?.confidence, "unknown");
});

test("BE-217 uses topic-relevant missing information for future questions", () => {
  const model = buildGuidanceCounselorUnderstanding(
    guidanceDiscoveryProfileFromRow({
      goal: "Cybersecurity",
      weekly_hours: 0,
      available_study_time_known: false,
    })
  );

  assert.equal(
    nextGuidanceUnderstandingQuestion(model, ["time-estimate"])?.area,
    "weekly-study-time"
  );
  assert.equal(
    nextGuidanceUnderstandingQuestion(model, ["college-pathway"])?.area,
    "college-interest"
  );
});

test("BE-217 never asks for an area already known", () => {
  const model = buildGuidanceCounselorUnderstanding(
    guidanceDiscoveryProfileFromRow({
      weekly_hours: 8,
      available_study_time_known: true,
    })
  );

  assert.equal(
    nextGuidanceUnderstandingQuestion(model, ["time-estimate"]),
    undefined
  );
  assert.equal(
    model.whatIStillNeed.some((item) => item.area === "weekly-study-time"),
    false
  );
});

test("BE-217 replaces the static profile summary in the Counselor workspace", () => {
  assert.match(conversation, /buildGuidanceCounselorUnderstanding/);
  assert.match(conversation, /data-guidance-understanding-model="true"/);
  assert.match(conversation, /title="What I Know"/);
  assert.match(conversation, /title="What I Think"/);
  assert.match(conversation, /title="What I Still Need"/);
  assert.match(conversation, /item\.confidence/);
  assert.match(reasoning, /nextGuidanceUnderstandingQuestion/);
});
