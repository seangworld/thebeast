import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuidanceCounselorConversationTurn,
  guidanceDiscoveryProfileFromRow,
} from "../src/lib/education";

const openContext = {
  educationalGoal: "Define a long-term educational goal together.",
  interests: "Explore what fits.",
  careerDirection: "No career direction has been confirmed yet.",
  roadmap: "No roadmap has been confirmed yet.",
};

test("BE-227 sounds curious before advising", () => {
  const turn = buildGuidanceCounselorConversationTurn({
    question: "I think I might be interested in IT.",
    context: openContext,
    profile: guidanceDiscoveryProfileFromRow(null),
  });

  assert.match(turn.text, /don’t need to have everything figured out/i);
  assert.match(turn.text, /What kind of work do you picture yourself doing\?/);
  assert.equal((turn.text.match(/\?/g) || []).length, 1);
});

test("BE-227 acknowledges a known goal without narrating internal reasoning", () => {
  const turn = buildGuidanceCounselorConversationTurn({
    question: "What should I learn first?",
    context: {
      ...openContext,
      educationalGoal: "Become an IT professional",
      careerDirection: "IT",
    },
    profile: guidanceDiscoveryProfileFromRow({
      goal: "Become an IT professional",
    }),
  });

  assert.match(turn.text, /^I see you’re interested in becoming an IT professional\./);
  assert.doesNotMatch(
    turn.text,
    /I recommend|clarify the outcome|keeping .* in view|separate what|internal reasoning/i
  );
});

test("BE-227 keeps advice concise and conversational", () => {
  const turn = buildGuidanceCounselorConversationTurn({
    question: "How long will a certification path take?",
    context: {
      ...openContext,
      educationalGoal: "Earn an IT certification",
    },
    profile: guidanceDiscoveryProfileFromRow({
      goal: "Earn an IT certification",
    }),
  });

  assert.match(turn.text, /realistic timeline depends on where you’re starting/i);
  assert.equal((turn.text.match(/\?/g) || []).length, 1);
  assert.ok(turn.text.split(/\n\n/).every((paragraph) => paragraph.length < 240));
});

test("BE-227 preserves uncertainty without sounding like documentation", () => {
  const turn = buildGuidanceCounselorConversationTurn({
    question: "What prerequisites does this certification require?",
    context: openContext,
    profile: guidanceDiscoveryProfileFromRow(null),
  });

  assert.match(turn.text, /don’t want to guess/i);
  assert.match(turn.text, /official requirements/i);
  assert.doesNotMatch(
    turn.text,
    /governing requirements|authoritative sources|true entry requirements|workflow/i
  );
});
