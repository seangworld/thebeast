export type MoneyImportTarget = "transaction" | "debt" | "bill" | "income";

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

export type MoneyImportMapping = {
  target: MoneyImportTarget;
  fields: Record<string, string>;
};

export type MoneyImportTemplate = {
  id: string;
  name: string;
  target: MoneyImportTarget;
  headerAliases: Record<string, string[]>;
};

export type MoneyImportMappingIssueCode =
  | "missing_header"
  | "duplicate_header"
  | "missing_required_mapping"
  | "missing_source_header"
  | "duplicate_source_mapping"
  | "unsupported_target_field";

export type MoneyImportMappingIssue = {
  code: MoneyImportMappingIssueCode;
  message: string;
  targetField?: string;
  sourceHeader?: string;
};

export type MoneyImportPreviewRow = {
  rowIndex: number;
  sourceRowNumber: number;
  target: MoneyImportTarget;
  values: Record<string, string | number>;
  duplicateKey: string;
  duplicate: boolean;
  duplicateSource: "existing" | "file" | null;
  errors: string[];
};

export type MoneyImportPreview = {
  target: MoneyImportTarget;
  headers: string[];
  mappingIssues: MoneyImportMappingIssue[];
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

const supportedFields: Record<MoneyImportTarget, string[]> = {
  transaction: ["date", "description", "amount", "category"],
  debt: ["name", "balance", "minimum_payment", "interest_rate"],
  bill: ["name", "amount", "due_date", "frequency"],
  income: ["name", "amount", "frequency", "next_date"],
};

export const moneyImportTemplates: MoneyImportTemplate[] = [
  {
    id: "bank-transactions",
    name: "Bank transactions",
    target: "transaction",
    headerAliases: {
      date: ["Date", "Posted Date", "Transaction Date"],
      description: ["Description", "Memo", "Name", "Transaction"],
      amount: ["Amount", "Transaction Amount"],
      category: ["Category", "Type"],
    },
  },
  {
    id: "credit-card-transactions",
    name: "Credit card transactions",
    target: "transaction",
    headerAliases: {
      date: ["Transaction Date", "Date", "Posted Date"],
      description: ["Description", "Merchant", "Memo"],
      amount: ["Amount", "Charge Amount"],
      category: ["Category"],
    },
  },
  {
    id: "debt-balances",
    name: "Debt balances",
    target: "debt",
    headerAliases: {
      name: ["Name", "Account", "Creditor"],
      balance: ["Balance", "Current Balance"],
      minimum_payment: ["Minimum Payment", "Minimum", "Min Payment"],
      interest_rate: ["Interest Rate", "APR", "Rate"],
    },
  },
  {
    id: "bill-list",
    name: "Bills",
    target: "bill",
    headerAliases: {
      name: ["Name", "Bill", "Payee"],
      amount: ["Amount", "Payment", "Bill Amount"],
      due_date: ["Due Date", "Due Day"],
      frequency: ["Frequency", "Cadence"],
    },
  },
  {
    id: "income-list",
    name: "Income",
    target: "income",
    headerAliases: {
      name: ["Name", "Income", "Source", "Employer"],
      amount: ["Amount", "Net Amount", "Income Amount"],
      frequency: ["Frequency", "Cadence"],
      next_date: ["Next Date", "Pay Date"],
    },
  },
];

function fieldLabel(field: string) {
  return field.replace(/_/g, " ");
}

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

export function validateMoneyImportMapping({
  headers,
  mapping,
}: {
  headers: string[];
  mapping: MoneyImportMapping;
}): MoneyImportMappingIssue[] {
  const issues: MoneyImportMappingIssue[] = [];
  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  const duplicateHeaders = headers.filter(
    (header, index) => normalizedHeaders.indexOf(header.toLowerCase()) !== index
  );

  if (headers.length === 0) {
    issues.push({
      code: "missing_header",
      message: "Add a CSV header row before previewing this import.",
    });
  }

  for (const header of Array.from(new Set(duplicateHeaders))) {
    issues.push({
      code: "duplicate_header",
      sourceHeader: header,
      message: `CSV column "${header}" appears more than once. Rename duplicate columns before importing.`,
    });
  }

  for (const requiredField of requiredFields[mapping.target]) {
    if (!mapping.fields[requiredField]?.trim()) {
      issues.push({
        code: "missing_required_mapping",
        targetField: requiredField,
        message: `Map the required ${fieldLabel(requiredField)} field to a CSV column.`,
      });
    }
  }

  const mappedHeaders = new Map<string, string[]>();
  for (const [targetField, sourceHeaderValue] of Object.entries(mapping.fields)) {
    const sourceHeader = sourceHeaderValue.trim();
    if (!supportedFields[mapping.target].includes(targetField)) {
      issues.push({
        code: "unsupported_target_field",
        targetField,
        sourceHeader,
        message: `${fieldLabel(targetField)} is not supported for ${mapping.target} imports.`,
      });
    }
    if (!sourceHeader) continue;

    const matchedHeader = headers.find(
      (header) => header.toLowerCase() === sourceHeader.toLowerCase()
    );
    if (!matchedHeader) {
      issues.push({
        code: "missing_source_header",
        targetField,
        sourceHeader,
        message: `The mapped CSV column "${sourceHeader}" for ${fieldLabel(targetField)} was not found.`,
      });
      continue;
    }

    const normalized = matchedHeader.toLowerCase();
    mappedHeaders.set(normalized, [...(mappedHeaders.get(normalized) || []), targetField]);
  }

  for (const [normalizedHeader, targetFields] of Array.from(mappedHeaders)) {
    if (targetFields.length < 2) continue;
    const sourceHeader = headers.find((header) => header.toLowerCase() === normalizedHeader) || normalizedHeader;
    issues.push({
      code: "duplicate_source_mapping",
      sourceHeader,
      message: `CSV column "${sourceHeader}" is mapped to multiple fields (${targetFields.map(fieldLabel).join(", ")}). Choose one destination per column.`,
    });
  }

  return issues;
}

export function buildMoneyImportMappingFromTemplate({
  headers,
  template,
}: {
  headers: string[];
  template: MoneyImportTemplate;
}): MoneyImportMapping {
  const normalizedHeaders = new Map(headers.map((header) => [header.toLowerCase(), header]));
  const fields = Object.entries(template.headerAliases).reduce<Record<string, string>>(
    (mapping, [targetField, aliases]) => {
      const sourceHeader = aliases
        .map((alias) => normalizedHeaders.get(alias.toLowerCase()))
        .find(Boolean);
      if (sourceHeader) mapping[targetField] = sourceHeader;
      return mapping;
    },
    {}
  );
  return { target: template.target, fields };
}

export function suggestMoneyImportTemplate({
  headers,
  target,
}: {
  headers: string[];
  target?: MoneyImportTarget;
}) {
  return moneyImportTemplates
    .filter((template) => !target || template.target === target)
    .map((template) => {
      const mapping = buildMoneyImportMappingFromTemplate({ headers, template });
      const requiredMatches = requiredFields[template.target].filter(
        (field) => mapping.fields[field]
      ).length;
      const totalMatches = Object.keys(mapping.fields).length;
      return { template, mapping, requiredMatches, totalMatches };
    })
    .filter(({ requiredMatches }) => requiredMatches > 0)
    .sort(
      (left, right) =>
        right.requiredMatches - left.requiredMatches ||
        right.totalMatches - left.totalMatches ||
        left.template.name.localeCompare(right.template.name)
    )[0] || null;
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
  const normalizedText = (value: string | number | undefined) =>
    String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const normalizedMoney = (value: string | number | undefined) => {
    const numeric = typeof value === "number" ? value : numberField(String(value ?? ""));
    return Number.isFinite(numeric) ? numeric.toFixed(2) : normalizedText(value);
  };
  if (target === "transaction") {
    return [
      normalizedText(values.date),
      normalizedText(values.description),
      normalizedMoney(values.amount),
    ].join("|");
  }

  return [
    target,
    normalizedText(values.name),
    normalizedMoney(values.amount ?? values.balance),
  ].join("|");
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
  const mappingIssues = validateMoneyImportMapping({ headers: parsed.headers, mapping });
  const existing = new Set(existingDuplicateKeys.map((key) => key.toLowerCase()));
  const seen = new Set<string>();
  const rows = parsed.rows.map((row, index) => {
    const values = Object.entries(mapping.fields).reduce<Record<string, string | number>>(
      (mapped, [targetField, sourceHeader]) => {
        const raw = row[sourceHeader] || "";
        mapped[targetField] =
          ["amount", "balance", "minimum_payment", "interest_rate"].includes(targetField)
            ? raw.trim()
              ? numberField(raw)
              : ""
            : raw;
        return mapped;
      },
      {}
    );
    const sourceRowNumber = index + 2;
    const errors = requiredFields[mapping.target].flatMap((field) => {
      if (values[field] === "" || values[field] == null) {
        return [`Row ${sourceRowNumber}: ${fieldLabel(field)} is required.`];
      }
      if (
        ["amount", "balance"].includes(field) &&
        !Number.isFinite(Number(values[field]))
      ) {
        return [`Row ${sourceRowNumber}: ${fieldLabel(field)} must be a valid number.`];
      }
      return [];
    });
    const duplicateKey = buildImportDuplicateKey(mapping.target, values);
    const duplicateSource = existing.has(duplicateKey)
      ? "existing" as const
      : seen.has(duplicateKey)
        ? "file" as const
        : null;
    const duplicate = duplicateSource !== null;
    seen.add(duplicateKey);

    return {
      rowIndex: index + 1,
      sourceRowNumber,
      target: mapping.target,
      values,
      duplicateKey,
      duplicate,
      duplicateSource,
      errors,
    };
  });

  return {
    target: mapping.target,
    headers: parsed.headers,
    mappingIssues,
    rows,
    validRows: rows.filter((row) => row.errors.length === 0 && !row.duplicate),
    invalidRows: rows.filter((row) => row.errors.length > 0),
    duplicateRows: rows.filter((row) => row.duplicate),
    readyToSave:
      mappingIssues.length === 0 &&
      rows.some((row) => row.errors.length === 0 && !row.duplicate) &&
      rows.every((row) => row.errors.length === 0),
  };
}
