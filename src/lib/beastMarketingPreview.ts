export const marketingPlacementProfiles = [
  {
    id: "meta_feed",
    platform: "Meta",
    placement: "Feed",
    headlineLimit: 40,
    primaryTextLimit: 125,
    descriptionLimit: 30,
    aspectRatio: "1.91:1 or 1:1",
    devices: ["mobile", "desktop"] as const,
  },
  {
    id: "instagram_story_reel",
    platform: "Instagram",
    placement: "Story / Reel",
    headlineLimit: 40,
    primaryTextLimit: 125,
    descriptionLimit: 0,
    aspectRatio: "9:16",
    devices: ["mobile"] as const,
  },
  {
    id: "x_post",
    platform: "X",
    placement: "Post",
    headlineLimit: 0,
    primaryTextLimit: 280,
    descriptionLimit: 0,
    aspectRatio: "16:9 or 1:1",
    devices: ["mobile", "desktop"] as const,
  },
  {
    id: "linkedin_feed",
    platform: "LinkedIn",
    placement: "Feed",
    headlineLimit: 70,
    primaryTextLimit: 600,
    descriptionLimit: 100,
    aspectRatio: "1.91:1 or 1:1",
    devices: ["mobile", "desktop"] as const,
  },
  {
    id: "google_search",
    platform: "Google",
    placement: "Search",
    headlineLimit: 30,
    primaryTextLimit: 0,
    descriptionLimit: 90,
    aspectRatio: "No media",
    devices: ["mobile", "desktop"] as const,
  },
  {
    id: "general_display",
    platform: "General display",
    placement: "Display",
    headlineLimit: 40,
    primaryTextLimit: 90,
    descriptionLimit: 90,
    aspectRatio: "16:9, 1:1, or 4:5",
    devices: ["mobile", "desktop"] as const,
  },
] as const;

export type MarketingPlacementProfile = (typeof marketingPlacementProfiles)[number];
export type MarketingPlacementId = MarketingPlacementProfile["id"];
export type MarketingMediaType = "none" | "image" | "video";
export type MarketingAdStatus = "draft" | "review" | "approved" | "rejected" | "archived";
export type MarketingDistributionStatus = "draft" | "ready" | "exported" | "cancelled";

export type MarketingAdRevision = {
  campaignId: string;
  placementProfileId: MarketingPlacementId;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  destinationUrl: string;
  mediaUrl: string | null;
  mediaType: MarketingMediaType;
  mediaAltText: string;
  sourceFacts: { label: string; url: string | null; observedAt: string | null; limitation: string | null }[];
  limitations: string[];
};

