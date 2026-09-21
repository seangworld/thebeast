export const socialChannels = ["facebook_personal", "facebook_page", "x", "instagram"] as const;
export type SocialChannel = typeof socialChannels[number];
export const socialLabels: Record<SocialChannel, string> = {
  facebook_personal: "Personal Facebook", facebook_page: "BEAST Facebook Page", x: "X / Twitter", instagram: "Instagram",
};
export type SocialContent = { text: string; destination: string; mediaUrl: string; mediaType: "none" | "image" | "video"; campaignId: string };
export type SocialConnection = { id: string; channel: SocialChannel; account_id: string; label: string; connected_at: string; expires_at: string | null };
export type SocialPost = { id: string; channel: SocialChannel; connection_id: string | null; content: SocialContent; revision: number; status: "draft" | "scheduled" | "publishing" | "processing" | "published" | "unconfirmed" | "failed" | "cancelled" | "shared_manually"; scheduled_at: string | null; created_at: string; published_at: string | null; provider_post_id: string | null; last_error: string | null };
export const isSocialChannel = (v: unknown): v is SocialChannel => socialChannels.includes(v as SocialChannel);
export const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export function ownedDestination(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && ["seangworld.com", "www.seangworld.com", "thebeast.seangworld.com", "news.seangworld.com", "changetheworld.seangworld.com"].includes(url.hostname) ? url : null;
  } catch { return null; }
}

// Media is served from owned public assets or this project's dedicated social bucket.
// Provider fetches never receive private documents or arbitrary signed storage URLs.
export function allowedSocialMedia(value: string, supabaseUrl?: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) return false;
    if (["seangworld.com", "www.seangworld.com", "thebeast.seangworld.com"].includes(url.hostname)) return /^\/(images|marketing)\//.test(url.pathname);
    return !!supabaseUrl && url.origin === new URL(supabaseUrl).origin && url.pathname.startsWith("/storage/v1/object/public/beast-marketing-social/") && !/%2f|%5c|%2e/i.test(url.pathname);
  } catch { return false; }
}

export function trackedSocialUrl(content: SocialContent, channel: SocialChannel, postId: string) {
  const url = ownedDestination(content.destination);
  if (!url) return "";
  url.searchParams.set("utm_source", channel === "x" ? "x" : channel === "instagram" ? "instagram" : "facebook");
  url.searchParams.set("utm_medium", "organic_social");
  url.searchParams.set("utm_campaign", content.campaignId || postId);
  url.searchParams.set("utm_id", content.campaignId || postId);
  url.searchParams.set("utm_content", postId);
  return url.toString();
}
export function socialPostText(content: SocialContent, channel: SocialChannel, postId: string) {
  const link = trackedSocialUrl(content, channel, postId);
  return [content.text.trim(), link].filter(Boolean).join("\n\n");
}
export function validateSocialContent(input: unknown, channel: SocialChannel, supabaseUrl?: string): SocialContent {
  if (!input || typeof input !== "object") throw new Error("Enter post text.");
  const c = input as Record<string, unknown>;
  const string = (key: string) => typeof c[key] === "string" ? (c[key] as string).trim() : "";
  const content: SocialContent = { text: string("text"), destination: string("destination"), mediaUrl: string("mediaUrl"), mediaType: c.mediaType === "image" || c.mediaType === "video" ? c.mediaType : "none", campaignId: string("campaignId") };
  if (!content.text || content.text.length > (channel === "instagram" ? 1800 : channel === "x" ? 250 : 5000)) throw new Error(`Enter text within the ${channel === "instagram" ? "1,800" : channel === "x" ? "250" : "5,000"} character limit.`);
  if (content.destination && !ownedDestination(content.destination)) throw new Error("Use an HTTPS link to SEANGWORLD or BEAST.");
  if (content.campaignId && !isUuid(content.campaignId)) throw new Error("Select a saved campaign.");
  if (content.mediaType !== "none" && !allowedSocialMedia(content.mediaUrl, supabaseUrl)) throw new Error("Upload an image/video or use an owned public media URL.");
  if (content.mediaType === "none") content.mediaUrl = "";
  if (channel === "instagram" && content.mediaType === "none") throw new Error("Instagram needs an image or video.");
  return content;
}
export function validateDirectPost(content: SocialContent, channel: SocialChannel) {
  if (channel === "instagram" && content.mediaType === "image" && !/\.jpe?g$/i.test(new URL(content.mediaUrl).pathname)) throw new Error("Direct Instagram image posts need JPEG. Upload a JPEG or share this image manually.");
  if (channel === "facebook_personal") throw new Error("Personal Facebook uses manual sharing.");
  // X's composer supports manual attachment; direct upload is intentionally not faked.
  if (channel === "x" && content.mediaType !== "none") throw new Error("Use Open X to attach this media manually. Direct X publishing supports text and links.");
  // Conservative weighted limit: ASCII and Latin-1 count one, other characters count two.
  if (channel === "x") {
    const weight = Array.from(content.text.normalize("NFC")).reduce((n, c) => n + (c.codePointAt(0)! <= 0x10ff ? 1 : 2), 0);
    if (weight + (content.destination ? 25 : 0) > 280) throw new Error("Shorten the X post; links and some characters count toward its 280-character limit.");
  }
}
export function socialShareUrl(post: Pick<SocialPost, "id" | "channel" | "content">) {
  if (post.channel === "x") return `https://twitter.com/intent/tweet?${new URLSearchParams({ text: socialPostText(post.content, post.channel, post.id) })}`;
  const link = trackedSocialUrl(post.content, post.channel, post.id);
  if (post.channel === "facebook_personal" || post.channel === "facebook_page") return link ? `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: link })}` : "https://www.facebook.com/";
  return "https://www.instagram.com/";
}
