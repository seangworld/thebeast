import assert from "node:assert/strict";
import test from "node:test";
import {
  buildImportDuplicateKey,
  buildMoneyImportMappingFromTemplate,
  buildMoneyImportPreview,
  moneyImportTemplates,
  parseMoneyCsv,
  suggestMoneyImportTemplate,
  validateMoneyImportMapping,
} from "../src/lib/financialImport";

test("parseMoneyCsv parses quoted CSV rows", () => {
  const parsed = parseMoneyCsv('Date,Description,Amount\n2026-07-01,"Coffee, Shop",-4.50');

  assert.deepEqual(parsed.headers, ["Date", "Description", "Amount"]);
  assert.equal(parsed.rows[0].Description, "Coffee, Shop");
});

test("buildMoneyImportPreview validates mapped rows before save", () => {
  const preview = buildMoneyImportPreview({
    csv: "Name,Amount\nRent,1200\nGym,",
    mapping: {
      target: "bill",
      fields: {
        name: "Name",
        amount: "Amount",
      },
    },
  });

  assert.equal(preview.validRows.length, 1);
  assert.equal(preview.invalidRows.length, 1);
  assert.equal(preview.invalidRows[0].sourceRowNumber, 3);
  assert.deepEqual(preview.invalidRows[0].errors, ["Row 3: amount is required."]);
  assert.equal(preview.readyToSave, false);
});

test("validateMoneyImportMapping explains required, missing, duplicate, and unsupported mappings", () => {
  const issues = validateMoneyImportMapping({
    headers: ["Name", "Amount", "Amount"],
    mapping: {
      target: "bill",
      fields: {
        name: "Missing Name",
        amount: "Amount",
        frequency: "Amount",
        account_number: "Account",
      },
    },
  });

  assert.deepEqual(
    issues.map((issue) => issue.code),
    [
      "duplicate_header",
      "missing_source_header",
      "unsupported_target_field",
      "missing_source_header",
      "duplicate_source_mapping",
    ]
  );
  assert.equal(issues.every((issue) => issue.message.length > 20), true);
});

test("buildMoneyImportPreview blocks missing required column mappings with actionable errors", () => {
  const preview = buildMoneyImportPreview({
    csv: "Name,Total\nRent,1200",
    mapping: { target: "bill", fields: { name: "Name", amount: "Amount" } },
  });

  assert.deepEqual(preview.headers, ["Name", "Total"]);
  assert.deepEqual(
    preview.mappingIssues.map((issue) => issue.message),
    ['The mapped CSV column "Amount" for amount was not found.']
  );
  assert.deepEqual(preview.rows[0].errors, ["Row 2: amount is required."]);
  assert.equal(preview.readyToSave, false);
});

test("buildMoneyImportPreview detects duplicates", () => {
  const key = buildImportDuplicateKey("income", { name: "Paycheck", amount: 3200 });
  const preview = buildMoneyImportPreview({
    csv: "Name,Amount\nPaycheck,3200\nPaycheck,3200",
    mapping: {
      target: "income",
      fields: {
        name: "Name",
        amount: "Amount",
      },
    },
    existingDuplicateKeys: [key],
  });

  assert.equal(preview.duplicateRows.length, 2);
  assert.equal(preview.validRows.length, 0);
  assert.deepEqual(preview.duplicateRows.map((row) => row.duplicateSource), ["existing", "existing"]);
});

test("institution templates map common transaction and balance headers", () => {
  const transactionSuggestion = suggestMoneyImportTemplate({
    headers: ["Posted Date", "Merchant", "Charge Amount", "Category"],
    target: "transaction",
  });
  const debtTemplate = moneyImportTemplates.find((template) => template.id === "debt-balances");

  assert.equal(transactionSuggestion?.template.id, "credit-card-transactions");
  assert.deepEqual(transactionSuggestion?.mapping.fields, {
    date: "Posted Date",
    description: "Merchant",
    amount: "Charge Amount",
    category: "Category",
  });
  assert.deepEqual(
    buildMoneyImportMappingFromTemplate({
      headers: ["Creditor", "Current Balance", "APR", "Minimum"],
      template: debtTemplate!,
    }).fields,
    {
      name: "Creditor",
      balance: "Current Balance",
      minimum_payment: "Minimum",
      interest_rate: "APR",
    }
  );
});

test("duplicate detection normalizes currency precision, case, and whitespace", () => {
  const existingKey = buildImportDuplicateKey("transaction", {
    date: "2026-07-01",
    description: "Coffee Shop",
    amount: -4.5,
  });
  const preview = buildMoneyImportPreview({
    csv: 'Date,Description,Amount\n2026-07-01,"  COFFEE   SHOP  ",$-4.50\n2026-07-02,Gas,40\n2026-07-02, gas ,40.00',
    mapping: {
      target: "transaction",
      fields: { date: "Date", description: "Description", amount: "Amount" },
    },
    existingDuplicateKeys: [existingKey],
  });

  assert.equal(preview.rows[0].duplicateSource, "existing");
  assert.equal(preview.rows[1].duplicateSource, null);
  assert.equal(preview.rows[2].duplicateSource, "file");
  assert.equal(preview.duplicateRows.length, 2);
});
