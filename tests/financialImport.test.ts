import assert from "node:assert/strict";
import test from "node:test";
import {
  buildImportDuplicateKey,
  buildMoneyImportPreview,
  parseMoneyCsv,
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
});
