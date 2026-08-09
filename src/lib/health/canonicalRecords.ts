import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeHealthRecord, type HealthRecord, type HealthRecordRow } from "./foundation";
import { isStructuredCanonicalValue } from "../canonicalKnowledgePresentation";

const legacyTopics = new Set([
  "health-conditions-needed", "health-medications-needed", "health-allergies-needed",
  "health-procedures-needed", "health-care-team-needed", "health-family-history-needed",
]);

export function legacyHealthAggregateState(record: HealthRecord) {
  const isLegacySource = record.source === "Health Advisor conversation" || record.source === "Member-reported Health Advisor conversation";
  const topic = typeof record.details.topic === "string" ? record.details.topic : "";
  if (!isLegacySource || !legacyTopics.has(topic) || isStructuredCanonicalValue(record.details)) return null;
  const context = typeof record.details.context === "string" && record.details.context.trim();
  return { recoverable: Boolean(context), topic } as const;
}

export function presentCanonicalHealthRecords(records: readonly HealthRecord[]) {
  const structuredCounts = new Map<string, number>();
  for (const record of records) {
    if (record.status !== "archived" && isStructuredCanonicalValue(record.details)) structuredCounts.set(record.recordType, (structuredCounts.get(record.recordType) || 0) + 1);
  }
  return records.filter((record) => {
    const legacy = (record.source === "Health Advisor conversation" || record.source === "Member-reported Health Advisor conversation") && typeof record.details.context === "string" && Boolean(record.details.context.trim()) && !isStructuredCanonicalValue(record.details);
    if (!legacy) return true;
    const context = String(record.details.context);
    const estimatedEntities = context.split(/\s*(?:,|;|\band\b|&)\s*/i).map((item) => item.trim()).filter(Boolean).length;
    return (structuredCounts.get(record.recordType) || 0) < Math.max(1, estimatedEntities);
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
