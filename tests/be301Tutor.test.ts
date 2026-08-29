import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { professionalConfigs } from "../src/lib/digitalStaffRuntime/config";
import { getDigitalProfessional } from "../src/lib/digitalStaff";
import { beastEducationTutorGuidedTour } from "../src/lib/guidedOnboarding";
import { isProfessionalAllowedForMember } from "../src/lib/memberAgeEntitlements";
import { memberBeastEducationNavigation } from "../src/lib/moduleNavigation";
import { professionalRelationshipDefinitions } from "../src/lib/platform/relationships";

const route = readFileSync("src/app/api/learning/ai/route.ts", "utf8");
const provider = readFileSync("src/lib/learning/openai.ts", "utf8");
const workspace = readFileSync("src/app/dashboard/education/tutor/TutorWorkspace.tsx", "utf8");

test("BE-301 registers one complete persistent AI Tutor identity", () => {
  const tutor = getDigitalProfessional("tutor");
  assert.equal(tutor?.canonicalId, "beasteducation.tutor");
  assert.equal(tutor?.team, "BeastEducation");
  assert.equal(tutor?.conversationHref, "/dashboard/education/tutor");
  assert.equal(tutor?.reportsToId, "fusion-director");
  assert.ok(tutor?.capabilities.some((item) => /homework image/i.test(item)));
  assert.ok(tutor?.limitations.some((item) => /blurry/i.test(item)));
  assert.ok(existsSync("public/digital-staff/tutor.webp"));
  assert.equal(professionalConfigs["beasteducation.tutor"].role, "AI Tutor");
  assert.ok(professionalRelationshipDefinitions.some((item) => item.agentId === "beasteducation.tutor"));
});

test("BE-301 makes Tutor discoverable without replacing Guidance Counselor", () => {
  const items = memberBeastEducationNavigation.children || [];
  assert.ok(items.some((item) => item.href === "/dashboard/education/guidance-counselor"));
  assert.ok(items.some((item) => item.href === "/dashboard/education/tutor"));
  assert.match(workspace, /Riley teaches schoolwork/);
  assert.match(workspace, /Guidance Counselor helps plan/);
  assert.equal(isProfessionalAllowedForMember("beasteducation.tutor", "2014-01-01"), true);
  assert.equal(isProfessionalAllowedForMember("beastmoney.money-coach", "2014-01-01"), false);
});

test("BE-301 validates private bounded homework images and fails closed", () => {
  assert.match(route, /Authentication required/);
  assert.match(route, /maximumImageBytes = 8 \* 1024 \* 1024/);
  assert.match(route, /image\/jpeg/);
  assert.match(route, /image\/png/);
  assert.match(route, /image\/webp/);
  assert.match(route, /private, no-store/);
  assert.match(provider, /Read only what is visibly present/);
  assert.match(provider, /blurry, cropped, or uncertain/);
  assert.doesNotMatch(workspace, /localStorage.*image|sessionStorage.*image/);
  assert.match(workspace, /Image bytes were not saved in conversation history/);
});

test("BE-301 persists Tutor text conversations through existing owner-scoped storage", () => {
  assert.match(workspace, /SupabaseAgentConversationStore/);
  assert.match(workspace, /ServerAgentConversationRepository/);
  assert.match(workspace, /agentId: tutorId/);
  assert.match(workspace, /repository\.append/);
  assert.match(workspace, /kind: "tutor_answer"/);
  assert.match(workspace, /New session/);
});

test("BE-301 provides an age-appropriate contextual tutorial and Outcome hooks", () => {
  assert.equal(beastEducationTutorGuidedTour.steps.length, 4);
  assert.match(beastEducationTutorGuidedTour.steps.map((step) => step.description).join(" "), /take a clear picture/i);
  assert.match(workspace, /data-analytics-event="conversation_created"/);
  assert.match(workspace, /data-analytics-event="call_to_action_selected"/);
  assert.match(workspace, /data-analytics-status="started"/);
  assert.match(workspace, /data-tour-step="tutor-upload"/);
});
