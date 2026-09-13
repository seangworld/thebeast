import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderClientDeliveryDocuments } from "../src/lib/clientDeliveryPackage";

test("client delivery documents present scope and verifiable file evidence", () => {
  const documents = renderClientDeliveryDocuments({
    clientName: "Acme & Partners",
    projectName: "Launch <Site>",
    serviceType: "Website or application",
    summary: "Production-ready website delivery.",
    deliverables: "Application source\nDeployment guide",
    handoffInstructions: "Read README-FIRST.md.",
    nextSteps: "Confirm receipt\nDeploy to production",
    supportTerms: "One revision round within seven days.",
    deliveredAt: "2026-09-13",
    files: [{ originalName: "app.zip", packagePath: "Deliverables/app.zip", bytes: 128, sha256: "a".repeat(64) }],
  });
  assert.match(documents.readme, /Acme & Partners/);
  assert.match(documents.readme, /Application source/);
  assert.match(documents.readme, /Deliverables\/app\.zip/);
  assert.match(documents.report, /SEANGWORLD Client Delivery/);
  assert.match(documents.report, /Acme &amp; Partners/);
  assert.match(documents.report, /Launch &lt;Site&gt;/);
  assert.doesNotMatch(documents.report, /<Site>/);
  assert.match(documents.report, new RegExp("a{64}"));
});

test("client package route is bounded, owner-only, non-persistent, and checksum-backed", () => {
  const route = readFileSync("src/app/api/admin/production/client-package/route.ts", "utf8");
  const workspace = readFileSync("src/app/dashboard/operations/production/client-package/ClientDeliveryWorkspace.tsx", "utf8");
  assert.match(route, /MAX_TOTAL_BYTES = 24 \* 1024 \* 1024/);
  assert.match(route, /MAX_FILES = 50/);
  assert.match(route, /profile\.data\?\.role === "admin"/);
  assert.match(route, /Same-origin request required/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.doesNotMatch(route, /\.from\([^)]*client|storage\.|upload\(/);
  assert.match(workspace, /without AI credits/);
  assert.match(workspace, /are not saved to Beast/);
  assert.match(workspace, /does not create or approve the underlying client work/);
});
