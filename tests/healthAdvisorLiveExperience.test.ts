import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { detectMemberHealthDisclosure } from "../src/lib/health/healthAdvisorQuestionAnswering";

const workspace = readFileSync(
  "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
  "utf8"
);

test("BH-401 makes conversation the BeastHealth front door", () => {
  const conversation = workspace.indexOf("messages={healthQuestionMessages}");
  const knowledge = workspace.indexOf("model={knowledgeModel}");
  const briefing = workspace.indexOf("Executive Health Briefing");
  assert.ok(conversation >= 0);
  assert.ok(conversation < knowledge);
  assert.ok(conversation < briefing);
  assert.match(workspace, /I’m your Health Advisor/);
  assert.match(workspace, /What would you like me to know first/);
  assert.doesNotMatch(workspace, /Health Advisor starting points/);
});

test("BH-401 reuses durable shared conversation history", () => {
  assert.match(workspace, /ServerAgentConversationRepository/);
  assert.match(workspace, /SupabaseAgentConversationStore/);
  assert.match(workspace, /agentId: healthAdvisorProfessionalId/);
  assert.match(workspace, /restoreHealthAdvisorTurns/);
  assert.match(workspace, /Health Advisor conversation history/);
  assert.match(workspace, /New conversation/);
});

test("BH-401 learns direct member disclosures without treating questions as facts", () => {
  assert.deepEqual(detectMemberHealthDisclosure("I take metformin each day."), {
    id: "health-medications-needed",
    label: "Current medication status",
  });
  assert.deepEqual(detectMemberHealthDisclosure("I'm allergic to penicillin."), {
    id: "health-allergies-needed",
    label: "Allergies",
  });
  assert.deepEqual(
    detectMemberHealthDisclosure("I have an appointment next Tuesday."),
    {
      id: "health-appointments-needed",
      label: "Appointments",
    }
  );
  assert.equal(
    detectMemberHealthDisclosure("Should I take a different medication?"),
    null
  );
  assert.equal(
    detectMemberHealthDisclosure("Could this symptom be serious?"),
    null
  );
});

test("BH-401 confirms conversation extraction before structured persistence", () => {
  for (const area of [
    "health-conditions-needed",
    "health-medications-needed",
    "health-allergies-needed",
    "health-care-team-needed",
    "health-clinician-outcomes-needed",
    "health-procedures-needed",
    "health-family-history-needed",
    "health-lifestyle-needed",
    "health-vitals-needed",
    "health-insurance-needed",
    "health-appointments-needed",
    "health-goals-needed",
    "health-documents-needed",
  ]) {
    assert.match(workspace, new RegExp(area));
  }
  assert.match(workspace, /member_confirmed_conversation/);
  assert.match(workspace, /Save confirmed context/);
  assert.match(workspace, /record_type:\s*knowledgeRecordKinds/);
  assert.match(workspace, /It does not\s+confirm a diagnosis/);
  assert.doesNotMatch(workspace, /setup wizard|questionnaire/i);
});

test("BH-401 memory comes from existing conversations records documents and outcomes", () => {
  assert.match(workspace, /SupabaseAgentConversationStore/);
  assert.match(workspace, /beast_health_records/);
  assert.match(workspace, /loadUserDocuments/);
  assert.match(workspace, /SupabaseExecutionHistoryStore/);
  assert.match(workspace, /recordResultAndOutcome/);
  assert.match(workspace, /model\.outcomeLearning/);
});

test("BH-401 keeps record management available without displacing conversation", () => {
  assert.match(workspace, /View record/);
  assert.match(workspace, /buildHealthAdvisorUnderstanding/);
  assert.match(workspace, /ProfessionalKnowledgeWorkspace/);
  assert.match(workspace, /Talk with Health Advisor/);
});

test("BH-401 preserves privacy and medical safety boundaries", () => {
  assert.match(workspace, /requestDigitalStaffResponse/);
  assert.doesNotMatch(workspace, /OpenAI/);
  assert.match(workspace, /does not diagnose, prescribe, determine treatment/);
  assert.match(workspace, /start, stop, or change medication/);
  assert.match(workspace, /local emergency or qualified clinical\s+care/);
});
