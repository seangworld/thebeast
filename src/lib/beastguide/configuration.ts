// Only the existing BeastOS account project may host this integration.
export const CANONICAL_BEAST_AUTH = "https://grpyzwvgqiwtxadfdtni.supabase.co";
export function beastGuideAvailable(env: {enabled?: string; authUrl?: string}) {
  return env.enabled === "true" && env.authUrl === CANONICAL_BEAST_AUTH;
}
