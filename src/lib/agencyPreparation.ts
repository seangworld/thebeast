/** Private read model. No publishing, provider calls, credentials, or invented metrics. */
export const agencyChannels = ["instagram", "facebook_page", "x"] as const;
export type AgencyChannel = typeof agencyChannels[number];
export type AgencyProfile = { id: string; owner_id: string; name: string; presenter_type: string; active: boolean; allowed_topics: string[]; provenance: Record<string, unknown> };
export type AgencyConnection = { id: string; owner_id: string; channel: string; account_id: string; label: string; connected_at: string; expires_at: string | null; disconnected_at: string | null };
export type AgencyBinding = { owner_id: string; presenter_profile_id: string; connection_id: string; channel: string };
export type AgencyConnectionState = "not_connected" | "connected_unverified" | "expired" | "unavailable" | "binding_conflict";

export function isAvailableAgencyConnection(connection: AgencyConnection, now: string) {
  const instant = Date.parse(now);
  return Number.isFinite(instant) && agencyChannels.includes(connection.channel as AgencyChannel)
    && Boolean(connection.account_id?.trim()) && !connection.disconnected_at
    && Number.isFinite(Date.parse(connection.connected_at)) && Date.parse(connection.connected_at) <= instant
    && (connection.expires_at === null || (Number.isFinite(Date.parse(connection.expires_at)) && Date.parse(connection.expires_at) > instant));
}

export function buildAgencySnapshot(input: { ownerId: string; profiles: AgencyProfile[]; connections: AgencyConnection[]; bindings: AgencyBinding[]; now: string }) {
  if (!input.ownerId || !Number.isFinite(Date.parse(input.now))) throw new Error("Owner and valid snapshot time required.");
  const profiles = input.profiles.filter(p => p.owner_id === input.ownerId && p.presenter_type === "future_character");
  const connections = input.connections.filter(c => c.owner_id === input.ownerId);
  const bindings = input.bindings.filter(b => b.owner_id === input.ownerId);
  return {
    generatedAt: input.now,
    mode: "preparation_only" as const,
    agencyAutomaticPublishingEnabled: false as const,
    agencyDmResponsesEnabled: false as const,
    agencyAdditionalSpendingAuthorizedUsd: 0 as const,
    availableConnections: connections.filter(c => isAvailableAgencyConnection(c, input.now)
      && !bindings.some(b => b.connection_id === c.id)).map(c => ({ id: c.id, channel: c.channel, label: c.label })),
    creators: profiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      focus: profile.allowed_topics.join(" · "),
      identityApproved: profile.provenance?.identityApproval === true,
      assetsBound: profile.provenance?.assetsBound === true,
      platforms: agencyChannels.map(channel => {
        const selected = bindings.filter(b => b.presenter_profile_id === profile.id && b.channel === channel);
        let state: AgencyConnectionState = "not_connected";
        let label: string | null = null;
        if (selected.length > 1) state = "binding_conflict";
        else if (selected.length === 1) {
          const binding = selected[0];
          const matches = connections.filter(c => c.id === binding.connection_id && c.channel === channel);
          const reused = bindings.filter(b => b.connection_id === binding.connection_id).length !== 1;
          if (reused || matches.length > 1) state = "binding_conflict";
          else {
            const connection = matches[0];
            if (!connection || connection.disconnected_at || !connection.account_id?.trim() || !Number.isFinite(Date.parse(connection.connected_at)) || Date.parse(connection.connected_at) > Date.parse(input.now)) state = "unavailable";
            else if (connection.expires_at !== null && (!Number.isFinite(Date.parse(connection.expires_at)) || Date.parse(connection.expires_at) <= Date.parse(input.now))) state = "expired";
            else { state = "connected_unverified"; label = connection.label; }
          }
        }
        return { channel, state, label, reportingVerified: false as const, monetizationEligibility: "not_verified" as const };
      }),
      // An account connection is not a metrics integration. Missing values never become zero.
      metrics: { followers: null, growth30Days: null, reach: null, engagementRate: null, posts: null, revenueUsd: null, operatingCostUsd: null },
    })),
  };
}
