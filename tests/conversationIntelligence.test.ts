import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  chooseConversationMove,
  chooseConversationResponseFormat,
  createConversationResponse,
  formatConversationCurrency,
  formatConversationDate,
  recognizeConversationIntent,
} from "../src/lib/platform/agents";

test("AGENT-204 recognizes shared natural conversation without specialist logic", () => {
  assert.equal(recognizeConversationIntent("Good morning!").kind, "greeting");
  assert.equal(recognizeConversationIntent("Is this thing working?").kind, "testing");
  assert.equal(recognizeConversationIntent("I appreciate it").kind, "thanks");
  assert.equal(recognizeConversationIntent("Got it.").kind, "acknowledgement");
  assert.equal(recognizeConversationIntent("Could you explain?").kind, "non-domain");
  assert.equal(recognizeConversationIntent("What?").kind, "incomplete");
});

test("AGENT-204 delegates domain recognition through a specialist-neutral hook", () => {
  const result = recognizeConversationIntent<"review-record">("Could you review the current record?", {
    recognizeDomainIntent: ({ tokens }) => tokens.includes("record") ? { intent: "review-record", confidence: 0.88, signals: ["record-review"] } : undefined,
  });
  assert.equal(result.kind, "domain");
  assert.equal(result.domainIntent, "review-record");
  assert.equal(result.confidence, 0.88);
});

test("AGENT-204 composes facts recommendations uncertainty and structured actions", () => {
  const response = createConversationResponse({
    intent: "review",
    shortAnswer: "Start with the highest-impact item.",
    sections: [
      { heading: "Facts", classification: "fact", bullets: ["Record A is current.", "Record B is incomplete."] },
      { heading: "Recommendation", classification: "recommendation", numberedItems: ["Review Record B.", "Recalculate the result."] },
      { heading: "Uncertainty", classification: "uncertainty", paragraphs: ["The missing field may change the result."] },
    ],
    actions: [{ id: "open-records", label: "Open records", type: "navigate", target: "/records" }],
    nextStep: "Open the workspace only if you want the underlying detail.",
  });
  assert.match(response.text, /Facts:/);
  assert.match(response.text, /1\. Review Record B/);
  assert.equal(response.actions[0].type, "navigate");
});

test("AGENT-204 avoids verbatim alert and dashboard repetition", () => {
  const response = createConversationResponse({
    intent: "review",
    shortAnswer: "Here is what matters.",
    sourceText: ["Alert: Record B is incomplete."],
    sections: [{ heading: "Observation", paragraphs: ["Alert: Record B is incomplete.", "A required field is still missing.", "A required field is still missing."] }],
  });
  assert.doesNotMatch(response.text, /Alert: Record B/);
  assert.equal(response.text.match(/required field/g)?.length, 1);
});

test("AGENT-204 chooses communication format and next move from response shape", () => {
  assert.equal(chooseConversationResponseFormat({ table: { columns: ["A"], rows: [["1"]] } }), "table");
  assert.equal(chooseConversationResponseFormat({ itemCount: 3 }), "bullets");
  assert.equal(chooseConversationResponseFormat({ itemCount: 3, ordered: true }), "numbered-list");
  assert.equal(chooseConversationMove({ intent: { kind: "incomplete", complete: false }, hasAnswer: false }), "clarify");
  assert.equal(chooseConversationMove({ intent: { kind: "domain", complete: true }, hasAnswer: true, hasEvidence: true }), "present-evidence");
  assert.equal(chooseConversationMove({ intent: { kind: "domain", complete: true }, hasAnswer: false, workspaceTarget: "/workspace" }), "navigate");
});

test("AGENT-204 provides shared currency and date presentation", () => {
  assert.equal(formatConversationCurrency(1234.5), "$1,234.50");
  assert.equal(formatConversationDate("2026-07-22T12:00:00Z", "en-US"), "Jul 22, 2026");
  assert.equal(formatConversationDate("not-a-date"), "Unknown date");
});

test("AGENT-204 is exported once and Money Coach consumes it without shared domain rules", () => {
  const index = readFileSync("src/lib/platform/agents/index.ts", "utf8");
  const shared = readFileSync("src/lib/platform/agents/conversationIntelligence.ts", "utf8");
  const money = readFileSync("src/lib/moneyCoachExperience.ts", "utf8");
  assert.match(index, /conversationIntelligence/);
  assert.match(money, /recognizeConversationIntent/);
  assert.match(money, /composeRoleDefinedResponse/);
  assert.match(readFileSync("src/lib/platform/agents/roleDefinitions.ts", "utf8"), /composeProfessionalResponse/);
  assert.doesNotMatch(shared, /Money Coach|Guidance Counselor|Health Advisor|financial|medical|education/i);
});
