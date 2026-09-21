import { createHmac } from "node:crypto";
import { socialPostText, type SocialPost } from "@/lib/marketingSocial";

export class ProviderFailure extends Error {
  constructor(message: string, public uncertain = false) { super(message); }
}
// Never expose provider bodies: they may contain credentials or user information.
export async function providerJson(url: string, init: RequestInit = {}) {
  let response: Response;
  try { response = await fetch(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000) }); }
  catch { throw new ProviderFailure("The provider response is unknown. Inspect the account before trying again.", true); }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.error) throw new ProviderFailure(response.status === 401 || response.status === 403 ? "Account access was refused. Reconnect and check publishing permissions." : response.status === 429 ? "The platform rate limit was reached. Review before retrying." : "The platform rejected the request. Check account access and media requirements.", response.status >= 500);
  if (!body) throw new ProviderFailure("The provider response could not be verified.", true);
  return body;
}
export function metaUrl(path: string) {
  const version = process.env.META_GRAPH_VERSION;
  if (!/^v\d+\.0$/.test(version || "")) throw new Error("Meta API version is not configured.");
  if (!/^[a-zA-Z0-9_/?=,&.%+-]+$/.test(path)) throw new Error("Invalid Meta resource.");
  return `https://graph.facebook.com/${version}/${path}`;
}
export async function metaRequest(path: string, token: string, params: Record<string, string> = {}, write = false) {
  const proof = createHmac("sha256", process.env.META_APP_SECRET || "").update(token).digest("hex");
  const query = new URLSearchParams({ ...params, appsecret_proof: proof });
  return providerJson(`${metaUrl(path)}${write ? "" : `?${query}`}`, { method: write ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(write ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) }, ...(write ? { body: query } : {}) });
}
export async function xToken(body: Record<string, string>) {
  const token = await providerJson("https://api.x.com/2/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64")}` }, body: new URLSearchParams(body) });
  if (typeof token.access_token !== "string") throw new ProviderFailure("X did not return an access token.");
  return token as { access_token: string; refresh_token?: string; expires_in?: number };
}
export async function createSocialPublication(post: SocialPost, accountId: string, token: string) {
  if (!/^\d+$/.test(accountId)) throw new Error("Invalid account identifier.");
  const content = post.content;
  const text = socialPostText(content, post.channel, post.id);
  if (post.channel === "x") {
    const result = await providerJson("https://api.x.com/2/tweets", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!/^\d+$/.test(result.data?.id || "")) throw new ProviderFailure("X publication could not be confirmed.", true);
    return { postId: result.data.id as string };
  }
  if (post.channel === "facebook_page") {
    const path = content.mediaType === "image" ? "photos" : content.mediaType === "video" ? "videos" : "feed";
    const params: Record<string, string> = content.mediaType === "image" ? { url: content.mediaUrl, caption: text } : content.mediaType === "video" ? { file_url: content.mediaUrl, description: text } : { message: text };
    const result = await metaRequest(`${accountId}/${path}`, token, params, true);
    const id = result.post_id || result.id;
    if (typeof id !== "string" || !/^[\d_]+$/.test(id)) throw new ProviderFailure("Facebook publication could not be confirmed.", true);
    return { postId: id };
  }
  if (post.channel === "instagram") {
    const params: Record<string, string> = { caption: text, ...(content.mediaType === "video" ? { media_type: "REELS", video_url: content.mediaUrl, share_to_feed: "true" } : { image_url: content.mediaUrl }) };
    const result = await metaRequest(`${accountId}/media`, token, params, true);
    if (!/^\d+$/.test(result.id || "")) throw new ProviderFailure("Instagram media preparation could not be confirmed.", true);
    return { containerId: result.id as string };
  }
  throw new Error("Personal Facebook requires manual sharing.");
}
