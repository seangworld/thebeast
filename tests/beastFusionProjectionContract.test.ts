import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildBeastFusionProjectionTargetContract, beastFusionProjectionContract } from "../src/lib/beastFusionProjectionContract";
import { calculateBeastFusionProjectionId } from "../src/lib/beastFusionCommandProjection";

const previewCommit = "a".repeat(40);
const productionCommit = "b".repeat(40);

test("Preview and Production expose the same explicit compatible projection contract", () => {
  const preview = buildBeastFusionProjectionTargetContract({
    VERCEL_ENV: "preview",
    VERCEL_PROJECT_NAME: "thebeast",
    VERCEL_DEPLOYMENT_ID: "dpl_Preview123",
    VERCEL_GIT_COMMIT_SHA: previewCommit,
    VERCEL_URL: "thebeast-preview.vercel.app",
  });
  const production = buildBeastFusionProjectionTargetContract({
    VERCEL_ENV: "production",
    VERCEL_PROJECT_NAME: "thebeast",
    VERCEL_DEPLOYMENT_ID: "dpl_Production123",
    VERCEL_GIT_COMMIT_SHA: productionCommit,
    VERCEL_URL: "thebeast-production.vercel.app",
  });
  assert.deepEqual(preview.contract, production.contract);
  assert.equal(preview.contract.contractVersion, "1.1.0");
  assert.equal(preview.contract.compatibilityId, "bfcp-v1-sha256-input-digest-nul-source-commit");
  assert.equal(preview.deployment.environment, "preview");
  assert.equal(production.deployment.environment, "production");
  assert.equal(preview.deployment.commit, previewCommit);
  assert.equal(production.deployment.commit, productionCommit);
});

test("projection identity implementation is bound to the declared commit-aware algorithm", () => {
  const inputDigest = `sha256:${"c".repeat(64)}`;
  assert.notEqual(
    calculateBeastFusionProjectionId(inputDigest, previewCommit),
    calculateBeastFusionProjectionId(inputDigest, productionCommit),
  );
  assert.match(beastFusionProjectionContract.identityAlgorithm, /canonicalInputDigest \+ NUL \+ sourceCommit/);
});

test("invalid or absent deployment provenance is never fabricated", () => {
  const result = buildBeastFusionProjectionTargetContract({
    VERCEL_ENV: "unexpected",
    VERCEL_PROJECT_NAME: "unsafe project name",
    VERCEL_DEPLOYMENT_ID: "not-a-deployment",
    VERCEL_GIT_COMMIT_SHA: "short",
    VERCEL_URL: "example.com",
  });
  assert.deepEqual(result.deployment, {
    project: null,
    id: null,
    commit: null,
    environment: "unknown",
    url: null,
  });
});

test("contract route is no-store and exposes no credential or member-data dependency", () => {
  const route = readFileSync(join(process.cwd(), "src/app/api/admin/beastfusion-projection/contract/route.ts"), "utf8");
  assert.match(route, /no-cache, no-store/);
  assert.match(route, /buildBeastFusionProjectionTargetContract/);
  assert.doesNotMatch(route, /SUPABASE|OPENAI|authorization|member|secret/i);
});
