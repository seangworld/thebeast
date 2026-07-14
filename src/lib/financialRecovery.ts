import {
  buildImportDuplicateKey,
  type MoneyImportPreview,
  type MoneyImportTarget,
} from "./financialImport";

export type FinancialSnapshotRow = {
  id: string;
  target: MoneyImportTarget;
  values: Record<string, string | number | null | undefined>;
};

export type FinancialSnapshot = {
  exportedAt: string;
  rows: FinancialSnapshotRow[];
};

export type FinancialReconciliationAction =
  | {
      type: "create";
      target: MoneyImportTarget;
      duplicateKey: string;
      values: Record<string, string | number>;
    }
  | {
      type: "skip_duplicate";
      target: MoneyImportTarget;
      duplicateKey: string;
      values: Record<string, string | number>;
    }
  | {
      type: "reject_invalid";
      target: MoneyImportTarget;
      rowIndex: number;
      errors: string[];
    };

export type FinancialImportReconciliation = {
  actions: FinancialReconciliationAction[];
  creates: FinancialReconciliationAction[];
  skippedDuplicates: FinancialReconciliationAction[];
  rejectedInvalidRows: FinancialReconciliationAction[];
  readyToApply: boolean;
};

export type FinancialUndoAction = {
  type: "restore" | "remove";
  target: MoneyImportTarget;
  id: string;
  values?: Record<string, string | number | null | undefined>;
};

export type FinancialUndoPlan = {
  actions: FinancialUndoAction[];
  canRestore: boolean;
};

export function buildFinancialSnapshot({
  rows,
  exportedAt = new Date().toISOString(),
}: {
  rows: FinancialSnapshotRow[];
  exportedAt?: string;
}): FinancialSnapshot {
  return {
    exportedAt,
    rows: rows.map((row) => ({ ...row, values: { ...row.values } })),
  };
}

export function buildFinancialImportReconciliation(
  preview: MoneyImportPreview
): FinancialImportReconciliation {
  const actions = preview.rows.map<FinancialReconciliationAction>((row) => {
    if (row.errors.length > 0) {
      return {
        type: "reject_invalid",
        target: row.target,
        rowIndex: row.rowIndex,
        errors: row.errors,
      };
    }

    if (row.duplicate) {
      return {
        type: "skip_duplicate",
        target: row.target,
        duplicateKey: row.duplicateKey,
        values: row.values,
      };
    }

    return {
      type: "create",
      target: row.target,
      duplicateKey: row.duplicateKey,
      values: row.values,
    };
  });

  return {
    actions,
    creates: actions.filter((action) => action.type === "create"),
    skippedDuplicates: actions.filter((action) => action.type === "skip_duplicate"),
    rejectedInvalidRows: actions.filter((action) => action.type === "reject_invalid"),
    readyToApply: actions.length > 0 && actions.every((action) => action.type !== "reject_invalid"),
  };
}

export function buildFinancialUndoPlan({
  before,
  after,
}: {
  before: FinancialSnapshot;
  after: FinancialSnapshot;
}): FinancialUndoPlan {
  const beforeByKey = new Map(
    before.rows.map((row) => [
      buildImportDuplicateKey(row.target, row.values as Record<string, string | number>),
      row,
    ])
  );
  const afterByKey = new Map(
    after.rows.map((row) => [
      buildImportDuplicateKey(row.target, row.values as Record<string, string | number>),
      row,
    ])
  );
  const actions: FinancialUndoAction[] = [];

  for (const [key, row] of Array.from(beforeByKey.entries())) {
    if (!afterByKey.has(key)) {
      actions.push({
        type: "restore",
        target: row.target,
        id: row.id,
        values: row.values,
      });
    }
  }

  for (const [key, row] of Array.from(afterByKey.entries())) {
    if (!beforeByKey.has(key)) {
      actions.push({
        type: "remove",
        target: row.target,
        id: row.id,
      });
    }
  }

  return {
    actions,
    canRestore: actions.length > 0,
  };
}
