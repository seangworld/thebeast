import { createHash, randomBytes } from "node:crypto";
import { encryptGoogleRefreshToken } from "./googleOAuth";

export const YOUTUBE_CALLBACK = "https://thebeast.seangworld.com/api/admin/beast-marketing/youtube/callback";
export const YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/youtube.upload"];
export const YOUTUBE_COOKIE_PATH = "/api/admin/beast-marketing/youtube";
export const YOUTUBE_MAX_BYTES = 32 * 1024 * 1024;

export function youtubeConfiguration(env: NodeJS.ProcessEnv) {
  const missing = ["YOUTUBE_GOOGLE_CLIENT_ID", "YOUTUBE_GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY"].filter((key) => !env[key]?.trim());
  if (missing.length) return { configured: false as const, missing };
  try { encryptGoogleRefreshToken("configuration-check", env); }
  catch { return { configured: false as const, missing: ["GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY"] }; }
  return { configured: true as const, clientId: env.YOUTUBE_GOOGLE_CLIENT_ID!, clientSecret: env.YOUTUBE_GOOGLE_CLIENT_SECRET!, missing: [] };
}
export function youtubeAuthorization(ownerId: string, env: NodeJS.ProcessEnv) {
  const config = youtubeConfiguration(env);
  if (!config.configured) throw new Error("youtube_setup_required");
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: YOUTUBE_CALLBACK, response_type: "code", scope: YOUTUBE_SCOPES.join(" "), access_type: "offline", prompt: "consent", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  return { url: url.toString(), state: `${ownerId}:${state}`, verifier };
}
export async function youtubeToken(parameters: Record<string,string>, env: NodeJS.ProcessEnv, fetcher = fetch) {
  const config = youtubeConfiguration(env);
  if (!config.configured) throw new Error("youtube_setup_required");
  const response = await fetcher("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...parameters, client_id: config.clientId, client_secret: config.clientSecret }), signal: AbortSignal.timeout(12_000), cache: "no-store", redirect: "error" });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== "string" || !data.access_token) throw new Error("youtube_consent_failed");
  return data as { access_token: string; refresh_token?: string; scope?: string };
}
/** Bind the signed-in channel to the selected public handle, never a display name. */
export async function verifySeangworldChannel(token: string, fetcher = fetch) {
  async function read(filter: string) {
    const response = await fetcher(`https://www.googleapis.com/youtube/v3/channels?part=id,snippet&${filter}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12_000), cache: "no-store", redirect: "error" });
    const body = await response.json();
    if (!response.ok || body.nextPageToken || !Array.isArray(body.items) || body.items.length !== 1) throw new Error("youtube_channel_unavailable");
    const channel = body.items[0];
    if (!/^UC[A-Za-z0-9_-]{22}$/.test(channel?.id) || typeof channel.snippet?.title !== "string") throw new Error("youtube_channel_unavailable");
    return channel;
  }
  const [mine, selected] = await Promise.all([read("mine=true&maxResults=2"), read("forHandle=seangworld&maxResults=1")]);
  if (mine.id !== selected.id) throw new Error("youtube_wrong_channel");
  return { id: mine.id as string, title: mine.snippet.title.slice(0, 200) as string, handle: "@seangworld" };
}
export function privateYouTubeMetadata(title: unknown, description: unknown, madeForKids: unknown, containsSyntheticMedia: unknown) {
  if (typeof title !== "string" || !title.trim() || title.length > 100 || /[<>]/.test(title) || typeof description !== "string" || Buffer.byteLength(description, "utf8") > 5000 || /[<>]/.test(description) || typeof madeForKids !== "boolean" || typeof containsSyntheticMedia !== "boolean") throw new Error("youtube_metadata_invalid");
  return { snippet: { title: title.trim(), description }, status: { privacyStatus: "private", selfDeclaredMadeForKids: madeForKids, containsSyntheticMedia } };
}
export async function uploadPrivateYouTubeVideo(token: string, media: Blob, metadata: ReturnType<typeof privateYouTubeMetadata>, fetcher = fetch) {
  if (media.type !== "video/mp4" || media.size < 1 || media.size > YOUTUBE_MAX_BYTES || metadata.status.privacyStatus !== "private") throw new Error("youtube_media_invalid");
  // Never retry an ambiguous transfer automatically. The durable claim prevents duplicate uploads.
  const boundary = `beast_${randomBytes(24).toString("hex")}`;
  const payload = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`, media, `\r\n--${boundary}--\r\n`]);
  const response = await fetcher("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=id,status&notifySubscribers=false", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body: payload, signal: AbortSignal.timeout(30_000), redirect: "error", cache: "no-store" });
  const body = await response.json();
  if (!response.ok || !/^[A-Za-z0-9_-]{11}$/.test(body?.id) || body.status?.privacyStatus !== "private") throw new Error("youtube_upload_unconfirmed");
  return body.id as string;
}
