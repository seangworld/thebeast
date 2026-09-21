import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { socialOwner, SOCIAL_ORIGIN, SOCIAL_PATH, SOCIAL_CALLBACK, stateHash, seal } from "@/lib/server/social/auth";
import { metaRequest, metaUrl, providerJson, xToken } from "@/lib/server/social/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const finish = (status: string) => {
    const response = NextResponse.redirect(`${SOCIAL_ORIGIN}${SOCIAL_PATH}?connection=${status}`);
    response.cookies.delete({ name: "beast_social_state", path: "/api/admin/beast-marketing/social" });
    return response;
  };
  const owner = await socialOwner();
  if (!owner) return finish("sign_in_required");
  const params = new URL(request.url).searchParams;
  const state = params.get("state") || "";
  const cookie = (await cookies()).get("beast_social_state")?.value;
  if (!cookie || cookie !== state || !/^[\w-]{43}$/.test(state)) return finish("failed");
  const service = createBeastFusionPublicationClient();
  // Delete-returning is a single-use, owner-bound state claim.
  const claim = await service.from("beast_marketing_social_oauth").delete().eq("state_hash", stateHash(state)).eq("owner_id", owner.id).gt("expires_at", new Date().toISOString()).select("provider,verifier").maybeSingle();
  if (claim.error || !claim.data || !params.get("code") || params.has("error")) return finish("failed");
  try {
    const rows: Record<string, unknown>[] = [];
    if (claim.data.provider === "x") {
      const token = await xToken({ grant_type: "authorization_code", code: params.get("code")!, redirect_uri: SOCIAL_CALLBACK, code_verifier: claim.data.verifier });
      const user = await providerJson("https://api.x.com/2/users/me", { headers: { Authorization: `Bearer ${token.access_token}` } });
      if (!/^\d+$/.test(user.data?.id || "")) throw new Error("account_missing");
      rows.push({ owner_id: owner.id, channel: "x", account_id: user.data.id, label: `@${String(user.data.username).slice(0,100)}`, credentials: seal(token, owner.id), disconnected_at: null, expires_at: new Date(Date.now() + (token.expires_in || 7200) * 1000).toISOString(), connected_at: new Date().toISOString() });
    } else {
      const token = await providerJson(`${metaUrl("oauth/access_token")}?${new URLSearchParams({ client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET!, redirect_uri: SOCIAL_CALLBACK, code: params.get("code")! })}`);
      if (!token.access_token) throw new Error("token_missing");
      const long = await providerJson(`${metaUrl("oauth/access_token")}?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET!, fb_exchange_token: token.access_token })}`);
      if (!long.access_token) throw new Error("token_missing");
      const pages = await metaRequest("me/accounts", long.access_token, { fields: "id,name,access_token,tasks,instagram_business_account{id,username}", limit: "100" });
      if (pages.paging?.next) throw new Error("account_list_incomplete");
      for (const page of pages.data || []) {
        if (!/^\d+$/.test(page.id || "") || !page.access_token || !page.tasks?.some((task: string) => ["CREATE_CONTENT", "MANAGE"].includes(task))) continue;
        const common = { disconnected_at: null, owner_id: owner.id, credentials: seal({ access_token: page.access_token }, owner.id), connected_at: new Date().toISOString(), expires_at: long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null };
        rows.push({ ...common, channel: "facebook_page", account_id: page.id, label: String(page.name).slice(0,160) });
        if (/^\d+$/.test(page.instagram_business_account?.id || "")) rows.push({ ...common, channel: "instagram", account_id: page.instagram_business_account.id, label: page.instagram_business_account.username ? `@${page.instagram_business_account.username}` : `${page.name} Instagram` });
      }
    }
    if (!rows.length) return finish("no_accounts");
    const saved = await service.from("beast_marketing_social_connections").upsert(rows, { onConflict: "owner_id,channel,account_id" });
    if (saved.error) throw new Error("save_failed");
    return finish("connected");
  } catch { return finish("failed"); }
}
