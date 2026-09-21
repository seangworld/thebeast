import { socialOwner, socialJson } from "@/lib/server/social/auth";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { loadLiveSeangworldProviders } from "@/lib/server/seangworldGoogleProviders";
import { getSeangworldAnalyticsScope } from "@/lib/seangworldAnalyticsScope";
import { socialTrafficEvidence } from "@/lib/marketingSocialTraffic";
import { ownedDestination, type SocialPost } from "@/lib/marketingSocial";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET() {
  const owner = await socialOwner();
  if (!owner) return socialJson({ error: "Owner access required." }, 403);
  const result = await createBeastFusionPublicationClient().from("beast_marketing_social_posts").select("id,channel,content").eq("owner_id", owner.id).in("status", ["published", "shared_manually"]).order("created_at", { ascending: false }).limit(100);
  if (result.error) return socialJson({ error: "Posts unavailable." }, 503);
  const posts = result.data as SocialPost[];
  const scope = (post: SocialPost) => {
    const hostname = ownedDestination(post.content.destination)?.hostname;
    return hostname === "thebeast.seangworld.com" ? "thebeast" : hostname === "news.seangworld.com" ? "seangworldnews" : hostname === "changetheworld.seangworld.com" ? "change-the-world" : "seangworld";
  };
  const scopes = Array.from(new Set(posts.map(scope)));
  const now = new Date();
  const providers = await Promise.all(scopes.map(async key => {
    try {
      const data = await loadLiveSeangworldProviders(process.env, now, (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(12_000) }), undefined, 7, getSeangworldAnalyticsScope(key));
      return { key, provider: data?.find(p => p.id === "ga4") };
    } catch { return { key, provider: undefined }; }
  }));
  return socialJson({ evidence: posts.map(post => socialTrafficEvidence(post, providers.find(p => p.key === scope(post))?.provider, now.getTime())) });
}
