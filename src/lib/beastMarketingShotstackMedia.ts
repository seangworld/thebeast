/**
 * Validate media URLs returned by Shotstack's Create and Ingest services.
 * Keep this policy narrow so arbitrary AWS buckets cannot become trusted
 * narration or transcription sources.
 */
const shotstackCreateBucket = /^shotstack-create-api-(?:v1|stage)-assets\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com$/i;
const shotstackIngestBucket = /^shotstack-ingest-api-(?:v1|stage)-sources\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com$/i;

export function isTrustedShotstackMediaUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  let parsed: URL;
  try { parsed = new URL(value.trim()); } catch { return false; }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || parsed.hash) return false;
  const hostname = parsed.hostname.toLowerCase();
  if (hostname.endsWith(".shotstack.io") && hostname !== "shotstack.io") return true;
  return shotstackCreateBucket.test(hostname) || shotstackIngestBucket.test(hostname);
}

export function trustedShotstackMediaUrl(value: unknown) {
  return isTrustedShotstackMediaUrl(value) ? value.trim() : null;
}
