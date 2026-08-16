import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { digitalStaffEvaluationCases, requireDigitalStaffEvaluationCase } from "../src/lib/digitalStaffRuntime";

test("DS-MODEL-ROUTE evaluation set covers ordinary and strong work for all three professionals", () => {
  assert.equal(digitalStaffEvaluationCases.length, 17);
  for (const professionalId of [
    "beastmoney.money-coach",
    "beasteducation.guidance-counselor",
    "beasthealth.health-advisor",
  ]) {
    const cases = digitalStaffEvaluationCases.filter((item) => item.professionalId === professionalId);
    assert.ok(cases.some((item) => item.tier === "ordinary"));
    assert.ok(cases.some((item) => item.tier === "strong"));
  }
  assert.equal(requireDigitalStaffEvaluationCase("money-laptop").category, "contextual_affordability");
  assert.throws(() => requireDigitalStaffEvaluationCase("missing"), /Unknown/);
});

test("DS-MODEL-ROUTE automated Health cases are synthetic and preserve safety expectations", () => {
  const healthCases = digitalStaffEvaluationCases.filter((item) => item.professionalId === "beasthealth.health-advisor");
  assert.ok(healthCases.every((item) => item.context.ownerId === "synthetic-evaluation-owner"));
  assert.ok(healthCases.filter((item) => item.tier === "strong").every((item) => item.context.message.text.includes("Synthetic case:")));
  assert.ok(healthCases.every((item) => item.expectations.some((expectation) => /diagnos|licensed care|medication change|clinician/i.test(expectation))));
});

test("DS-MODEL-ROUTE evaluation endpoint is Preview-only, owner-only, and model-allowlisted", () => {
  const route = readFileSync("src/app/api/admin/digital-staff-model-evaluation/route.ts", "utf8");
  assert.match(route, /VERCEL_ENV === "production"/);
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /supportedEvaluationModels/);
  assert.match(route, /createOpenAIRequestHeaders/);
  assert.doesNotMatch(route, /OPENAI_API_KEY/);
});

test("DS-MODEL-ROUTE evaluation UI runs only the approved synthetic catalog", () => {
  const page = readFileSync("src/app/dashboard/admin/digital-staff-model-evaluation/page.tsx", "utf8");
  assert.match(page, /Run approved synthetic benchmark/);
  assert.match(page, /availability\.cases/);
  assert.match(page, /does not load member records/i);
  assert.doesNotMatch(page, /OPENAI_API_KEY/);
});
