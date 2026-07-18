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

export type FinancialImportHistoryEntry = {
  id: string;
  sourceName: string;
  target: MoneyImportTarget;
  recordedAt: string;
  status: "previewed" | "applied" | "rolled_back";
  counts: {
    total: number;
    created: number;
    duplicates: number;
    invalid: number;
  };
  before: FinancialSnapshot | null;
  after: FinancialSnapshot | null;
  rolledBackAt: string | null;
};

export type FinancialImportRollback = {
  allowed: boolean;
  actions: FinancialUndoAction[];
  confirmation: string;
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

export function buildFinancialImportHistoryEntry({
  id,
  sourceName,
  recordedAt,
  preview,
  before = null,
  after = null,
}: {
  id: string;
  sourceName: string;
  recordedAt: string;
  preview: MoneyImportPreview;
  before?: FinancialSnapshot | null;
  after?: FinancialSnapshot | null;
}): FinancialImportHistoryEntry {
  const reconciliation = buildFinancialImportReconciliation(preview);
  return {
    id,
    sourceName,
    target: preview.target,
    recordedAt,
    status: after ? "applied" : "previewed",
    counts: {
      total: preview.rows.length,
      created: reconciliation.creates.length,
      duplicates: reconciliation.skippedDuplicates.length,
      invalid: reconciliation.rejectedInvalidRows.length,
    },
    before: before ? buildFinancialSnapshot(before) : null,
    after: after ? buildFinancialSnapshot(after) : null,
    rolledBackAt: null,
  };
}

export function appendFinancialImportHistory(
  history: FinancialImportHistoryEntry[],
  entry: FinancialImportHistoryEntry,
  limit = 20
) {
  return [entry, ...history.filter((item) => item.id !== entry.id)].slice(0, Math.max(1, limit));
}

export function buildFinancialImportRollback(
  entry: FinancialImportHistoryEntry
): FinancialImportRollback {
  if (entry.status !== "applied" || !entry.before || !entry.after) {
    return {
      allowed: false,
      actions: [],
      confirmation: "Rollback is available only for an applied import with before-and-after snapshots.",
    };
  }
  const plan = buildFinancialUndoPlan({ before: entry.before, after: entry.after });
  return {
    allowed: plan.canRestore,
    actions: plan.actions,
    confirmation: plan.canRestore
      ? `Review ${plan.actions.length} rollback action${plan.actions.length === 1 ? "" : "s"} before changing saved financial data.`
      : "This import produced no changes to roll back.",
  };
}

export function markFinancialImportRolledBack(
  entry: FinancialImportHistoryEntry,
  rolledBackAt: string
): FinancialImportHistoryEntry {
  if (entry.status !== "applied") {
    throw new Error("Only an applied import can be marked rolled back.");
  }
  return { ...entry, status: "rolled_back", rolledBackAt };
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
