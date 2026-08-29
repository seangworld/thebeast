import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { professionalConfigs } from "../src/lib/digitalStaffRuntime/config";
import { getDigitalProfessional } from "../src/lib/digitalStaff";
import { beastEducationTutorGuidedTour } from "../src/lib/guidedOnboarding";
import { isProfessionalAllowedForMember } from "../src/lib/memberAgeEntitlements";
import { memberBeastEducationNavigation } from "../src/lib/moduleNavigation";
import { professionalRelationshipDefinitions } from "../src/lib/platform/relationships";
import { buildOpenAILearningMessages } from "../src/lib/learning/openai";
import { buildLearningAIContext } from "../src/lib/learning/contextBuilder";
import { getHomeworkPolicyForRequest } from "../src/lib/learning/homeworkPolicy";
import {
  buildPersistedTutorAnswer,
  buildTutorLearnerContext,
  maximumTutorImageBytes,
  requireAuthenticatedTutorMember,
  tutorResponseHeaders,
  validateTutorImageAttachment,
} from "../src/lib/learning/tutorRequest";
import { acquireDigitalStaffRequestLease } from "../src/lib/digitalStaffRuntime/requestBudget";
import { firstPartyProfessionalId } from "../src/lib/firstPartyTelemetry";

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
  assert.throws(() => requireAuthenticatedTutorMember(null), /Authentication required/);
  assert.equal(requireAuthenticatedTutorMember("member-a"), "member-a");
  assert.equal(tutorResponseHeaders["Cache-Control"], "private, no-store");
  const valid = Buffer.from("visible homework").toString("base64");
  assert.equal(validateTutorImageAttachment({ dataUrl: `data:image/png;base64,${valid}`, fileName: "work.png", mediaType: "image/png" })?.fileName, "work.png");
  assert.throws(() => validateTutorImageAttachment({ dataUrl: "data:image/png;base64,%%%", fileName: "bad.png", mediaType: "image/png" }), /valid base64/);
  assert.throws(() => validateTutorImageAttachment({ dataUrl: `data:image/gif;base64,${valid}`, fileName: "bad.gif", mediaType: "image/gif" }), /JPEG, PNG, or WebP/);
  const oversized = Buffer.alloc(maximumTutorImageBytes + 1).toString("base64");
  assert.throws(() => validateTutorImageAttachment({ dataUrl: `data:image/jpeg;base64,${oversized}`, fileName: "large.jpg", mediaType: "image/jpeg" }), /3 MB or smaller/);
  assert.match(provider, /Read only what is visibly present/);
  assert.match(provider, /blurry, cropped, or uncertain/);
  assert.doesNotMatch(workspace, /localStorage.*image|sessionStorage.*image/);
  assert.match(workspace, /Image bytes were not saved in conversation history/);
});

test("BE-301 keeps Riley as the outward identity while internal specialists remain capabilities", () => {
  const context = buildLearningAIContext({ learnerName: "Learner (teen learner)", mastery: { overallMasteryPercent: 0, confidence: "low", concepts: [], weakConcepts: [], strongestConcepts: [], suggestedReviewTopics: [] }, weakAreas: [], currentLesson: "Homework" });
  const messages = buildOpenAILearningMessages({ specialistId: "math-coach", specialistName: "Math Coach", conversationType: "Explanation", messages: [{ role: "user", content: "Help with fractions" }], context, homeworkPolicy: getHomeworkPolicyForRequest("Help with fractions"), outwardPersona: "tutor" });
  const system = messages[0]?.content || "";
  assert.match(system, /Riley Chen, BeastEducation's AI Tutor/);
  assert.match(system, /not the Guidance Counselor/i);
  assert.doesNotMatch(system, /You are BeastEducation's Guidance Counselor/);
});

test("BE-301 minimizes learner identity and adapts to bounded canonical age context", () => {
  const child = buildTutorLearnerContext({ accountBirthday: "2016-03-04", focus: "5th grade fractions", learningStyle: "Show one example" }, new Date("2026-08-29T00:00:00Z"));
  assert.match(child.profile, /child learner/);
  assert.match(child.profile, /5th grade fractions/);
  assert.doesNotMatch(child.profile, /@|2016-03-04/);
  assert.equal(child.learningStyle, "Show one example");
});

test("BE-301 persistence excludes image bytes and request budgets fail closed", () => {
  const persisted = buildPersistedTutorAnswer("Try the first step", "work.png");
  assert.deepEqual(persisted, { kind: "tutor_answer", text: "Try the first step", attachmentName: "work.png" });
  assert.doesNotMatch(JSON.stringify(persisted), /base64|data:image/);
  const first = acquireDigitalStaffRequestLease("be301-member", "beasteducation.tutor", 1_000);
  assert.equal(first.ok, true);
  const concurrent = acquireDigitalStaffRequestLease("be301-member", "beasteducation.tutor", 1_001);
  assert.deepEqual(concurrent, { ok: false, reason: "concurrent_request", retryAfterSeconds: 2 });
  if (first.ok) first.release();
});

test("BE-301 persists Tutor text conversations through existing owner-scoped storage", () => {
  assert.match(workspace, /SupabaseAgentConversationStore/);
  assert.match(workspace, /ServerAgentConversationRepository/);
  assert.match(workspace, /agentId: tutorId/);
  assert.match(workspace, /repository\.append/);
  assert.match(workspace, /buildPersistedTutorAnswer/);
  assert.match(workspace, /New session/);
});

test("BE-301 provides an age-appropriate contextual tutorial and Outcome hooks", () => {
  assert.equal(beastEducationTutorGuidedTour.steps.length, 4);
  assert.match(beastEducationTutorGuidedTour.steps.map((step) => step.description).join(" "), /take a clear picture/i);
  assert.match(workspace, /data-analytics-event="conversation_created"/);
  assert.match(workspace, /data-analytics-event="call_to_action_selected"/);
  assert.match(workspace, /data-analytics-status="started"/);
  assert.match(workspace, /data-tour-step="tutor-upload"/);
  assert.equal(firstPartyProfessionalId("beasteducation.tutor"), "tutor");
  const migration = readFileSync("supabase/migrations/20260829033929_add_tutor_outcome_telemetry.sql", "utf8");
  assert.match(migration, /professional_turn_started/);
  assert.match(migration, /professional_turn_completed/);
  assert.match(migration, /professional_turn_failed/);
  assert.match(migration, /does not store[\s\S]*homework text[\s\S]*image data/i);
});
