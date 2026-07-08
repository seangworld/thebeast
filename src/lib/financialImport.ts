export type MoneyImportTarget = "transaction" | "debt" | "bill" | "income";

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

export type MoneyImportMapping = {
  target: MoneyImportTarget;
  fields: Record<string, string>;
};

export type MoneyImportPreviewRow = {
  rowIndex: number;
  target: MoneyImportTarget;
  values: Record<string, string | number>;
  duplicateKey: string;
  duplicate: boolean;
  errors: string[];
};

export type MoneyImportPreview = {
  target: MoneyImportTarget;
  rows: MoneyImportPreviewRow[];
  validRows: MoneyImportPreviewRow[];
  invalidRows: MoneyImportPreviewRow[];
  duplicateRows: MoneyImportPreviewRow[];
  readyToSave: boolean;
};

const requiredFields: Record<MoneyImportTarget, string[]> = {
  transaction: ["date", "description", "amount"],
  debt: ["name", "balance"],
  bill: ["name", "amount"],
  income: ["name", "amount"],
};

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

export function parseMoneyCsv(csv: string): CsvParseResult {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headers = lines[0] ? splitCsvLine(lines[0]) : [];
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });

  return { headers, rows };
}

function numberField(value: string) {
  if (!value.trim()) return Number.NaN;
  const normalized = value.replace(/[$,]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function buildImportDuplicateKey(
  target: MoneyImportTarget,
  values: Record<string, string | number>
) {
  if (target === "transaction") {
    return [
      values.date || "",
      values.description || "",
      values.amount || "",
    ].join("|").toLowerCase();
  }

  return [
    target,
    values.name || "",
    values.amount || values.balance || "",
  ].join("|").toLowerCase();
}

export function buildMoneyImportPreview({
  csv,
  mapping,
  existingDuplicateKeys = [],
}: {
  csv: string;
  mapping: MoneyImportMapping;
  existingDuplicateKeys?: string[];
}): MoneyImportPreview {
  const parsed = parseMoneyCsv(csv);
  const existing = new Set(existingDuplicateKeys.map((key) => key.toLowerCase()));
  const seen = new Set<string>();
  const rows = parsed.rows.map((row, index) => {
    const values = Object.entries(mapping.fields).reduce<Record<string, string | number>>(
      (mapped, [targetField, sourceHeader]) => {
        const raw = row[sourceHeader] || "";
        mapped[targetField] =
          ["amount", "balance", "minimum_payment", "interest_rate"].includes(targetField)
            ? numberField(raw)
            : raw;
        return mapped;
      },
      {}
    );
    const errors = requiredFields[mapping.target].flatMap((field) => {
      if (values[field] === "" || values[field] == null) {
        return [`Missing ${field}.`];
      }
      if (
        ["amount", "balance"].includes(field) &&
        !Number.isFinite(Number(values[field]))
      ) {
        return [`Invalid ${field}.`];
      }
      return [];
    });
    const duplicateKey = buildImportDuplicateKey(mapping.target, values);
    const duplicate = existing.has(duplicateKey) || seen.has(duplicateKey);
    seen.add(duplicateKey);

    return {
      rowIndex: index + 1,
      target: mapping.target,
      values,
      duplicateKey,
      duplicate,
      errors,
    };
  });

  return {
    target: mapping.target,
    rows,
    validRows: rows.filter((row) => row.errors.length === 0 && !row.duplicate),
    invalidRows: rows.filter((row) => row.errors.length > 0),
    duplicateRows: rows.filter((row) => row.duplicate),
    readyToSave: rows.length > 0 && rows.every((row) => row.errors.length === 0),
  };
}
