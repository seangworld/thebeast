import { randomBytes, createHash } from "node:crypto";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { socialOwner, socialJson, socialConfiguration, SOCIAL_CALLBACK, stateHash } from "@/lib/server/social/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const owner = await socialOwner(request);
  if (!owner) return socialJson({ error: "Owner access required." }, 403);
  const body = await request.json().catch(() => null);
  const provider: unknown = body?.provider;
  if (provider !== "meta" && provider !== "x") return socialJson({ error: "Choose Meta or X." }, 400);
  if (!socialConfiguration()[provider]) return socialJson({ error: `${provider === "meta" ? "Meta" : "X"} app setup is needed before you can connect. Manual sharing is available now.` }, 409);
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const service = createBeastFusionPublicationClient();
  await service.from("beast_marketing_social_oauth").delete().lt("expires_at", new Date().toISOString());
  const saved = await service.from("beast_marketing_social_oauth").insert({ state_hash: stateHash(state), owner_id: owner.id, provider, verifier, expires_at: new Date(Date.now() + 600_000).toISOString() });
  if (saved.error) return socialJson({ error: "Could not start account connection." }, 503);
  const url = new URL(provider === "meta" ? `https://www.facebook.com/${process.env.META_GRAPH_VERSION}/dialog/oauth` : "https://x.com/i/oauth2/authorize");
  url.search = new URLSearchParams({ client_id: (provider === "meta" ? process.env.META_APP_ID : process.env.X_CLIENT_ID)!, redirect_uri: SOCIAL_CALLBACK, response_type: "code", state, scope: provider === "meta" ? "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish" : "tweet.read tweet.write users.read offline.access", ...(provider === "x" ? { code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" } : {}) }).toString();
  const response = socialJson({ url: url.toString() });
  response.cookies.set("beast_social_state", state, { secure: true, httpOnly: true, sameSite: "lax", path: "/api/admin/beast-marketing/social", maxAge: 600 });
  return response;
}
