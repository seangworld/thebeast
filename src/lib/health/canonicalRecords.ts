import type { SupabaseClient } from "@supabase/supabase-js";
import { preferStructuredCanonicalRecords } from "../canonicalKnowledgePresentation";
import { normalizeHealthRecord, type HealthRecord, type HealthRecordRow } from "./foundation";

export function presentCanonicalHealthRecords(records: readonly HealthRecord[]) {
  return preferStructuredCanonicalRecords(records, {
    category: (record) => record.recordType,
    value: (record) => record.details,
    isLegacyAggregate: (record) =>
      (record.source === "Health Advisor conversation" || record.source === "Member-reported Health Advisor conversation") &&
      typeof record.details.context === "string" &&
      Boolean(record.details.context.trim()),
  });
}

/** The owner-scoped canonical loader shared by Health record and Health Advisor workspaces. */
export async function loadCanonicalMemberHealthRecords(client: SupabaseClient, ownerId: string) {
  const { data, error } = await client
    .from("beast_health_records")
    .select("id, owner_id, record_type, title, status, occurred_on, source, details, notes, created_at, updated_at")
    .eq("owner_id", ownerId)
    .order("occurred_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const normalized = ((data || []) as HealthRecordRow[])
    .map(normalizeHealthRecord)
    .filter((record): record is HealthRecord => Boolean(record));
  return presentCanonicalHealthRecords(normalized);
}
