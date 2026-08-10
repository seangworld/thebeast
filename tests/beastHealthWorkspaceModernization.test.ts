import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const recordWorkspace = readFileSync(
  "src/app/dashboard/health/BeastHealthWorkspace.tsx",
  "utf8"
);
const advisorWorkspace = readFileSync(
  "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
  "utf8"
);

const recordPages = [
  "profile",
  "conditions",
  "medications",
  "procedures",
  "vitals",
  "lifestyle",
  "family-history",
  "provider-directory",
  "appointments",
];

test("BH-205 keeps Health Advisor separate from every record workspace", () => {
  assert.match(recordWorkspace, /data-health-advisor-workspace=\{kind\}/);
  assert.match(recordWorkspace, /label: "Talk with Health Advisor"/);
  assert.doesNotMatch(recordWorkspace, /health-advisor-\$\{kind\}-conversation/);
  assert.doesNotMatch(recordWorkspace, /Continue with Health Advisor/);

  const knowledge = recordWorkspace.indexOf("<ProfessionalKnowledgeWorkspace");
  const currentRecords = recordWorkspace.indexOf(
    "Choose any saved item to see its details"
  );
  const directEntry = recordWorkspace.indexOf(
    'eyebrow="Add it yourself"'
  );

  assert.ok(knowledge >= 0);
  assert.ok(currentRecords > knowledge);
  assert.ok(directEntry > currentRecords);
});

test("BH-402 keeps every BeastHealth record route on the reusable workspace", () => {
  for (const page of recordPages) {
    const source = readFileSync(
      `src/app/dashboard/health/${page}/page.tsx`,
      "utf8"
    );
    assert.match(source, /HealthRecordWorkspace/);
  }

  const documents = readFileSync(
    "src/app/dashboard/health/documents/page.tsx",
    "utf8"
  );
  assert.match(documents, /UploadsPage[\s\S]*module: "health"/);
  assert.doesNotMatch(documents, /OwnerOnlyModuleGuard/);

  assert.match(recordWorkspace, /healthWorkspaceConversationTopics/);
  assert.match(recordWorkspace, /buildWorkspaceKnowledgeModel/);
  assert.match(recordWorkspace, /professionalName: "Health Advisor"/);
  assert.match(recordWorkspace, /What I Know|ProfessionalKnowledgeWorkspace/);
});

test("BH-205 makes saved records expandable and plainly editable", () => {
  assert.match(recordWorkspace, /id=\{`health-record-\$\{record\.id\}`\}/);
  assert.match(recordWorkspace, /aria-expanded=\{expandedId === record\.id\}/);
  assert.match(recordWorkspace, /Edit this record/);
  assert.match(recordWorkspace, /Save changes/);
  assert.match(recordWorkspace, /\.update\(\{/);
  assert.match(recordWorkspace, /\.eq\("id", record\.id\)/);
  assert.match(recordWorkspace, /\.eq\("owner_id", ownerId\)/);
  assert.match(recordWorkspace, /No saved details were changed/);
});

test("BH-402 links documents appointments and durable conversations without new tables", () => {
  assert.match(recordWorkspace, /linked_document_id/);
  assert.match(recordWorkspace, /linked_appointment_id/);
  assert.match(recordWorkspace, /candidate\.ownerId === ownerId/);
  assert.match(recordWorkspace, /View linked document/);
  assert.match(recordWorkspace, /View linked appointment/);
  assert.match(recordWorkspace, /Talk about this/);
  assert.match(recordWorkspace, /recordId/);

  assert.match(advisorWorkspace, /knowledgeTargetRecordId/);
  assert.match(advisorWorkspace, /conversation_id/);
  assert.match(advisorWorkspace, /Update confirmed record/);
  assert.match(advisorWorkspace, /\.eq\("owner_id", ownerId\)/);
  assert.match(advisorWorkspace, /member_confirmed_conversation/);
});

test("BH-205 keeps forms secondary and preserves medical safety boundaries", () => {
  assert.match(recordWorkspace, /Use this form when you already know what you want to save/);
  assert.match(recordWorkspace, /never diagnoses or prescribes/);
  assert.match(recordWorkspace, /qualified clinicians remain authoritative/);
  assert.match(recordWorkspace, /<details>/);
  assert.doesNotMatch(recordWorkspace, /create table|alter table|create policy/i);
  assert.doesNotMatch(advisorWorkspace, /create table|alter table|create policy/i);
});

test("BH-402 provides timeline recent-update and responsive workspace context", () => {
  assert.match(recordWorkspace, /buildHealthTimeline\(activeRecords\)/);
  assert.match(recordWorkspace, /title=\{`\$\{definition\.title\} timeline`\}/);
  assert.match(recordWorkspace, /title="What changed"/);
  assert.match(recordWorkspace, /saved record timestamps, not clinical change/);
  assert.match(recordWorkspace, /xl:grid-cols-/);
  assert.match(recordWorkspace, /min-w-0/);
  assert.doesNotMatch(recordWorkspace, /overflow-x-hidden/);
});
