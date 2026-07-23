import {
  buildImportDuplicateKey,
  buildMoneyImportMappingFromTemplate,
  buildMoneyImportPreview,
  moneyImportTemplates,
  parseMoneyCsv,
  suggestMoneyImportTemplate,
  type MoneyImportPreview,
  type MoneyImportTarget,
} from "./financialImport";

export type SmartImportFinding = {
  id: string;
  kind: "recurring-bill" | "income" | "debt" | "mortgage" | "duplicate";
  title: string;
  detail: string;
  confidence: "high" | "moderate";
};

export type SmartFinancialImportAnalysis = {
  source: string;
  target: MoneyImportTarget;
  preview: MoneyImportPreview;
  findings: SmartImportFinding[];
  summary: string[];
};

export function analyzeSmartFinancialImport(input: {
  csv: string;
  source: string;
  target?: MoneyImportTarget;
  existingDuplicateKeys?: string[];
}): SmartFinancialImportAnalysis {
  const parsed = parseMoneyCsv(input.csv);
  const suggested = suggestMoneyImportTemplate({ headers: parsed.headers, target: input.target });
  const template = suggested?.template || moneyImportTemplates.find((item) => item.target === (input.target || "transaction"))!;
  const mapping = suggested?.mapping || buildMoneyImportMappingFromTemplate({ headers: parsed.headers, template });
  const preview = buildMoneyImportPreview({ csv: input.csv, mapping, existingDuplicateKeys: input.existingDuplicateKeys });
  const findings: SmartImportFinding[] = [];

  if (preview.target === "bill") {
    findings.push({ id: "bills", kind: "recurring-bill", title: `I found ${preview.validRows.length} recurring bill${preview.validRows.length === 1 ? "" : "s"}.`, detail: "These rows have the required bill fields and are ready for confirmation.", confidence: "high" });
  }
  if (preview.target === "debt") {
    findings.push({ id: "debts", kind: "debt", title: `I found ${preview.validRows.length} debt${preview.validRows.length === 1 ? "" : "s"}.`, detail: "Balances and optional payment terms came from the mapped loan export.", confidence: "high" });
  }
  if (preview.target === "income") {
    findings.push({ id: "income", kind: "income", title: `I found ${preview.validRows.length} income source${preview.validRows.length === 1 ? "" : "s"}.`, detail: "Amounts and schedules came from the mapped income rows.", confidence: "high" });
  }

  const mortgage = preview.rows.find((row) => /\b(mortgage|home loan)\b/i.test(String(row.values.name || row.values.description || "")));
  if (mortgage) findings.push({ id: "mortgage", kind: "mortgage", title: "I believe this is your mortgage.", detail: String(mortgage.values.name || mortgage.values.description), confidence: "moderate" });
  if (preview.duplicateRows.length) findings.push({ id: "duplicates", kind: "duplicate", title: `I noticed ${preview.duplicateRows.length} duplicate payment${preview.duplicateRows.length === 1 ? "" : "s"}.`, detail: "Duplicates are excluded from the confirmed import.", confidence: "high" });

  return {
    source: input.source,
    target: preview.target,
    preview,
    findings,
    summary: [
      `${preview.validRows.length} record${preview.validRows.length === 1 ? "" : "s"} ready to confirm`,
      `${preview.invalidRows.length} need review`,
      `${preview.duplicateRows.length} duplicate${preview.duplicateRows.length === 1 ? "" : "s"} excluded`,
    ],
  };
}

export function smartImportExistingKey(target: MoneyImportTarget, values: Record<string, string | number>) {
  return buildImportDuplicateKey(target, values);
}
