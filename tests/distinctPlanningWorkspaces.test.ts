import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  planningWorkspaceDefinitions,
} from "../src/lib/learning/workspaces";

const source = readFileSync(
  "src/app/dashboard/learning/LearningWorkspaceView.tsx",
  "utf8"
);

test("BE-208 gives each planning workspace one unique question", () => {
  assert.equal(
    planningWorkspaceDefinitions["career-planning"].guidingQuestion,
    "Who could I become?"
  );
  assert.equal(
    planningWorkspaceDefinitions.schools.guidingQuestion,
    "Where could I learn?"
  );
  assert.equal(
    planningWorkspaceDefinitions.scholarships.guidingQuestion,
    "How could I fund it?"
  );
});

test("BE-208 renders distinct career, school, and scholarship structures", () => {
  assert.match(source, /function CareerPlanningWorkspace/);
  assert.match(source, /function SchoolsWorkspace/);
  assert.match(source, /function ScholarshipsWorkspace/);
  assert.match(source, /Career planning framework/);
  assert.match(source, /School comparison framework/);
  assert.match(source, /Scholarship funding framework/);
  assert.match(source, /identity, role fit, and progression/i);
  assert.match(source, /places and programs/i);
  assert.match(source, /funding pipeline/i);
});

test("BE-208 treats goals as context and does not fabricate planning records", () => {
  assert.match(source, /isPlanningWorkspaceSlug\(slug\)/);
  assert.match(source, /No outcome detail has been saved/);
  assert.match(
    planningWorkspaceDefinitions.schools.contextDescription,
    /not school recommendations, admissions decisions, or verified program matches/i
  );
  assert.match(
    planningWorkspaceDefinitions.scholarships.contextDescription,
    /do not establish scholarship eligibility, award amounts, or deadlines/i
  );
  assert.doesNotMatch(source, /sample school|sample scholarship|guaranteed award/i);
});

test("BE-208 keeps authoritative verification explicit in every workspace", () => {
  for (const definition of Object.values(planningWorkspaceDefinitions)) {
    assert.ok(definition.focusAreas.length >= 3);
    assert.match(
      definition.verificationNote,
      /verify|official|confirm/i
    );
  }
});
