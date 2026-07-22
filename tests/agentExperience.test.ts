import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "src/app/components/agents/AgentExperience.tsx",
  "utf8"
);
const barrel = readFileSync("src/app/components/agents/index.ts", "utf8");

test("AGENT-201 exposes one shared conversation-first specialist framework", () => {
  for (const component of [
    "AgentHeader",
    "AgentAvatar",
    "AgentGreeting",
    "AgentStatus",
    "AgentContextSummary",
    "AgentConversationTimeline",
    "AgentConversationInput",
    "AgentSuggestedActions",
    "AgentSmartCard",
    "AgentLoadingState",
    "AgentThinkingIndicator",
    "AgentStreamingResponseArea",
    "AgentEmptyState",
    "AgentErrorState",
    "AgentExperience",
  ]) {
    assert.match(source, new RegExp(`export function ${component}`));
    assert.match(barrel, new RegExp(component));
  }

  assert.match(source, /data-agent-experience="true"/);
  assert.match(source, /header: ReactNode/);
  assert.match(source, /conversation: ReactNode/);
  assert.match(source, /composer: ReactNode/);
});

test("AGENT-201 supports generic streaming loading history cards and suggestions", () => {
  assert.match(source, /"loading"/);
  assert.match(source, /data-agent-loading-state="true"/);
  assert.match(source, /"thinking"/);
  assert.match(source, /"streaming"/);
  assert.match(source, /readonly AgentConversationMessage\[\]/);
  assert.match(source, /readonly AgentSuggestion\[\]/);
  assert.match(source, /aria-busy=\{isStreaming\}/);
  assert.match(source, /role="log"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role="alert"/);
});

test("AGENT-201 remains specialist neutral and contains no agent reasoning", () => {
  assert.doesNotMatch(
    source,
    /Money Coach|Guidance Counselor|Health Advisor|Personal Assistant/
  );
  assert.doesNotMatch(source, /prompt|recommendation|reasoning|OpenAI|fetch\(/i);
});
