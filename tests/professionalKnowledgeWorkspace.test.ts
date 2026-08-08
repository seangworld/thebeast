import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sharedWorkspace = readFileSync(
  "src/app/components/agents/ProfessionalKnowledgeWorkspace.tsx",
  "utf8"
);
const moneyCoach = readFileSync(
  "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
  "utf8"
);
const guidanceCounselor = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
  "utf8"
);
const healthAdvisor = readFileSync(
  "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
  "utf8"
);

test("BO-402 provides one reusable and accessible professional knowledge workspace", () => {
  assert.match(sharedWorkspace, /export function ProfessionalKnowledgeWorkspace/);
  assert.match(sharedWorkspace, /What I Know/);
  assert.match(sharedWorkspace, /What I Think/);
  assert.match(sharedWorkspace, /What I Still Need/);
  assert.match(sharedWorkspace, /Why I think this/);
  assert.match(sharedWorkspace, /confidence/);
  assert.match(sharedWorkspace, /supporting evidence/i);
  assert.match(sharedWorkspace, /aria-label=/);
  assert.match(sharedWorkspace, /aria-labelledby=/);
  assert.match(sharedWorkspace, /focus-visible:outline/);
  assert.match(sharedWorkspace, /xl:grid-cols-3/);
  assert.match(sharedWorkspace, /min-w-0/);
  assert.doesNotMatch(sharedWorkspace, /overflow-x-hidden/);
});

test("BO-402 makes every knowledge item an action with no inert hash links", () => {
  assert.match(sharedWorkspace, /item\.action\.mode === "conversation"/);
  assert.match(sharedWorkspace, /onAction\?\.\(item\)/);
  assert.match(sharedWorkspace, /href=\{item\.action\.href\}/);
  assert.doesNotMatch(sharedWorkspace, /href=\{item\.action\.href \|\| "#"\}/);
});

test("BO-403 knowledge can connect to supporting BeastOS context", () => {
  assert.match(sharedWorkspace, /relatedLinks/);
  assert.match(
    sharedWorkspace,
    /document"\s*\|\s*"goal"\s*\|\s*"timeline"\s*\|\s*"conversation"\s*\|\s*"workspace"/
  );
  assert.match(sharedWorkspace, /item\.relatedLinks\?\.length/);
  assert.match(sharedWorkspace, /href=\{link\.href\}/);
});

test("BO-402 is consumed by Money Coach, Guidance Counselor, and Health Advisor", () => {
  for (const source of [moneyCoach, guidanceCounselor, healthAdvisor]) {
    assert.match(source, /<ProfessionalKnowledgeWorkspace/);
    assert.match(source, /mode: "conversation"/);
    assert.match(source, /beginKnowledgeConversation/);
  }
  assert.match(moneyCoach, /professionalName: "Money Coach"/);
  assert.match(guidanceCounselor, /professionalName: "Guidance Counselor"/);
  assert.match(healthAdvisor, /professionalName: "Health Advisor"/);
});

test("BO-402 missing information starts existing professional conversation flows", () => {
  assert.match(moneyCoach, /setKnowledgePrompt/);
  assert.match(moneyCoach, /focusComposer/);
  assert.match(moneyCoach, /ProfessionalConversationTimeline/);
  assert.match(guidanceCounselor, /setKnowledgePrompt/);
  assert.match(guidanceCounselor, /requestDigitalStaffResponse/);
  assert.doesNotMatch(guidanceCounselor, /learnFromDiscoveryTurn\(cleanQuestion/);
});

test("BO-402 Health Advisor stores only explicitly confirmed member-reported context", () => {
  assert.match(healthAdvisor, /requestDigitalStaffResponse/);
  assert.doesNotMatch(healthAdvisor, /detectMemberHealthDisclosure\(question/);
  assert.match(healthAdvisor, /Save confirmed context/);
  assert.match(healthAdvisor, /member_confirmed_conversation/);
  assert.match(healthAdvisor, /Member-reported Health Advisor conversation/);
  assert.match(healthAdvisor, /\.eq\("owner_id", userId\)/);
  assert.match(healthAdvisor, /It does not[\s\S]*confirm a diagnosis/);
  assert.match(
    healthAdvisor,
    /setRecords\(\(current\) =>[\s\S]*targetRecord[\s\S]*\[saved, \.\.\.current\]/
  );
});

test("BO-402 does not introduce database, permission, or calculation changes", () => {
  assert.doesNotMatch(sharedWorkspace, /createClient|supabase|calculate|permission/);
  assert.doesNotMatch(sharedWorkspace, /overflow-x-hidden/);
});
