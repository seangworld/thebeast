import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildHealthAdvisorConversationEvidence,
  buildHealthAdvisorDocumentEvidence,
  buildHealthAdvisorRecordEvidence,
  detectMemberHealthDisclosure,
  healthAdvisorExternalResearchInstructions,
  isAllowedHealthAuthorityUrl,
  parseHealthAdvisorOpenAIResponse,
  parseHealthAdvisorMedicalSections,
  selectRelevantHealthRecords,
} from "../src/lib/health/healthAdvisorQuestionAnswering";
import type { HealthRecord } from "../src/lib/health/foundation";

const base = {
  ownerId: "owner-1",
  status: "active" as const,
  occurredOn: null,
  notes: null,
  createdAt: "2026-07-29T12:00:00.000Z",
  updatedAt: "2026-07-29T12:00:00.000Z",
};

const records: HealthRecord[] = [
  {
    ...base,
    id: "medication-1",
    recordType: "medication",
    title: "Metformin",
    source: "Member-entered medication list",
    details: { dose: "Saved dose" },
  },
  {
    ...base,
    id: "appointment-1",
    recordType: "appointment",
    title: "Primary care visit",
    source: "Provider office",
    details: { context: "Annual visit" },
  },
  {
    ...base,
    id: "archived-vital",
    recordType: "vital",
    title: "Old blood pressure",
    source: "Home device",
    status: "archived",
    details: { value: "Archived value" },
  },
];

test("Health Advisor matches only relevant active BeastHealth records", () => {
  assert.deepEqual(
    selectRelevantHealthRecords(
      records,
      "What general information is available about my medication?"
    ).map((record) => record.id),
    ["medication-1"]
  );
  assert.deepEqual(
    selectRelevantHealthRecords(records, "How should I prepare for my visit?").map(
      (record) => record.id
    ),
    ["appointment-1"]
  );
  assert.deepEqual(
    selectRelevantHealthRecords(records, "What does blood pressure mean?").map(
      (record) => record.id
    ),
    []
  );
  assert.deepEqual(
    selectRelevantHealthRecords(records, "Show my recent health timeline.").map(
      (record) => record.id
    ),
    ["medication-1", "appointment-1"]
  );
});

test("Health Advisor uses owner-loaded document metadata and prior conversation summaries as local evidence", () => {
  assert.deepEqual(
    buildHealthAdvisorDocumentEvidence(
      [
        {
          id: "document-1",
          title: "CBC lab report",
          description: "Recent laboratory report",
          status: "Ready",
          updatedAt: "2026-07-29T14:00:00.000Z",
          source: "CBC lab report (cbc.pdf)",
          summary: "Owner-approved document summary.",
        },
        {
          id: "document-archived",
          title: "Old report",
          description: null,
          status: "Archived",
          updatedAt: "2026-01-01T12:00:00.000Z",
          source: "Old report (old.pdf)",
          summary: null,
        },
      ],
      "What uploaded lab documents do I have?"
    ),
    [
      {
        id: "document-1",
        title: "CBC lab report",
        updatedAt: "2026-07-29T14:00:00.000Z",
        source: "CBC lab report (cbc.pdf)",
        summary: "Owner-approved document summary.",
        provenance: "saved_beast_document",
      },
    ]
  );
  assert.deepEqual(
    buildHealthAdvisorConversationEvidence(
      [
        {
          id: "conversation-1",
          title: "Blood pressure preparation",
          updatedAt: "2026-07-29T15:00:00.000Z",
          summary: "Discussed questions for a primary care appointment.",
          archived: false,
        },
        {
          id: "conversation-archived",
          title: "Archived conversation",
          updatedAt: "2026-07-20T15:00:00.000Z",
          summary: "Older discussion.",
          archived: true,
        },
      ],
      "What did we discuss last time?"
    ),
    [
      {
        id: "conversation-1",
        title: "Blood pressure preparation",
        updatedAt: "2026-07-29T15:00:00.000Z",
        summary: "Discussed questions for a primary care appointment.",
        provenance: "saved_health_advisor_conversation",
      },
    ]
  );
});

test("direct disclosures are proposed for confirmation without interpreting questions", () => {
  assert.equal(
    detectMemberHealthDisclosure("My blood pressure was 120 over 80.")?.id,
    "health-vitals-needed"
  );
  assert.equal(
    detectMemberHealthDisclosure("My doctor is Dr. Smith.")?.id,
    "health-care-team-needed"
  );
  assert.equal(
    detectMemberHealthDisclosure("What blood pressure is considered high?"),
    null
  );
});

test("record evidence exposes provenance without exporting health details", () => {
  const evidence = buildHealthAdvisorRecordEvidence(
    records,
    "Tell me about metformin."
  );
  assert.deepEqual(evidence, [
    {
      id: "medication-1",
      kind: "medication",
      title: "Metformin",
      status: "active",
      occurredOn: null,
      source: "Member-entered medication list",
      provenance: "saved_beasthealth_record",
    },
  ]);
  assert.equal("facts" in evidence[0], false);
});

