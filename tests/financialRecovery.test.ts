import assert from "node:assert/strict";
import test from "node:test";
import {
  buildImportDuplicateKey,
  buildMoneyImportPreview,
  correctMoneyImportPreviewRow,
} from "../src/lib/financialImport";
import {
  appendFinancialImportHistory,
  buildFinancialImportHistoryEntry,
  buildFinancialImportRollback,
  buildFinancialSnapshot,
  markFinancialImportRolledBack,
} from "../src/lib/financialRecovery";

test("BM-27 corrects invalid preview rows and recalculates duplicates", () => {
  const preview = buildMoneyImportPreview({
    csv: "Name,Amount\nRent,\nUtilities,120",
    mapping: { target: "bill", fields: { name: "Name", amount: "Amount" } },
  });
  const corrected = correctMoneyImportPreviewRow({
    preview,
    rowIndex: 1,
    updates: { amount: 1200 },
    existingDuplicateKeys: [buildImportDuplicateKey("bill", { name: "Utilities", amount: 120 })],
  });

  assert.equal(preview.invalidRows.length, 1);
  assert.equal(corrected.invalidRows.length, 0);
  assert.equal(corrected.validRows.length, 1);
  assert.equal(corrected.duplicateRows[0].duplicateSource, "existing");
  assert.equal(corrected.readyToSave, true);
});

test("BM-27 records bounded import history and builds reviewable rollback actions", () => {
  const preview = buildMoneyImportPreview({
    csv: "Name,Amount\nUtilities,120",
    mapping: { target: "bill", fields: { name: "Name", amount: "Amount" } },
  });
  const before = buildFinancialSnapshot({
    exportedAt: "2026-07-18T00:00:00-04:00",
    rows: [{ id: "rent", target: "bill", values: { name: "Rent", amount: 1200 } }],
  });
  const after = buildFinancialSnapshot({
    exportedAt: "2026-07-18T00:01:00-04:00",
    rows: [
      { id: "rent", target: "bill", values: { name: "Rent", amount: 1200 } },
      { id: "utilities", target: "bill", values: { name: "Utilities", amount: 120 } },
    ],
  });
  const entry = buildFinancialImportHistoryEntry({
    id: "import-1",
    sourceName: "bills.csv",
    recordedAt: "2026-07-18T00:01:00-04:00",
    preview,
    before,
    after,
  });
  const history = appendFinancialImportHistory(
    [{ ...entry, id: "older", recordedAt: "2026-07-17T00:00:00-04:00" }],
    entry,
    1
  );
  const rollback = buildFinancialImportRollback(entry);
  const rolledBack = markFinancialImportRolledBack(entry, "2026-07-18T00:02:00-04:00");

  assert.deepEqual(entry.counts, { total: 1, created: 1, duplicates: 0, invalid: 0 });
  assert.deepEqual(history.map((item) => item.id), ["import-1"]);
  assert.equal(rollback.allowed, true);
  assert.deepEqual(rollback.actions, [{ type: "remove", target: "bill", id: "utilities" }]);
  assert.match(rollback.confirmation, /Review 1 rollback action/);
  assert.equal(rolledBack.status, "rolled_back");
  assert.equal(rolledBack.rolledBackAt, "2026-07-18T00:02:00-04:00");
});

test("BM-27 refuses rollback without applied before-and-after snapshots", () => {
  const preview = buildMoneyImportPreview({
    csv: "Name,Amount\nRent,1200",
    mapping: { target: "bill", fields: { name: "Name", amount: "Amount" } },
  });
  const entry = buildFinancialImportHistoryEntry({
    id: "preview-only",
    sourceName: "bills.csv",
    recordedAt: "2026-07-18T00:00:00-04:00",
    preview,
  });

  assert.deepEqual(buildFinancialImportRollback(entry), {
    allowed: false,
    actions: [],
    confirmation: "Rollback is available only for an applied import with before-and-after snapshots.",
  });
});