export type MarketingAdVariant = MarketingAdRevision & {
  id: string;
  platform: string;
  placement: string;
  revision: number;
  revisionHash: string;
  status: MarketingAdStatus;
  approvedRevision: number | null;
  approvedRevisionHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingDistributionPlan = {
  id: string;
  campaignId: string;
  variantId: string;
  variantRevision: number;
  variantRevisionHash: string;
  platform: string;
  placement: string;
  plannedFor: string;
  timezone: string;
  status: MarketingDistributionStatus;
  ownerNotes: string;
  exportedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function clean(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function getMarketingPlacementProfile(value: unknown): MarketingPlacementProfile | null {
  return marketingPlacementProfiles.find((profile) => profile.id === value) || null;
}

export function isMarketingMediaType(value: unknown): value is MarketingMediaType {
  return ["none", "image", "video"].includes(String(value));
}

export function isMarketingDistributionStatus(value: unknown): value is MarketingDistributionStatus {
  return ["draft", "ready", "exported", "cancelled"].includes(String(value));
}

export function normalizeMarketingAdRevision(value: unknown): MarketingAdRevision | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const profile = getMarketingPlacementProfile(record.placementProfileId);
  const campaignId = clean(record.campaignId, 80);
  const callToAction = clean(record.callToAction, 80);
  const destinationUrl = clean(record.destinationUrl, 1_000);
  const mediaType = isMarketingMediaType(record.mediaType) ? record.mediaType : "none";
  const mediaCandidate = clean(record.mediaUrl, 1_000);
  const mediaUrl = mediaCandidate && /^https:\/\//i.test(mediaCandidate) ? mediaCandidate : null;
  const sourceFacts = Array.isArray(record.sourceFacts) ? record.sourceFacts.slice(0, 30).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const fact = item as Record<string, unknown>;
    const label = clean(fact.label, 240);
    if (!label) return [];
    const urlCandidate = clean(fact.url, 1_000);
    return [{
      label,
      url: /^https:\/\//i.test(urlCandidate) ? urlCandidate : null,
      observedAt: clean(fact.observedAt, 80) || null,
      limitation: clean(fact.limitation, 500) || null,
    }];
  }) : [];
  if (!profile || !campaignId || !callToAction || !/^https:\/\//i.test(destinationUrl) || !sourceFacts.length) return null;
  if (mediaType !== "none" && !mediaUrl) return null;
  return {
    campaignId,
    placementProfileId: profile.id,
    headline: clean(record.headline, 500),
    primaryText: clean(record.primaryText, 5_000),
    description: clean(record.description, 1_000),
    callToAction,
    destinationUrl,
    mediaUrl,
    mediaType,
    mediaAltText: clean(record.mediaAltText, 500),
    sourceFacts,
    limitations: Array.isArray(record.limitations) ? record.limitations.map((item) => clean(item, 500)).filter(Boolean).slice(0, 20) : [],
  };
}

export function validateMarketingAdRevision(revision: MarketingAdRevision) {
  const profile = getMarketingPlacementProfile(revision.placementProfileId);
  if (!profile) return { errors: ["A supported placement profile is required."], warnings: [] };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!revision.primaryText && profile.primaryTextLimit > 0) errors.push("Primary copy is required for this placement.");
  if (!revision.headline && profile.headlineLimit > 0) errors.push("A headline is required for this placement.");
  if (!revision.description && profile.descriptionLimit > 0) errors.push("A description is required for this placement.");
  if (profile.headlineLimit && revision.headline.length > profile.headlineLimit) errors.push(`Headline exceeds the ${profile.headlineLimit}-character planning limit.`);
  if (profile.primaryTextLimit && revision.primaryText.length > profile.primaryTextLimit) errors.push(`Primary copy exceeds the ${profile.primaryTextLimit}-character planning limit.`);
  if (profile.descriptionLimit && revision.description.length > profile.descriptionLimit) errors.push(`Description exceeds the ${profile.descriptionLimit}-character planning limit.`);
  if (profile.id === "google_search" && revision.mediaType !== "none") errors.push("The Google Search planning profile does not use media.");
  if (profile.id !== "google_search" && revision.mediaType === "none") warnings.push("No image or video is attached; the visual preview will use a media placeholder.");
  if (revision.mediaType !== "none" && !revision.mediaAltText) warnings.push("Add media alt text before distribution handoff.");
  warnings.push(`Media aspect guidance: ${profile.aspectRatio}.`);
  warnings.push("This planning validation does not guarantee provider acceptance, delivery, or optimization.");
  return { errors, warnings };
}

function stable(value: MarketingAdRevision) {
  return JSON.stringify({
    campaignId: value.campaignId,
    placementProfileId: value.placementProfileId,
    headline: value.headline,
    primaryText: value.primaryText,
    description: value.description,
    callToAction: value.callToAction,
    destinationUrl: value.destinationUrl,
    mediaUrl: value.mediaUrl,
    mediaType: value.mediaType,
    mediaAltText: value.mediaAltText,
    sourceFacts: value.sourceFacts,
    limitations: value.limitations,
  });
}

export function fingerprintMarketingAdRevision(value: MarketingAdRevision) {
  let hash = 0x811c9dc5;
  const bytes = new TextEncoder().encode(stable(value));
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

export function buildMarketingDistributionPackage({
  campaign,
  variant,
  plan,
}: {
  campaign: { id: string; title: string; objective: string; audience: string; offer: string };
  variant: MarketingAdVariant;
  plan: MarketingDistributionPlan;
}) {
  const exactRevisionApproved = ["ready", "exported"].includes(plan.status)
    && variant.status === "approved"
    && variant.approvedRevision === variant.revision
    && variant.approvedRevisionHash === variant.revisionHash
    && plan.variantRevision === variant.revision
    && plan.variantRevisionHash === variant.revisionHash;
  if (!exactRevisionApproved) return null;
  return {
    schema: "beastmarketing.distribution-handoff.v1",
    generatedAt: new Date().toISOString(),
    externalActionPerformed: false,
    campaign,
    placement: { profileId: variant.placementProfileId, platform: variant.platform, placement: variant.placement },
    exactRevision: { variantId: variant.id, revision: variant.revision, revisionHash: variant.revisionHash, ownerApproved: true },
    creative: {
      headline: variant.headline,
      primaryText: variant.primaryText,
      description: variant.description,
      callToAction: variant.callToAction,
      destinationUrl: variant.destinationUrl,
      mediaUrl: variant.mediaUrl,
      mediaType: variant.mediaType,
      mediaAltText: variant.mediaAltText,
    },
    evidence: { sourceFacts: variant.sourceFacts, limitations: variant.limitations },
    internalPlan: { plannedFor: plan.plannedFor, timezone: plan.timezone, ownerNotes: plan.ownerNotes },
    providerState: { connected: false, scheduledExternally: false, published: false, paidMedia: false },
  };
}
