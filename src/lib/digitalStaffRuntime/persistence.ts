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

function jsonFields(proposal: StructuredKnowledgeProposal) {
  return { ...proposal.fields, sourceMessageId: proposal.sourceMessageId, confidence: proposal.confidence, proposalId: proposal.id };
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
  const normalized = { ...proposal, fields: { ...proposal.fields, ...(editedFields || {}) } };
  if (normalized.approvalStatus !== "proposed") throw new Error("Only a pending proposal can be approved.");
  if (normalized.sourceMessageId.trim() === "") throw new Error("Proposal provenance is required.");
  if (normalized.proposedAction === "none") throw new Error("This proposal does not authorize a record write.");

  if (professionalId === "beasthealth.health-advisor") {
    const title = stringField(normalized, "name", "title", "condition", "institution", "provider") || normalized.entityType;
    const type = /supplement|medication/i.test(normalized.entityType) ? "medication" : /measurement|vital/i.test(normalized.entityType) ? "vital" : /family/i.test(normalized.entityType) ? "family_history" : /allerg/i.test(normalized.entityType) ? "profile" : normalized.entityType;
    const allowedTypes = ["profile", "condition", "medication", "procedure", "vital", "document", "lifestyle", "family_history", "provider"];
    if (!allowedTypes.includes(type)) throw new Error("Health proposal type is outside the canonical record contract.");
    const result = await client.from("beast_health_records").insert({ owner_id: ownerId, record_type: type, title, status: "active", occurred_on: null, source: "Health Advisor conversation", details: { ...jsonFields(normalized), subtype: normalized.entityType, provenance: "digital_staff_runtime", conversation_message_id: normalized.sourceMessageId }, notes: null }).select("id").single();
    if (result.error || !result.data) throw new Error("The approved Health record could not be saved.");
    return { proposalId: normalized.id, status: "approved", recordId: String(result.data.id), table: "beast_health_records" };
  }

  if (professionalId === "beasteducation.guidance-counselor") {
    const label = stringField(normalized, "institution", "employer", "certificate", "title", "preference", "name") || normalized.entityType;
    const categoryMap: Record<string, string> = {
      institution: "school", school: "school", degree: "degree", certification: "certification", license: "license",
      coursework: "coursework", employment: "employment", employer: "employer_type", role: "role", skill: "skill",
      strength: "strength", interest: "interest", schedule: "schedule", budget: "budget", family: "family",
      geography: "geography", constraint: "constraint", career_goal: "career_goal", education_goal: "education_goal",
      goal: "education_goal", preference: "other",
    };
    const category = categoryMap[normalized.entityType.toLowerCase()] || "other";
    const value = JSON.stringify(jsonFields(normalized));
    const result = await client.from("education_career_profile_items").insert({ owner_id: ownerId, phase: "past", category, label, value, source_type: "conversation", source_reference: normalized.sourceMessageId, verification_status: "member_reported", confidence: normalized.confidence, details: { entityType: normalized.entityType, provenance: "digital_staff_runtime", proposalId: normalized.id }, updated_at: new Date().toISOString() }).select("id").single();
    if (result.error || !result.data) throw new Error("The approved Education/Career record could not be saved.");
    return { proposalId: normalized.id, status: "approved", recordId: String(result.data.id), table: "education_career_profile_items" };
  }

  if (professionalId === "beastmoney.money-coach" && (normalized.domain === "money" || normalized.domain === "goal" || normalized.domain === "preference")) {
    const title = stringField(normalized, "priority", "goal", "title", "value") || "Financial priority";
    const existing = await client.from("beast_goals").select("id").eq("owner_id", ownerId).eq("category", "Money").eq("status", "Active").limit(1).maybeSingle();
    const values = { title, category: "Money", status: "Active", summary: JSON.stringify(jsonFields(normalized)), current_step: "Review the current debt plan", source_module: "BeastMoney", source_type: "professional", source_label: "Money Coach", source_reference: normalized.sourceMessageId, linked_professional: "beastmoney.money-coach", updated_at: new Date().toISOString() };
    const result = existing.data?.id
      ? await client.from("beast_goals").update(values).eq("id", existing.data.id).eq("owner_id", ownerId).select("id").single()
      : await client.from("beast_goals").insert({ owner_id: ownerId, ...values }).select("id").single();
    if (result.error || !result.data) throw new Error("The approved financial priority could not be saved.");
    return { proposalId: normalized.id, status: "approved", recordId: String(result.data.id), table: "beast_goals" };
  }

  throw new Error("This professional cannot persist the proposed record type.");
}
