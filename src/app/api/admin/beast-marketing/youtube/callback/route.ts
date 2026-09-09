import { NextRequest, NextResponse } from "next/server";
import { YOUTUBE_CALLBACK, YOUTUBE_COOKIE_PATH, YOUTUBE_SCOPES, verifySeangworldChannel, youtubeToken } from "@/lib/server/directYouTube";
import { encryptGoogleRefreshToken, validOAuthState } from "@/lib/server/googleOAuth";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { youtubeOwner } from "../owner";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  let result = "failed";
  try {
    const owner = await youtubeOwner();
    const state = request.nextUrl.searchParams.get("state") || "";
    const code = request.nextUrl.searchParams.get("code") || "";
    const expected = request.cookies.get("beast_youtube_state")?.value || "";
    const verifier = request.cookies.get("beast_youtube_verifier")?.value || "";
    if (!owner || !state || !code || !verifier || !validOAuthState(expected, `${owner.user.id}:${state}`)) throw new Error("youtube_invalid_state");
    const token = await youtubeToken({ code, code_verifier: verifier, redirect_uri: YOUTUBE_CALLBACK, grant_type: "authorization_code" }, process.env);
    const scopes = token.scope?.split(/\s+/) || [];
    if (!token.refresh_token || !YOUTUBE_SCOPES.every((scope) => scopes.includes(scope))) throw new Error("youtube_consent_incomplete");
    const channel = await verifySeangworldChannel(token.access_token);
    const saved = await createBeastFusionPublicationClient().from("beast_marketing_youtube_connections").upsert({ owner_id: owner.user.id, channel_id: channel.id, channel_title: channel.title, channel_handle: channel.handle, scopes, ...encryptGoogleRefreshToken(token.refresh_token, process.env), connected_at: new Date().toISOString() });
    if (saved.error) throw new Error("youtube_save_failed");
    result = "connected";
  } catch { /* Do not return provider responses, authorization codes or tokens. */ }
  const response = NextResponse.redirect(`https://thebeast.seangworld.com/dashboard/admin/marketing/video-growth?youtube=${result}`);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  for (const name of ["beast_youtube_state", "beast_youtube_verifier"]) response.cookies.set(name, "", { httpOnly: true, secure: true, sameSite: "lax", path: YOUTUBE_COOKIE_PATH, maxAge: 0 });
  return response;
}
