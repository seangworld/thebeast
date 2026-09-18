import { parseCanonicalFields } from "../canonicalKnowledgePresentation";

export type LifeWorkspaceRecord = {
  phase?: unknown;
  category?: unknown;
  value?: unknown;
  source_type?: unknown;
  verification_status?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function educationRecordState(
  workspace: "schools" | "certifications" | "scholarships",
  record: LifeWorkspaceRecord
) {
  const fields = parseCanonicalFields(record.value);
  const explicit = text(fields.status || fields.applicationStatus || fields.lifecycleStatus).replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const phase = text(record.phase);
  if (["proposed", "rejected"].includes(text(record.verification_status))) return "Needs review";
  const is = (...values: string[]) => values.includes(explicit);

  if (workspace === "schools") {
    if (is("current", "enrolled", "attending")) return "Current";
    if (is("previous", "graduated", "completed", "withdrawn")) return "Previous";
    if (is("suggested", "recommended", "considering", "planned", "applied", "pending")) return "Suggested";
    if (explicit) return "Needs review";
    if (text(record.source_type) === "research" || phase === "goal") return "Suggested";
    return phase === "present" ? "Current" : phase === "past" ? "Previous" : "Needs review";
  }
  if (workspace === "certifications") {
    if (is("expired", "lapsed")) return "Expired";
    if (is("active", "current", "valid")) return "Active";
    if (is("planned", "intended", "pursuing", "preparing", "in progress")) return "Planned";
    if (is("recommended", "suggested")) return "Recommended";
    if (explicit) return "Needs review";
    if (text(record.source_type) === "research") return "Recommended";
    return phase === "goal" ? "Planned" : "Needs review";
  }
  if (is("awarded", "award received", "funds received", "won")) return "Awarded";
  if (is("applied", "submitted", "application submitted", "application pending", "application under review")) return "Applied";
  if (is("not awarded", "denied", "declined", "rejected", "withdrawn")) return "Not awarded";
  if (is("recommended", "suggested")) return "Recommended";
  if (is("saved", "not applied", "not submitted", "considering")) return "Saved";
  if (explicit) return "Needs review";
  if (text(record.source_type) === "research") return "Recommended";
  return "Saved";
}

export const educationFundingStates = ["Saved", "Applied", "Awarded", "Not awarded", "Recommended", "Needs review"] as const;
export const educationCertificationStates = ["Active", "Expired", "Planned", "Recommended", "Needs review"] as const;

export function isCurrentEducationRecommendation(path: { status?: unknown }) {
  return ["candidate", "preferred"].includes(text(path.status));
}

export function educationFundingKind(record: LifeWorkspaceRecord) {
  const fields = parseCanonicalFields(record.value);
  const value = [fields.entityType, fields.type, fields.name, fields.title, fields.program, record.category]
    .map(text)
    .join(" ");
  if (/fafsa|federal student aid/.test(value)) return "FAFSA";
  if (/gi bill|veteran|vr&e|military/.test(value)) return "Veteran education benefit";
  if (/employer|tuition assistance|tuition reimbursement/.test(value)) return "Employer tuition assistance";
  if (/grant/.test(value)) return "Grant";
  if (/scholar/.test(value)) return "Scholarship";
  return "Other education funding";
}

export function isEducationFundingRecord(record: LifeWorkspaceRecord) {
  const fields = parseCanonicalFields(record.value);
  const value = [
    fields.entityType,
    fields.type,
    fields.name,
    fields.title,
    fields.program,
    fields.fundingSource,
    record.category,
    typeof record.value === "string" ? record.value : "",
  ]
    .map(text)
    .join(" ");
  return /scholar|grant|fafsa|student aid|gi bill|vr&e|veteran education|tuition assistance|tuition reimbursement|education funding/.test(value);
}

export const lifeWorkspaceIntroductions = {
  schools: {
    what: "Your complete place for schools you attend, schools from your past, and schools you may want to compare.",
    why: "Your history, credits, budget, and goals can change which school or program is a realistic fit.",
    doHere: "Review your schools, fill in missing facts, compare verified options, and ask your Guidance Counselor about tradeoffs.",
    next: "Choose the next fact to confirm or the next school decision to make—nothing here commits you to applying.",
  },
  certifications: {
    what: "Your complete place for certifications you hold, certifications that expired, and credentials you may pursue.",
    why: "Requirements, costs, renewal rules, and value can differ, so each credential should support a clear goal.",
    doHere: "Check your certification records, compare official requirements, and decide which next step belongs in your plan.",
    next: "Verify the current rules with the certification body before paying, registering, or renewing.",
  },
  scholarships: {
    what: "Your education-funding home for scholarships, grants, FAFSA, veteran benefits, employer help, applications, and awards.",
    why: "A clear funding picture helps you compare real out-of-pocket cost without treating possible aid as guaranteed money.",
    doHere: "Save credible options, track applications and deadlines, and separate possible funding from confirmed awards.",
    next: "Confirm eligibility and current terms with the official sponsor, school financial-aid office, employer, or government agency.",
  },
} as const;
