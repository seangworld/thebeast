import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analyzeSmartFinancialImport } from "../src/lib/smartFinancialImport";
import { defaultAgentActionTools } from "../src/lib/platform/agents/tools";

const source = readFileSync("src/app/dashboard/money/import/SmartFinancialImport.tsx", "utf8");
const coachSource = readFileSync("src/app/dashboard/money/components/MoneyCoachExperience.tsx", "utf8");

test("BM-308 provides all three financial onboarding paths", () => {
  for (const label of ["Import My Financial Data", "Build My Financial Profile", "Explore First"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /Money Coach/);
  assert.match(source, /starter=Help%20me%20build%20my%20financial%20profile/);
  assert.match(coachSource, /searchParams\.get\("starter"\)/);
  assert.match(coachSource, /beginStarter\(requestedStarter\)/);
});

test("BM-308 lists supported exports and reuses Document Intelligence for documents", () => {
  for (const sourceName of ["Excel", "CSV", "Google Sheets", "Rocket Money", "Quicken", "Monarch", "YNAB", "Bank export", "Credit card export", "Loan export", "Statement"]) {
    assert.match(source, new RegExp(sourceName));
  }
  assert.match(source, /DocumentUploadDropzone/);
  assert.match(source, /shared Document Intelligence/);
});

test("BM-308 produces deterministic Money Coach findings from the existing preview engine", () => {
  const analysis = analyzeSmartFinancialImport({
    source: "loans.csv",
    target: "debt",
    csv: "Name,Balance,Minimum Payment,APR\nHome Mortgage,250000,1800,6.5\nCard,5000,150,20\nCard,5000,150,20",
  });
  assert.equal(analysis.preview.validRows.length, 2);
  assert.equal(analysis.preview.duplicateRows.length, 1);
  assert.ok(analysis.findings.some((item) => item.kind === "debt" && /2 debts/.test(item.title)));
  assert.ok(analysis.findings.some((item) => item.kind === "mortgage"));
  assert.ok(analysis.findings.some((item) => item.kind === "duplicate"));
});

test("BM-308 requires confirmation and performs owner-scoped writes", () => {
  assert.match(source, /Confirm and import/);
  assert.match(source, /preview\.readyToSave/);
  assert.match(source, /auth\.getUser/);
  assert.match(source, /user_id: user\.id/);
  assert.match(source, /async function confirmImport\(\)/);
});

test("BM-308 registers a structured import tool for Money Coach", () => {
  const tool = defaultAgentActionTools.find((item) => item.id === "import-financial-data");
  assert.equal(tool?.target, "/dashboard/money/import");
  assert.deepEqual(tool?.specialistAvailability, ["beastmoney.money-coach"]);
});
