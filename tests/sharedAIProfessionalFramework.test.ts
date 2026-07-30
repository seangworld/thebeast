import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const framework = readFileSync(
  "src/app/components/agents/ProfessionalExperienceFramework.tsx",
  "utf8"
);
const exportsSource = readFileSync(
  "src/app/components/agents/index.ts",
  "utf8"
);
const knowledge = readFileSync(
  "src/app/components/agents/ProfessionalKnowledgeWorkspace.tsx",
  "utf8"
);
const money = readFileSync(
  "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
  "utf8"
);
const education = readFileSync(
  "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
  "utf8"
);
const health = readFileSync(
  "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
  "utf8"
);

test("BO-403 defines the canonical professional experience capabilities", () => {
  for (const capability of [
    "greeting",
    "conversation",
    "knowledge",
    "conversation-history",
    "memory",
    "time-awareness",
    "recommendations",
    "supporting-workspaces",
  ]) {
    assert.match(framework, new RegExp(`"${capability}"`));
  }
  assert.match(framework, /data-professional-experience-framework/);
  assert.match(framework, /data-professional-capabilities/);
  assert.match(exportsSource, /ProfessionalExperienceFramework/);
  assert.match(exportsSource, /ProfessionalExperienceBoundary/);
});

test("BO-403 keeps conversation primary and support context secondary", () => {
  const conversation = framework.indexOf('capability="conversation"');
  const knowledgeRegion = framework.indexOf('capability="knowledge"');
  const recommendations = framework.indexOf('capability="recommendations"');
  const supporting = framework.indexOf(
    'capability="supporting-workspaces"'
  );

  assert.ok(conversation >= 0);
  assert.ok(conversation < knowledgeRegion);
  assert.ok(knowledgeRegion < recommendations);
  assert.ok(recommendations < supporting);
  assert.match(framework, /cardsPlacement="after-conversation"/);
  assert.match(framework, /Conversation remains primary/);
});

test("BO-403 standardizes durable conversation management", () => {
  assert.match(framework, /ProfessionalConversationHistory/);
  assert.match(framework, /Search \{professionalName\} conversations/);
  assert.match(framework, /New conversation/);
  assert.match(framework, /Pinned conversations/);
  assert.match(framework, /Recent conversations/);
  assert.match(framework, /Archived/);
  for (const action of ["Rename", "Pin", "Archive", "Delete"]) {
    assert.match(framework, new RegExp(action));
  }
  assert.match(framework, /messageCount/);
});

test("BO-403 is shared by current Digital Professionals", () => {
  for (const source of [money, education]) {
    assert.match(source, /<ProfessionalExperienceFramework/);
    assert.match(source, /<ProfessionalConversationHistory/);
    assert.match(source, /<ProfessionalTimeAwareness/);
    assert.match(source, /<ProfessionalMemoryTimeline/);
    assert.match(source, /<ProfessionalSupportingWorkspaces/);
    assert.match(source, /<ProfessionalKnowledgeWorkspace/);
  }
  assert.match(health, /<ProfessionalExperienceBoundary/);
  assert.match(health, /<ProfessionalConversationHistory/);
  assert.match(health, /<ProfessionalTimeAwareness/);
  assert.match(health, /<ProfessionalMemoryTimeline/);
  assert.match(health, /<ProfessionalSupportingWorkspaces/);
  assert.match(health, /<ProfessionalKnowledgeWorkspace/);
});

test("BO-403 preserves conversation-led profile building and contextual links", () => {
  assert.match(knowledge, /mode: "conversation"/);
  assert.match(knowledge, /onAction\?\.\(item\)/);
  assert.match(knowledge, /relatedLinks/);
  assert.match(knowledge, /href=\{link\.href\}/);
  assert.doesNotMatch(framework, /questionnaire|setup wizard/i);
});

test("BO-403 does not weaken domain safety boundaries", () => {
  assert.match(money, /cannot move money/);
  assert.match(money, /No money moves[\s\S]*calculation changes/);
  assert.match(
    health,
    /does not diagnose, prescribe, determine treatment/
  );
  assert.match(health, /start, stop, or change medication/);
  assert.match(
    education,
    /does not submit an[\s\S]*application, enroll you, move money, or change an education record/
  );
});
