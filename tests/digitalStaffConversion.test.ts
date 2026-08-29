import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { authoritativeProfessionalPrompts } from "../src/lib/digitalStaffRuntime";

const money = readFileSync("src/app/dashboard/money/components/MoneyCoachExperience.tsx", "utf8");
const guidance = readFileSync("src/app/dashboard/learning/GuidanceCounselorConversation.tsx", "utf8");
const health = readFileSync("src/app/dashboard/health/HealthAdvisorWorkspace.tsx", "utf8");
const director = readFileSync("src/app/api/director/conversations/route.ts", "utf8");
const runtimeRoute = readFileSync("src/app/api/digital-staff/runtime/route.ts", "utf8");

test("AP-100B gives every current professional an authoritative hardened prompt", () => {
  assert.equal(Object.keys(authoritativeProfessionalPrompts).length, 5);
  assert.match(authoritativeProfessionalPrompts["beastmoney.money-coach"], /canonical deterministic calculations/);
  assert.match(authoritativeProfessionalPrompts["beastmoney.money-coach"], /Answer every material part of a compound question/);
  assert.match(authoritativeProfessionalPrompts["beasteducation.guidance-counselor"], /instead of following a discovery script/);
  assert.match(authoritativeProfessionalPrompts["beasteducation.tutor"], /Teach for understanding/);
  assert.match(authoritativeProfessionalPrompts["beasthealth.health-advisor"], /Do not diagnose, prescribe/);
  assert.match(authoritativeProfessionalPrompts["beasthealth.health-advisor"], /without current authoritative evidence/);
  assert.match(authoritativeProfessionalPrompts["beastfusion.fusion-director"], /Coordinate rather than impersonate specialists/);
});

test("AP-100B converts all live professional message paths to the shared runtime", () => {
  assert.match(money, /requestDigitalStaffResponse/);
  assert.doesNotMatch(money, /answerMoneyCoachQuestion\(value/);
  assert.match(guidance, /requestDigitalStaffResponse/);
  assert.doesNotMatch(guidance, /buildGuidanceCounselorConversationTurn\(/);
  assert.doesNotMatch(guidance, /learnFromDiscoveryTurn\(cleanQuestion/);
  assert.match(health, /requestDigitalStaffResponse/);
  assert.doesNotMatch(health, /fetch\("\/api\/health\/advisor"/);
  assert.doesNotMatch(health, /approve sending the text I type to OpenAI/i);
  assert.match(director, /runDigitalStaffRuntime/);
  assert.doesNotMatch(director, /buildDirectorRecommendation\(\{ question/);
});

test("AP-100B persists continuity, proposals, provenance, and safe operational metadata", () => {
  assert.match(runtimeRoute, /runtimeState: result\.state/);
  assert.match(runtimeRoute, /proposals: result\.proposals/);
  assert.match(runtimeRoute, /validationFailures: result\.validationFailures/);
  assert.match(runtimeRoute, /\.eq\("owner_id", user\.id\)/);
  assert.match(runtimeRoute, /agent_conversation_messages/);
});
