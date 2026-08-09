import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfessionalId, StructuredKnowledgeProposal } from "./types";

type ProposalWriteResult = { proposalId: string; status: "approved"; recordId: string; table: string };

function stringField(proposal: StructuredKnowledgeProposal, ...keys: string[]) {
  for (const key of keys) {
    const value = proposal.fields[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function normalizedProposalFields(proposal: StructuredKnowledgeProposal) {
  const fields = proposal.fields;
  return {
    ...fields,
    medicationName: fields.medicationName ?? fields.medication_name,
    supplementName: fields.supplementName ?? fields.supplement_name,
    procedureName: fields.procedureName ?? fields.procedure_name,
    providerName: fields.providerName ?? fields.provider_name,
    measurementName: fields.measurementName ?? fields.measurement_name,
    vaccinationName: fields.vaccinationName ?? fields.vaccination_name,
  };
}

function jsonFields(proposal: StructuredKnowledgeProposal) {
  const reconciliation = (proposal as StructuredKnowledgeProposal & { reconciliation?: unknown }).reconciliation;
  return { ...proposal.fields, sourceMessageId: proposal.sourceMessageId, confidence: proposal.confidence, proposalId: proposal.id, ...(reconciliation ? { reconciliation } : {}) };
}

export async function applyApprovedKnowledgeProposal({
  client,
  ownerId,
  professionalId,
  proposal,
  editedFields,
}: {
  client: SupabaseClient;
  ownerId: string;
  professionalId: ProfessionalId;
  proposal: StructuredKnowledgeProposal;
  editedFields?: Record<string, string | number | boolean | null>;
}): Promise<ProposalWriteResult> {
  const normalized = { ...proposal, fields: { ...normalizedProposalFields(proposal), ...(editedFields || {}) } };
  if (normalized.approvalStatus !== "proposed") throw new Error("Only a pending proposal can be approved.");
  if (normalized.sourceMessageId.trim() === "") throw new Error("Proposal provenance is required.");
  if (normalized.proposedAction === "none") throw new Error("This proposal does not authorize a record write.");

  const targetProfessional = professionalId === "beastfusion.fusion-director"
    ? normalized.domain === "health"
      ? "beasthealth.health-advisor"
      : ["education", "military", "employment"].includes(normalized.domain)
        ? "beasteducation.guidance-counselor"
        : normalized.domain === "money"
          ? "beastmoney.money-coach"
          : professionalId
    : professionalId;

  if (targetProfessional === "beasthealth.health-advisor") {
    const title = stringField(normalized, "medicationName", "medication_name", "supplementName", "supplement_name", "condition", "procedureName", "procedure_name", "providerName", "provider_name", "allergy", "measurementName", "measurement_name", "vaccinationName", "vaccination_name", "relationship", "name", "title", "institution", "provider") || normalized.entityType;
    const type = /supplement|medication/i.test(normalized.entityType) ? "medication" : /measurement|vital/i.test(normalized.entityType) ? "vital" : /family/i.test(normalized.entityType) ? "family_history" : /allerg|vaccin|appointment/i.test(normalized.entityType) ? "profile" : /surgery|procedure/i.test(normalized.entityType) ? "procedure" : /specialist|provider/i.test(normalized.entityType) ? "provider" : /diagnos|condition/i.test(normalized.entityType) ? "condition" : normalized.entityType;
    const allowedTypes = ["profile", "condition", "medication", "procedure", "vital", "document", "lifestyle", "family_history", "provider"];
    if (!allowedTypes.includes(type)) throw new Error("Health proposal type is outside the canonical record contract.");
    const existingProposal = normalized.proposedAction === "create"
      ? await client.from("beast_health_records").select("id").eq("owner_id", ownerId).eq("details->>proposalId", normalized.id).limit(1).maybeSingle()
      : { data: null, error: null };
    if (existingProposal.data?.id) return { proposalId: normalized.id, status: "approved", recordId: String(existingProposal.data.id), table: "beast_health_records" };
    const values = { record_type: type, title, details: { ...jsonFields(normalized), subtype: normalized.entityType, provenance: "digital_staff_runtime", conversation_message_id: normalized.sourceMessageId }, updated_at: new Date().toISOString() };
    const result = normalized.proposedAction === "update" && normalized.relatedRecordId
      ? await client.from("beast_health_records").update(values).eq("id", normalized.relatedRecordId).eq("owner_id", ownerId).select("id").single()
      : await client.from("beast_health_records").insert({ owner_id: ownerId, ...values, status: (normalized as typeof normalized & { reconciliation?: { currentStatus?: string } }).reconciliation?.currentStatus === "current" ? "active" : "historical", occurred_on: null, source: "Health Advisor conversation", notes: null }).select("id").single();
    if (result.error || !result.data) throw new Error("The approved Health record could not be saved.");
    return { proposalId: normalized.id, status: "approved", recordId: String(result.data.id), table: "beast_health_records" };
  }

  if (targetProfessional === "beasteducation.guidance-counselor") {
    const label = stringField(normalized, "institution", "schoolName", "employer", "certificationName", "credentialName", "certificate", "branch", "role", "skill", "constraint", "goal", "title", "preference", "name") || normalized.entityType;
    const categoryMap: Record<string, string> = {
      institution: "school", school: "school", degree: "degree", diploma: "degree", credit: "coursework", certification: "certification", license: "license",
      coursework: "coursework", training: "training", military_education: "training", military_service: "military", employment: "employment", job: "employment", employer: "employer_type", role: "role", target_role: "occupation", skill: "skill",
      strength: "strength", interest: "interest", schedule: "schedule", budget: "budget", family: "family",
      geography: "geography", constraint: "constraint", career_goal: "career_goal", education_goal: "education_goal",
      goal: "education_goal", preference: "other", education_preference: "other", career_preference: "other", decision: "outcome", rejected_path: "outcome", outcome: "outcome",
    };
    const category = categoryMap[normalized.entityType.toLowerCase()] || "other";
    const existingProposal = normalized.proposedAction === "create"
      ? await client.from("education_career_profile_items").select("id").eq("owner_id", ownerId).eq("details->>proposalId", normalized.id).limit(1).maybeSingle()
      : { data: null, error: null };
    if (existingProposal.data?.id) return { proposalId: normalized.id, status: "approved", recordId: String(existingProposal.data.id), table: "education_career_profile_items" };
    const value = JSON.stringify(jsonFields(normalized));
    const values = { category, label, value, verification_status: "member_reported", confidence: normalized.confidence, details: { entityType: normalized.entityType, provenance: "digital_staff_runtime", proposalId: normalized.id }, updated_at: new Date().toISOString() };
    const result = normalized.proposedAction === "update" && normalized.relatedRecordId
      ? await client.from("education_career_profile_items").update(values).eq("id", normalized.relatedRecordId).eq("owner_id", ownerId).select("id").single()
      : await client.from("education_career_profile_items").insert({ owner_id: ownerId, ...values, phase: "past", source_type: "conversation", source_reference: normalized.sourceMessageId }).select("id").single();
    if (result.error || !result.data) throw new Error("The approved Education/Career record could not be saved.");
    return { proposalId: normalized.id, status: "approved", recordId: String(result.data.id), table: "education_career_profile_items" };
  }

  if (targetProfessional === "beastmoney.money-coach" && (normalized.domain === "money" || normalized.domain === "goal" || normalized.domain === "preference")) {
    const title = stringField(normalized, "priority", "goal", "title", "value") || "Financial priority";
    const existing = normalized.relatedRecordId
      ? { data: { id: normalized.relatedRecordId } }
      : await client.from("beast_goals").select("id").eq("owner_id", ownerId).eq("category", "Money").eq("status", "Active").limit(1).maybeSingle();
    const values = { title, category: "Money", status: "Active", summary: JSON.stringify(jsonFields(normalized)), current_step: "Review the current debt plan", source_module: "BeastMoney", source_type: "professional", source_label: "Money Coach", source_reference: normalized.sourceMessageId, linked_professional: "beastmoney.money-coach", updated_at: new Date().toISOString() };
    const result = existing.data?.id
      ? await client.from("beast_goals").update(values).eq("id", existing.data.id).eq("owner_id", ownerId).select("id").single()
      : await client.from("beast_goals").insert({ owner_id: ownerId, ...values }).select("id").single();
    if (result.error || !result.data) throw new Error("The approved financial priority could not be saved.");
    return { proposalId: normalized.id, status: "approved", recordId: String(result.data.id), table: "beast_goals" };
  }

  if (professionalId === "beastfusion.fusion-director" && (normalized.domain === "goal" || normalized.domain === "preference")) {
    const title = stringField(normalized, "priority", "goal", "preference", "title", "value") || "Whole-member priority";
    const values = { title, category: "Personal", status: "Active", summary: JSON.stringify(jsonFields(normalized)), current_step: "Review this reconciled priority", source_module: "BeastOS", source_type: "professional", source_label: "Avery Stone", source_reference: normalized.sourceMessageId, linked_professional: professionalId, updated_at: new Date().toISOString() };
    const result = normalized.proposedAction === "update" && normalized.relatedRecordId
      ? await client.from("beast_goals").update(values).eq("id", normalized.relatedRecordId).eq("owner_id", ownerId).select("id").single()
      : await client.from("beast_goals").insert({ owner_id: ownerId, ...values }).select("id").single();
    if (result.error || !result.data) throw new Error("The approved whole-member priority could not be saved.");
    return { proposalId: normalized.id, status: "approved", recordId: String(result.data.id), table: "beast_goals" };
  }

  throw new Error("This professional cannot persist the proposed record type.");
}
