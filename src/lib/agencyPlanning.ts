import { agencyChannels, type AgencyChannel } from "./agencyPreparation";
import { isUuid } from "./marketingSocial";

/** Internal planning only. A ready item is never an executable publishing job. */
export const agencyPlanningAuthority = {
  mode: "review_only",
  publishingAuthorized: false,
  renderingAuthorized: false,
  spendingAuthorized: false,
} as const;

export type AgencyWorkstreamRequest = {
  action: "link";
  presenterProfileId: string;
  campaignId: string;
  videoSeriesId: string | null;
};
export type AgencyPlanRequest = {
  action: "plan";
  presenterProfileId: string;
  workstreamId: string;
  variantId: string;
  revision: number;
  revisionHash: string;
  channel: AgencyChannel;
  connectionId: string | null;
  plannedFor: string;
  timezone: string;
  ownerNotes: string;
};

export function normalizeAgencyPlanningRequest(value: unknown): AgencyWorkstreamRequest | AgencyPlanRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (!isUuid(input.presenterProfileId)) return null;
  if (input.action === "link") {
    if (!isUuid(input.campaignId) || (input.videoSeriesId != null && !isUuid(input.videoSeriesId))) return null;
    return { action: "link", presenterProfileId: input.presenterProfileId as string, campaignId: input.campaignId as string, videoSeriesId: input.videoSeriesId as string || null };
  }
  if (input.action !== "plan" || !isUuid(input.workstreamId) || !isUuid(input.variantId)
    || !Number.isSafeInteger(input.revision) || Number(input.revision) < 1 || Number(input.revision) > 2_147_483_647
    || typeof input.revisionHash !== "string" || !/^fnv1a32:[0-9a-f]{8}$/.test(input.revisionHash)
    || !agencyChannels.includes(input.channel as AgencyChannel)
    || (input.connectionId != null && !isUuid(input.connectionId))
    || typeof input.plannedFor !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(input.plannedFor)
    || !Number.isFinite(Date.parse(input.plannedFor))
    || typeof input.timezone !== "string" || input.timezone.length > 100 || !input.timezone.trim()
    || (input.ownerNotes != null && typeof input.ownerNotes !== "string")) return null;
  // Date.parse normalizes impossible dates and 24:00 into the following day.
  // Reject those inputs rather than silently moving the owner's calendar slot.
  const calendarDate = input.plannedFor.slice(0, 10);
  const midnight = new Date(`${calendarDate}T00:00:00.000Z`);
  if (!Number.isFinite(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== calendarDate
    || Number(input.plannedFor.slice(11, 13)) > 23 || Number(input.plannedFor.slice(14, 16)) > 59 || Number(input.plannedFor.slice(17, 19)) > 59) return null;
  const timezone = input.timezone.trim();
  if (/^[+-]/.test(timezone)) return null;
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }); } catch { return null; }
  const ownerNotes = String(input.ownerNotes || "").trim();
  if (ownerNotes.length > 2000) return null;
  return {
    action: "plan", presenterProfileId: input.presenterProfileId as string, workstreamId: input.workstreamId as string,
    variantId: input.variantId as string, revision: Number(input.revision), revisionHash: input.revisionHash,
    channel: input.channel as AgencyChannel, connectionId: input.connectionId as string || null,
    plannedFor: new Date(input.plannedFor).toISOString(), timezone, ownerNotes,
  };
}
