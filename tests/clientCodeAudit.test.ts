import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { auditClientCode, renderAuditReports } from "../src/lib/clientCodeAudit";
import { renderClientCodeAuditPdf } from "../src/lib/clientCodeAuditPdf";

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
  assert.match(reports.html, /SEANGWORLD Code Risk Scan/);
  assert.match(reports.summary, /Top five actions before launch/);
  assert.match(reports.summary, /Scan coverage/);
  assert.match(reports.remediation, /Prioritized Remediation Plan/);
  assert.match(reports.verification, /Runtime Verification Checklist/);
  assert.match(reports.csv, /Occurrences/);
  assert.match(reports.delivery, /already the complete client-facing Code Risk Scan package/);
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

test("complete scan adds security, framework, database, complexity, and launch checks without leaking matched values", () => {
  const providerToken = `ghp_${"a".repeat(36)}`;
  const databaseUrl = "postgres://risk_user:risk_password@example.test/app";
  const repeated = Array.from({ length: 8 }, (_, index) => `const repeatedValue${index} = performStep(${index});`).join("\n");
  const audit = auditClientCode({ clientName: "Client", projectName: "Expanded", files: [
    { path: ".env", content: `GITHUB_TOKEN=${providerToken}\nDATABASE_URL=${databaseUrl}\n` },
    { path: "next.config.ts", content: "export default { typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }, reactStrictMode: false };" },
    { path: "src/auth.ts", content: "const claims = jwt.decode(token);\nsetCookie('session', value, { httpOnly: false, secure: false });" },
    { path: "supabase/migration.sql", content: "create table public.orders (id uuid);\ncreate policy open on public.orders using (true);" },
    { path: "src/one.ts", content: repeated },
    { path: "src/two.ts", content: repeated },
    { path: "package.json", content: JSON.stringify({ scripts: { test: "node --test" }, dependencies: { next: "15.0.0" } }) },
    { path: "package-lock.json", content: "{}" },
    { path: "README.md", content: "# Expanded" },
    { path: "tests/app.test.ts", content: "// test" },
  ] });

  for (const title of ["Provider access token in source", "Database connection credential in source", "Environment file included in submitted source", "Token decoded without signature verification", "Cookie security disabled", "Permissive row-level security policy", "Database tables may lack row-level security", "Type errors ignored during production build", "Repeated code-block indicators"]) {
    assert.ok(audit.findings.some((finding) => finding.title === title), title);
  }
  assert.equal(audit.scanCoverage.length, 9);
  assert.equal(audit.topActions.length, 5);
  const reports = renderAuditReports(audit);
  const output = JSON.stringify(audit) + Object.values(reports).join("\n");
  assert.doesNotMatch(output, new RegExp(providerToken));
  assert.doesNotMatch(output, /risk_password/);
});

test("client code audit PDF is polished, complete, and generated without source excerpts", async () => {
  const secret = "super-secret-value";
  const audit = auditClientCode({
    clientName: "Example Client",
    projectName: "Launch Readiness Application",
    focus: "Authentication, payments, and launch readiness",
    generatedAt: "2026-09-13T12:00:00.000Z",
    files: [
      { path: "src/server.ts", content: `const apiKey = '${secret}';\nconst result = eval(input);\nconsole.log(result);\n` },
      { path: "src/page.tsx", content: "<div onClick={go}>Open</div>\n<img src='/hero.png'>\n" },
      { path: "package.json", content: '{"scripts":{"test":"node --test"},"dependencies":{"next":"15.0.0"}}' },
      { path: "README.md", content: "# Launch Readiness Application\n" },
      { path: "tests/server.test.ts", content: "// test fixture\n" },
    ],
  });
  const bytes = await renderClientCodeAuditPdf(audit);
  assert.equal(Buffer.from(bytes.subarray(0, 5)).toString("ascii"), "%PDF-");
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 3);
  assert.equal(pdf.getTitle(), "Launch Readiness Application Code Risk Scan");
  assert.doesNotMatch(Buffer.from(bytes).toString("latin1"), new RegExp(secret));
});

test("client code audit route remains bounded, owner-only, no-execution, and no-credit", () => {
  const route = readFileSync("src/app/api/admin/production/code-audit/route.ts", "utf8");
  const workspace = readFileSync("src/app/dashboard/operations/production/code-audit/ClientCodeAuditWorkspace.tsx", "utf8");
  const nextConfig = readFileSync("next.config.js", "utf8");
  assert.match(route, /MAX_UPLOAD_BYTES = 12 \* 1024 \* 1024/);
  assert.match(route, /MAX_FILES = 1500/);
  assert.match(route, /MAX_FILE_REVIEW_BYTES = 2 \* 1024 \* 1024/);
  assert.match(route, /declaredUncompressedBytes > MAX_FILE_REVIEW_BYTES/);
  assert.match(route, /profile\.data\?\.role === "admin"/);
  assert.match(route, /Same-origin request required/);
  assert.match(route, /entry\.async\("string"\)/);
  assert.doesNotMatch(route, /child_process|\.exec\(|spawn\(/);
  assert.match(workspace, /without using AI credits/);
  assert.match(workspace, /does not run the code/);
  assert.match(route, /const auditType = "full" as const/);
  assert.doesNotMatch(route, /openai|anthropic|child_process|fetch\(/i);
  assert.match(workspace, /without using AI credits or paid APIs/);
  assert.doesNotMatch(workspace, /<select name="auditType"/);
  assert.match(route, /Code-Risk-Scan-Report\.html/);
  assert.match(route, /Code-Risk-Scan-Report\.pdf/);
  assert.match(route, /renderClientCodeAuditPdf/);
  assert.match(nextConfig, /\/api\/admin\/production\/code-audit/);
  for (const font of ["400-normal", "400-italic", "700-normal"]) assert.match(nextConfig, new RegExp(`source-serif-4-latin-${font}\\.woff`));
  assert.match(route, /Prioritized-Remediation-Plan\.md/);
  assert.match(workspace, /polished client-ready PDF/);
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
