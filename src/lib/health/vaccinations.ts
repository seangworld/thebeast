import type { HealthRecord } from "./foundation";

export type VaccinationDraft = {
  name: string; administrationStatus: string; dose: string; receivedOn: string; dueOn: string;
  dueSource: string; provider: string; documentId: string; notes: string;
};
export const emptyVaccination = (): VaccinationDraft => ({ name: "", administrationStatus: "unknown", dose: "", receivedOn: "", dueOn: "", dueSource: "", provider: "", documentId: "", notes: "" });
export function isVaccination(record: HealthRecord) {
  return record.details.subtype === "vaccination" || record.details.extraction_category === "vaccination" || record.details.category === "vaccination" || Boolean(record.details.vaccinationName) || record.details.topic === "health-vaccination-status-needed";
}
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function vaccinationDraft(record: HealthRecord): VaccinationDraft {
  const field = (key: string) => typeof record.details[key] === "string" ? String(record.details[key]) : "";
  const receivedOn = field("receivedOn") || (record.details.extraction_category === "vaccination" ? "" : record.occurredOn || "");
  return { administrationStatus: field("administrationStatus") || (receivedOn ? "received" : "unknown"), name: field("vaccinationName") || (record.details.extraction_category === "vaccination" ? field("context") : "") || record.title, dose: field("dose"), receivedOn, dueOn: field("dueOn"), dueSource: field("dueSource"), provider: field("provider") || record.source || "", documentId: field("vaccination_document_id") || field("beast_document_id"), notes: record.notes || "" };
}
export function validateVaccination(draft: VaccinationDraft, today: string) {
  if (!["received", "planned", "unknown"].includes(draft.administrationStatus)) return "Choose whether the dose was received, planned, or unknown.";
  if (draft.receivedOn && draft.administrationStatus === "planned") return "A planned dose cannot have a date received.";
  if (!draft.name.trim() || draft.name.length > 160) return "Enter a vaccine name up to 160 characters.";
  if (Object.values(draft).some(value => value.length > 2000)) return "Keep each field under 2,000 characters.";
  if ([draft.receivedOn, draft.dueOn].some(value => value && !validDate(value))) return "Enter valid dates.";
  if (draft.receivedOn && draft.receivedOn > today) return "Date received cannot be in the future. Use the next-dose date for a planned vaccination.";
  if (draft.dueOn && !["provider", "document", "member"].includes(draft.dueSource)) return "Choose where the next-dose date came from.";
  if (draft.receivedOn && draft.dueOn && draft.dueOn <= draft.receivedOn) return "The next-dose date must be after the date received.";
  return null;
}
export function vaccinationDueLabel(dueOn: string, today: string) {
  if (!dueOn || !validDate(dueOn)) return "Next dose: unknown";
  if (dueOn < today) return `Past recorded due date: ${dueOn}`;
  if (dueOn === today) return "Recorded due date is today";
  const days = (Date.parse(`${dueOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  return days <= 30 ? `Due within 30 days: ${dueOn}` : `Next recorded due date: ${dueOn}`;
}
export function vaccinationValues(draft: VaccinationDraft, previous?: HealthRecord) {
  return { record_type: "procedure", title: draft.name.trim(), status: draft.receivedOn || draft.administrationStatus === "received" ? "historical" : draft.administrationStatus === "planned" ? "planned" : "active", occurred_on: draft.receivedOn || null, source: draft.provider.trim() || null, notes: draft.notes.trim() || null,
    details: { ...previous?.details, subtype: "vaccination", administrationStatus: draft.receivedOn ? "received" : draft.administrationStatus, vaccinationName: draft.name.trim(), dose: draft.dose.trim(), receivedOn: draft.receivedOn || null, dueOn: draft.dueOn || null, dueSource: draft.dueOn ? draft.dueSource : null, provider: draft.provider.trim(), vaccination_document_id: draft.documentId || null } };
}