test("external citations are restricted to approved medical authorities", () => {
  assert.equal(
    isAllowedHealthAuthorityUrl(
      "https://www.fda.gov/drugs/drug-safety-and-availability"
    ),
    true
  );
  assert.equal(
    isAllowedHealthAuthorityUrl(
      "https://medlineplus.gov/druginformation.html"
    ),
    true
  );
  assert.equal(
    isAllowedHealthAuthorityUrl("https://unverified.example/medical"),
    false
  );
  assert.equal(isAllowedHealthAuthorityUrl("http://cdc.gov/health"), false);
});

test("OpenAI response parsing keeps real allowlisted URL citations only", () => {
  const parsed = parseHealthAdvisorOpenAIResponse({
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: "General information with cited support.",
            annotations: [
              {
                type: "url_citation",
                title: "FDA Drug Safety",
                url: "https://www.fda.gov/drugs/drug-safety-and-availability",
              },
              {
                type: "url_citation",
                title: "Unsupported",
                url: "https://unverified.example/claim",
              },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(parsed.text, "General information with cited support.");
  assert.deepEqual(parsed.sources, [
    {
      title: "FDA Drug Safety",
      url: "https://www.fda.gov/drugs/drug-safety-and-availability",
      organization: "U.S. Food and Drug Administration",
    },
  ]);
});

test("medical response sections remain explicit and do not merge possibilities with facts", () => {
  const sections = parseHealthAdvisorMedicalSections(`## General medical information
Blood pressure is measured with two numbers.

## Possible explanations
Many factors can affect a reading; this does not identify a cause.

## Questions for a clinician
- How should I measure this at home?

## Safety limitations
This information cannot determine whether a reading is safe for an individual.`);
  assert.deepEqual(sections, {
    generalInformation: "Blood pressure is measured with two numbers.",
    possibleExplanations:
      "Many factors can affect a reading; this does not identify a cause.",
    questionsForClinician: "- How should I measure this at home?",
    safetyLimitations:
      "This information cannot determine whether a reading is safe for an individual.",
  });
});

test("external research instructions preserve strict medical boundaries", () => {
  assert.match(healthAdvisorExternalResearchInstructions, /do not receive the member's saved BeastHealth records/i);
  assert.match(healthAdvisorExternalResearchInstructions, /Never diagnose/);
  assert.match(healthAdvisorExternalResearchInstructions, /start, stop, or change medication/);
  assert.match(healthAdvisorExternalResearchInstructions, /web-search citation/);
  assert.match(healthAdvisorExternalResearchInstructions, /Questions for a clinician/);
  assert.match(healthAdvisorExternalResearchInstructions, /Possible explanations/);
  assert.match(healthAdvisorExternalResearchInstructions, /qualified clinician or pharmacist/);
  assert.match(healthAdvisorExternalResearchInstructions, /urgent or emergency/);
});

test("Health Advisor API keeps records owner-scoped and outside the external payload", () => {
  const route = readFileSync("src/app/api/health/advisor/route.ts", "utf8");
  assert.match(route, /supabase\.auth\.getUser/);
  assert.match(route, /\.eq\("owner_id", user\.id\)/);
  assert.match(route, /\.from\("beast_documents"\)/);
  assert.match(route, /\.eq\("category", "Health"\)/);
  assert.match(route, /\.from\("agent_conversations"\)/);
  assert.match(route, /\.eq\("agent_id", healthAdvisorProfessionalId\)/);
  assert.match(route, /externalResearchConsent !== true/);
  assert.match(route, /store: false/);
  assert.match(route, /tool_choice: "required"/);
  assert.match(route, /allowed_domains/);
  assert.match(route, /input: question/);
  const externalRequestBody = route.slice(
    route.indexOf("body: JSON.stringify"),
    route.indexOf("if (!openAIResponse.ok)")
  );
  assert.doesNotMatch(externalRequestBody, /recordEvidence/);
  assert.doesNotMatch(externalRequestBody, /documentEvidence/);
  assert.doesNotMatch(externalRequestBody, /conversationEvidence/);
  assert.doesNotMatch(externalRequestBody, /memberContext/);
});

test("Health Advisor uses native shared-runtime research and renders both evidence layers", () => {
  const workspace = readFileSync(
    "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
    "utf8"
  );
  assert.match(workspace, /AgentConversationInput/);
  assert.match(workspace, /ProfessionalConversationTimeline/);
  assert.match(workspace, /Verified BeastHealth records/);
  assert.match(workspace, /Uploaded health documents/);
  assert.match(workspace, /Prior conversations/);
  assert.match(workspace, /Possible explanations/);
  assert.match(workspace, /Questions for a clinician/);
  assert.match(workspace, /Safety limitations/);
  assert.match(workspace, /External medical sources/);
  assert.match(workspace, /requestDigitalStaffResponse/);
  assert.doesNotMatch(workspace, /approve sending the text I type to OpenAI/);
  assert.doesNotMatch(workspace, /externalResearchConsent/);
});
