import assert from "node:assert/strict";
import test from "node:test";
import {
  financialInstitutionEvaluationFramework,
  validateFinancialInstitutionFrameworkBoundary,
} from "../src/lib/financialInstitutionEvaluation";

test("BM-28 defines provider-neutral evidence criteria without scoring or ranking", () => {
  const framework = financialInstitutionEvaluationFramework;

  assert.equal(framework.package, "BM-28");
  assert.equal(framework.status, "framework_only");
  assert.equal(framework.criteria.length, 10);
  assert.equal(new Set(framework.criteria.map((criterion) => criterion.id)).size, 10);
  assert.equal(framework.criteria.every((criterion) => criterion.requiredEvidence.length >= 3), true);
  assert.equal(
    framework.criteria.every(
      (criterion) =>
        !("score" in criterion) &&
        !("weight" in criterion) &&
        !("rank" in criterion) &&
        !("institution" in criterion)
    ),
    true
  );
});

test("BM-28 keeps every provider-specific and commercial capability disabled", () => {
  assert.deepEqual(financialInstitutionEvaluationFramework.currentAuthority, {
    evaluateSpecificInstitution: false,
    recommendInstitution: false,
    rankInstitutions: false,
    monetizeInstitutionRelationship: false,
    collectInstitutionCredentials: false,
    connectToInstitution: false,
  });
  assert.equal(financialInstitutionEvaluationFramework.futureApprovalGates.length, 7);
  assert.match(financialInstitutionEvaluationFramework.futureApprovalGates[0], /owner-approved future roadmap package/i);
});

test("BM-28 boundary validation blocks named institutions evaluation ranking monetization credentials and integration", () => {
  const review = validateFinancialInstitutionFrameworkBoundary({
    namedInstitutionCount: 1,
    hasInstitutionEvaluation: true,
    hasRecommendation: true,
    hasRanking: true,
    hasMonetization: true,
    hasCredentialCollection: true,
    hasLiveIntegration: true,
  });

  assert.equal(review.frameworkOnlyCompliant, false);
  assert.equal(review.status, "blocked");
  assert.equal(review.violations.length, 7);
  assert.equal(review.violations.every((violation) => /BM-28|future owner-approved/i.test(violation)), true);
});

test("BM-28 accepts only an empty framework-only boundary", () => {
  assert.deepEqual(validateFinancialInstitutionFrameworkBoundary(), {
    frameworkOnlyCompliant: true,
    status: "framework_only",
    violations: [],
  });
});
