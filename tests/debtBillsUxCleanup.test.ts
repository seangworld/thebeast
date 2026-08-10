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

test("BM-42E Bills header and rows share table-level columns, padding, and alignment", () => {
  const source = readFileSync(
    "src/app/dashboard/money/cashflow/components/BillsSection.tsx",
    "utf8"
  );
  const columns = source.match(/<colgroup data-money-table-columns="bills">([\s\S]*?)<\/colgroup>/)?.[1] || "";

  assert.equal((columns.match(/<col /g) || []).length, 6);
  assert.match(columns, /min-\[1440px\]:table-column/);
  assert.match(source, /money-aligned-table/);
  assert.equal((source.match(/money-table-cell/g) || []).length, 12);
  assert.equal((source.match(/money-table-align-right/g) || []).length, 2);
  assert.equal((source.match(/money-table-align-center/g) || []).length, 8);
  assert.doesNotMatch(source, /<td className="w-\[(?:28|18)%\]/);
});

test("BM-42E Debts header and rows share stable columns, padding, and alignment", () => {
  const source = debtsPage();
  const columns = source.match(/<colgroup data-money-table-columns="debts">([\s\S]*?)<\/colgroup>/)?.[1] || "";

  assert.equal((columns.match(/<col /g) || []).length, 7);
  assert.match(columns, /<col className="w-\[8%\]" \/>/);
  assert.match(source, /money-aligned-table/);
  assert.equal((source.match(/money-table-cell/g) || []).length, 14);
  assert.equal((source.match(/money-table-align-right/g) || []).length, 6);
  assert.equal((source.match(/money-table-align-center/g) || []).length, 4);
  assert.match(source, /money-table-align-left whitespace-nowrap">Priority/);
  assert.match(source, /money-table-align-left whitespace-nowrap">#\{index \+ 1\}/);
  assert.match(source, /data-mobile-debt-list-cards="true"/);
});

test("BM-42E alignment utilities override the generic header alignment at equal geometry", () => {
  const styles = readFileSync("src/app/globals.css", "utf8");

  assert.match(styles, /\.money-page-stack table\.money-aligned-table \{[\s\S]*?width: 100%;[\s\S]*?table-layout: fixed;/);
  assert.match(styles, /\.money-page-stack \.money-table-cell \{[\s\S]*?padding-left: 14px;[\s\S]*?padding-right: 14px;/);
  for (const alignment of ["left", "center", "right"]) {
    assert.match(styles, new RegExp(`\\.money-page-stack \\.money-table-align-${alignment} \\{[\\s\\S]*?text-align: ${alignment};`));
  }
});

test("BM-42E Debt Actions uses the narrow single-column Bills footprint", () => {
  const page = debtsPage();
  const actions = readFileSync("src/app/dashboard/money/debts/DebtManagementActions.tsx", "utf8");

  assert.match(page, /width=\{224\}/);
  assert.match(page, /data-debt-actions-layout="compact"/);
  assert.match(page, /editAction=\{<button[\s\S]*?>Edit<\/button>\}/);
  assert.doesNotMatch(page, /width=\{560\}/);
  assert.doesNotMatch(page, /pt-3 sm:grid-cols-3/);
  assert.match(actions, /data-debt-management-layout="compact"/);
  assert.match(actions, />History<\/button>[\s\S]*?\{editAction\}[\s\S]*?>Reset Due Date<\/button>/);
  assert.doesNotMatch(actions, /sm:grid-cols-2/);
  assert.match(actions, /grid grid-cols-1 gap-2/);
  assert.match(actions, /w-full whitespace-nowrap px-4 text-sm/);
});
