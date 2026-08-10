import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const debtsPage = () => readFileSync("src/app/dashboard/money/debts/page.tsx", "utf8");

test("BM-42D Add Debt follows the collapsed Add Bill disclosure pattern", () => {
  const source = debtsPage();

  assert.match(source, /const \[showAddDebt, setShowAddDebt\] = useState\(false\)/);
  assert.match(source, /aria-expanded=\{showAddDebt\}/);
  assert.match(source, /aria-controls="add-debt-form"/);
  assert.match(source, /\{showAddDebt \? \(/);
  assert.match(source, /id="add-debt-form"/);
  assert.match(source, /\{showAddDebt \? "Hide" : "Show"\}/);
  assert.match(source, /onClick=\{addDebt\}/);
});

test("BM-42D debt actions retain the selected-debt canonical edit workflow", () => {
  const source = debtsPage();
  const automation = readFileSync(
    "src/app/dashboard/money/components/PaymentAutomationControls.tsx",
    "utf8"
  );

  assert.match(automation, />Auto Pay</);
  assert.match(automation, />Reminder</);
  for (const label of ["Edit", "Archive", "Delete"]) {
    assert.match(source, new RegExp(`>${label}<`));
  }
  assert.match(source, /onClick=\{\(\) => \{ close\(\); onEdit\(\); \}\}[^>]*>Edit<\/button>/);
  assert.match(source, /onEdit=\{\(\) => startEditDebt\(debt\)\}/);
  assert.match(source, /onClick=\{\(\) => saveEditDebt\(debt\.id\)\}/);
  assert.match(source, /await load\(\)/);
});

test("BM-42D Bills header and rows share one table-level column definition", () => {
  const source = readFileSync(
    "src/app/dashboard/money/cashflow/components/BillsSection.tsx",
    "utf8"
  );
  const columns = source.match(/<colgroup data-money-table-columns="bills">([\s\S]*?)<\/colgroup>/)?.[1] || "";

  assert.equal((columns.match(/<col /g) || []).length, 6);
  assert.match(columns, /min-\[1440px\]:table-column/);
  assert.doesNotMatch(source, /<td className="w-\[(?:28|18)%\]/);
});

test("BM-42D Debts header and rows share stable columns with a narrow priority column", () => {
  const source = debtsPage();
  const columns = source.match(/<colgroup data-money-table-columns="debts">([\s\S]*?)<\/colgroup>/)?.[1] || "";

  assert.equal((columns.match(/<col /g) || []).length, 7);
  assert.match(columns, /<col className="w-\[8%\]" \/>/);
  assert.match(source, /<th className="whitespace-nowrap">Priority<\/th>/);
  assert.match(source, /<td className="whitespace-nowrap">#\{index \+ 1\}<\/td>/);
  assert.match(source, /data-mobile-debt-list-cards="true"/);
});
