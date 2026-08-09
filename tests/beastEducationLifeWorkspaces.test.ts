import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  educationFundingKind,
  educationRecordState,
  isEducationFundingRecord,
  lifeWorkspaceIntroductions,
} from "../src/lib/education/lifeWorkspaces";

const workspace = readFileSync("src/app/dashboard/learning/LearningWorkspaceView.tsx", "utf8");
const config = readFileSync("src/lib/digitalStaffRuntime/config.ts", "utf8");
const professionalPrompt = readFileSync("src/lib/digitalStaffRuntime/professionalPrompts.ts", "utf8");
const research = readFileSync("src/lib/education/research.ts", "utf8");

test("BE-203 separates current and past schools and supports sourced comparisons", () => {
  assert.equal(educationRecordState("schools", { phase: "present", value: "{}" }), "Current");
  assert.equal(educationRecordState("schools", { phase: "past", value: "{}" }), "Previous");
  assert.match(workspace, /My Schools/);
  assert.match(workspace, /Suggested Schools/);
  assert.match(workspace, /Compare schools using what matters to you/);
  assert.match(workspace, /programs, cost, location, support, and admissions/i);
  assert.match(workspace, /Open official source/);
});

test("BE-204 represents active expired planned and recommended certifications", () => {
  assert.equal(educationRecordState("certifications", { phase: "present", value: '{"status":"active"}' }), "Active");
  assert.equal(educationRecordState("certifications", { value: '{"status":"expired"}' }), "Expired");
  assert.equal(educationRecordState("certifications", { phase: "goal", value: "{}" }), "Planned");
  assert.equal(educationRecordState("certifications", { source_type: "research", value: "{}" }), "Recommended");
  for (const phrase of ["renewal needs", "continuing education", "exam history", "official certification body"]) assert.match(workspace, new RegExp(phrase, "i"));
});

test("BE-205 tracks education funding without guaranteeing eligibility or awards", () => {
  const saved = { value: '{"entityType":"scholarship","name":"Community award","status":"saved"}' };
  const applied = { value: '{"entityType":"grant","applicationStatus":"submitted"}' };
  const awarded = { value: '{"entityType":"education_funding","status":"awarded"}' };
  assert.equal(isEducationFundingRecord(saved), true);
  assert.equal(educationRecordState("scholarships", saved), "Saved");
  assert.equal(educationRecordState("scholarships", applied), "Applied");
  assert.equal(educationRecordState("scholarships", awarded), "Awarded");
  assert.equal(educationFundingKind({ value: '{"entityType":"fafsa"}' }), "FAFSA");
  for (const phrase of ["FAFSA", "GI Bill", "Employer tuition assistance", "never a promise of eligibility or an award"]) assert.match(workspace, new RegExp(phrase, "i"));
});

test("life workspaces use canonical owner-scoped records plus shared goals and documents", () => {
  assert.match(workspace, /education_career_profile_items/);
  assert.match(workspace, /education_career_paths/);
  assert.match(workspace, /beast_goals/);
  assert.match(workspace, /beast_documents/);
  assert.ok((workspace.match(/\.eq\("owner_id", userId\)/g) || []).length >= 4);
  assert.match(workspace, /They stay authoritative in Goals and Documents/);
  assert.doesNotMatch(workspace, /insert\(|upsert\(/);
});

test("Guidance Counselor knows all life workspaces and authoritative research boundaries", () => {
  for (const route of ["/dashboard/education/schools", "/dashboard/education/certifications", "/dashboard/education/scholarships"]) assert.match(config, new RegExp(route));
  for (const topic of ["old school", "renewal", "education funding", "fafsa", "gi bill"]) assert.match(config, new RegExp(topic, "i"));
  assert.match(config, /official certification bodies/);
  assert.match(config, /create_education_funding_proposal/);
  assert.match(professionalPrompt, /keep saved opportunities, applications, and confirmed awards distinct/);
  assert.match(research, /official school catalogs and financial-aid pages/);
  assert.match(research, /licensing and certification bodies/);
  assert.match(research, /Never guarantee admission, employment, promotion, salary, eligibility, aid, licensure, or certification/);
});

test("workspace language explains purpose next action and empty profiles plainly", () => {
  for (const copy of Object.values(lifeWorkspaceIntroductions)) {
    assert.ok(copy.what.length > 25);
    assert.ok(copy.why.length > 25);
    assert.ok(copy.doHere.length > 25);
    assert.ok(copy.next.length > 25);
  }
  for (const heading of ["What is this?", "Why does this matter?", "What should I do here?", "What happens next?"]) assert.match(workspace, new RegExp(heading.replace("?", "\\?")));
  assert.match(workspace, /min-w-0/);
  assert.doesNotMatch(workspace, /overflow-x-hidden/);
  assert.match(workspace, /focus-visible:outline/);
});
