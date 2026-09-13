import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditClientCode, renderAuditReports } from "../src/lib/clientCodeAudit";

test("client code audit prioritizes deterministic findings without exposing credential values", () => {
  const audit = auditClientCode({
    clientName: "Example Client",
    projectName: "Launch App",
    focus: "Security and delivery",
    generatedAt: "2026-09-13T12:00:00.000Z",
    files: [
      { path: "src/server.ts", content: "const apiKey = 'super-secret-value';\nconst result = eval(input);\nconsole.log(result);\n" },
      { path: "README.md", content: "# Launch App\n\nRun the app.\n" },
      { path: "package.json", content: '{"scripts":{"test":"node --test"}}' },
      { path: "tests/server.test.ts", content: "// test fixture\n" },
    ],
  });

  assert.equal(audit.inventory.filesReviewed, 4);
  assert.ok(audit.summary.high >= 2);
  assert.equal(audit.findings[0].severity, "high");
  assert.ok(audit.findings.some((finding) => finding.title === "Dynamic code execution" && finding.path === "src/server.ts" && finding.line === 2));
  assert.ok(audit.findings.some((finding) => finding.title === "Possible hard-coded credential"));
  const reports = renderAuditReports(audit);
  assert.match(reports.summary, /Example Client/);
  assert.match(reports.findings, /Technical Findings/);
  assert.doesNotMatch(JSON.stringify(audit) + reports.summary + reports.findings, /super-secret-value/);
});

test("client code audit records missing delivery fundamentals", () => {
  const audit = auditClientCode({ clientName: "Client", projectName: "Tiny", files: [{ path: "main.py", content: "print('safe')\n" }] });
  for (const title of ["README not found", "Automated tests not found", "Dependency manifest not found"]) assert.ok(audit.findings.some((finding) => finding.title === title));
  assert.ok(audit.inventory.detectedSignals.includes("Python"));
});

test("client code audit route remains bounded, owner-only, no-execution, and no-credit", () => {
  const route = readFileSync("src/app/api/admin/production/code-audit/route.ts", "utf8");
  const workspace = readFileSync("src/app/dashboard/operations/production/code-audit/ClientCodeAuditWorkspace.tsx", "utf8");
  assert.match(route, /MAX_UPLOAD_BYTES = 12 \* 1024 \* 1024/);
  assert.match(route, /MAX_FILES = 1500/);
  assert.match(route, /profile\.data\?\.role === "admin"/);
  assert.match(route, /Same-origin request required/);
  assert.match(route, /entry\.async\("string"\)/);
  assert.doesNotMatch(route, /child_process|\.exec\(|spawn\(/);
  assert.match(workspace, /without using AI credits/);
  assert.match(workspace, /does not run the code/);
});
