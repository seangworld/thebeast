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
  assert.match(reports.html, /SEANGWORLD Client Code Audit/);
  assert.match(reports.remediation, /Prioritized Remediation Plan/);
  assert.match(reports.verification, /Runtime Verification Checklist/);
  assert.match(reports.csv, /Occurrences/);
  assert.match(reports.delivery, /already the complete client-facing audit package/);
  assert.doesNotMatch(JSON.stringify(audit) + reports.summary + reports.findings, /super-secret-value/);
});

test("client code audit records missing delivery fundamentals", () => {
  const audit = auditClientCode({ clientName: "Client", projectName: "Tiny", files: [{ path: "main.py", content: "print('safe')\n" }] });
  for (const title of ["README not found", "Automated tests not found", "Dependency manifest not found"]) assert.ok(audit.findings.some((finding) => finding.title === title));
  assert.ok(audit.inventory.detectedSignals.includes("Python"));
  assert.equal(audit.project.auditType, "full");
  assert.ok(audit.coverage.some((check) => check.name === "Automated tests" && check.status === "attention"));
});

test("audit profiles select relevant categories and aggregate repeated matches", () => {
  const files = [{ path: "src/page.tsx", content: "console.log('one');\nconsole.log('two');\n<div onClick={go}>Open</div>\n" }];
  const security = auditClientCode({ clientName: "Client", projectName: "Security", auditType: "security", files });
  assert.ok(!security.findings.some((finding) => finding.category === "maintainability" || finding.category === "accessibility"));
  const quality = auditClientCode({ clientName: "Client", projectName: "Quality", auditType: "quality", files });
  const logging = quality.findings.find((finding) => finding.title === "Debug logging remains");
  assert.equal(logging?.occurrences, 2);
  assert.deepEqual(logging?.additionalLines, [2]);
  assert.ok(quality.findings.some((finding) => finding.title === "Clickable non-interactive element"));
});

test("complete audit evaluates local dependency reproducibility without claiming live CVEs", () => {
  const audit = auditClientCode({ clientName: "Client", projectName: "Dependencies", files: [
    { path: "package.json", content: JSON.stringify({ scripts: { postinstall: "node setup.js" }, dependencies: { example: "latest" } }) },
    { path: "README.md", content: "# Project" },
    { path: "tests/app.test.ts", content: "// test" },
  ] });
  assert.equal(audit.inventory.declaredDependencies, 1);
  assert.ok(audit.findings.some((finding) => finding.title === "Unbounded dependency version"));
  assert.ok(audit.findings.some((finding) => finding.title === "Install lifecycle script requires review"));
  assert.ok(audit.limitations.some((item) => item.includes("live vulnerability advisories")));
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
  assert.match(route, /Code-Audit-Report\.html/);
  assert.match(route, /Prioritized-Remediation-Plan\.md/);
  assert.match(route, /seangworld_client_jobs/);
  assert.match(route, /"x-job-recorded"/);
  assert.match(workspace, /You do not need to run it through Client Delivery Package/);
});

test("client job history is metadata-only, owner-scoped, and safely archivable", () => {
  const migration = readFileSync("supabase/migrations/20260913190420_client_work_history.sql", "utf8");
  const route = readFileSync("src/app/api/admin/production/client-jobs/route.ts", "utf8");
  const history = readFileSync("src/app/dashboard/operations/production/ClientWorkHistory.tsx", "utf8");
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\)\) = owner_id/);
  assert.match(migration, /grant select, insert, update/);
  assert.doesNotMatch(migration, /source_(?:code|content)|deliverable_(?:data|content)|bytea/);
  assert.match(route, /profile\.data\?\.role === "admin"/);
  assert.match(route, /\.eq\("owner_id", access\.id\)/);
  assert.match(route, /\.limit\(100\)/);
  assert.match(route, /Same-origin request required/);
  assert.match(route, /body\.action !== "archive"/);
  assert.match(history, /Client source and deliverables are not stored/);
  assert.match(history, /finished files remain only in your download/);
});
