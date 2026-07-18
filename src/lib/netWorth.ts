export type NetWorthEntryKind = "asset" | "liability";

export type NetWorthCategory = {
  id: string;
  label: string;
  kind: NetWorthEntryKind;
  sortOrder: number;
};

export type NetWorthEntry = {
  id: string;
  categoryId: string;
  kind: NetWorthEntryKind;
  name: string;
};

export type NetWorthHistoryRecord = {
  id: string;
  entryId: string;
  recordedOn: string;
  value: number;
};

export type NetWorthTrendPoint = {
  recordedOn: string;
  assetTotal: number;
  liabilityTotal: number;
  netWorth: number;
  change: number | null;
  direction: "up" | "down" | "unchanged" | "first";
};

export type NetWorthModel = {
  categories: NetWorthCategory[];
  entries: NetWorthEntry[];
  history: NetWorthHistoryRecord[];
  trend: NetWorthTrendPoint[];
  current: NetWorthTrendPoint | null;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
  return DATE_ONLY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function duplicateIds(values: Array<{ id: string }>) {
  const seen = new Set<string>();
  return values.flatMap(({ id }) => {
    if (seen.has(id)) return [id];
    seen.add(id);
    return [];
  });
}

export function validateNetWorthModel({
  categories,
  entries,
  history,
}: Pick<NetWorthModel, "categories" | "entries" | "history">): string[] {
  const errors: string[] = [];
  const categoryIds = new Set(categories.map(({ id }) => id));
  const entryIds = new Set(entries.map(({ id }) => id));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  for (const id of duplicateIds(categories)) errors.push(`Duplicate net-worth category id: ${id}.`);
  for (const id of duplicateIds(entries)) errors.push(`Duplicate net-worth entry id: ${id}.`);
  for (const id of duplicateIds(history)) errors.push(`Duplicate net-worth history id: ${id}.`);

  for (const category of categories) {
    if (!category.id.trim() || !category.label.trim()) errors.push("Net-worth categories require an id and label.");
    if (!Number.isInteger(category.sortOrder) || category.sortOrder < 0) {
      errors.push(`Net-worth category ${category.id} requires a non-negative integer sort order.`);
    }
  }

  for (const entry of entries) {
    if (!entry.id.trim() || !entry.name.trim()) errors.push("Net-worth entries require an id and name.");
    if (!categoryIds.has(entry.categoryId)) errors.push(`Net-worth entry ${entry.id} references missing category ${entry.categoryId}.`);
    const category = categoriesById.get(entry.categoryId);
    if (category && category.kind !== entry.kind) {
      errors.push(`Net-worth entry ${entry.id} kind ${entry.kind} does not match category ${category.id} kind ${category.kind}.`);
    }
  }

  for (const record of history) {
    if (!entryIds.has(record.entryId)) errors.push(`Net-worth history ${record.id} references missing entry ${record.entryId}.`);
    if (!validDate(record.recordedOn)) errors.push(`Net-worth history ${record.id} has invalid date ${record.recordedOn}.`);
    if (!Number.isFinite(record.value) || record.value < 0) errors.push(`Net-worth history ${record.id} requires a non-negative finite value.`);
  }

  return errors;
}

function latestValuesOnDate(entries: NetWorthEntry[], history: NetWorthHistoryRecord[], recordedOn: string) {
  const values = new Map<string, number>();
  for (const entry of entries) {
    const latest = history
      .filter((record) => record.entryId === entry.id && record.recordedOn <= recordedOn)
      .sort((left, right) => left.recordedOn.localeCompare(right.recordedOn) || left.id.localeCompare(right.id))
      .at(-1);
    if (latest) values.set(entry.id, latest.value);
  }
  return values;
}

export function buildNetWorthModel({
  categories,
  entries,
  history,
}: Pick<NetWorthModel, "categories" | "entries" | "history">): NetWorthModel {
  const errors = validateNetWorthModel({ categories, entries, history });
  if (errors.length) throw new Error(errors.join(" "));

  const orderedCategories = categories.slice().sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const orderedEntries = entries.slice().sort((left, right) => {
    const leftCategory = orderedCategories.findIndex(({ id }) => id === left.categoryId);
    const rightCategory = orderedCategories.findIndex(({ id }) => id === right.categoryId);
    return leftCategory - rightCategory || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
  });
  const orderedHistory = history.slice().sort((left, right) => left.recordedOn.localeCompare(right.recordedOn) || left.id.localeCompare(right.id));
  const dates = Array.from(new Set(orderedHistory.map(({ recordedOn }) => recordedOn)));
  const trend: NetWorthTrendPoint[] = [];

  for (const recordedOn of dates) {
    const values = latestValuesOnDate(orderedEntries, orderedHistory, recordedOn);
    const assetTotal = orderedEntries
      .filter(({ kind }) => kind === "asset")
      .reduce((total, entry) => total + (values.get(entry.id) ?? 0), 0);
    const liabilityTotal = orderedEntries
      .filter(({ kind }) => kind === "liability")
      .reduce((total, entry) => total + (values.get(entry.id) ?? 0), 0);
    const netWorth = assetTotal - liabilityTotal;
    const previous = trend.at(-1);
    const change = previous ? netWorth - previous.netWorth : null;
    trend.push({
      recordedOn,
      assetTotal,
      liabilityTotal,
      netWorth,
      change,
      direction: change === null ? "first" : change > 0 ? "up" : change < 0 ? "down" : "unchanged",
    });
  }

  return {
    categories: orderedCategories,
    entries: orderedEntries,
    history: orderedHistory,
    trend,
    current: trend.at(-1) ?? null,
  };
}
