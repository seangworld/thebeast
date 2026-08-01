import { NextRequest, NextResponse } from "next/server";
import {
  discoverAdSenseAccount,
  exchangeGoogleAuthorizationCode,
  GOOGLE_ADSENSE_SCOPE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  getGoogleOAuthConnection,
  saveGoogleOAuthConnection,
  validOAuthState,
} from "@/lib/server/googleOAuth";
import { requireGoogleOAuthOwner } from "../owner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function destination(request: NextRequest, result: "connected" | "failed") {
  return new URL(`/dashboard/admin/ads?google=${result}`, request.url);
}

export async function GET(request: NextRequest) {
  const owner = await requireGoogleOAuthOwner();
  if ("error" in owner) return owner.error;
  const state = request.nextUrl.searchParams.get("state") || "";
  const code = request.nextUrl.searchParams.get("code") || "";
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value || "";
  const codeVerifier = request.cookies.get(GOOGLE_OAUTH_VERIFIER_COOKIE)?.value || "";
  const response = (result: "connected" | "failed") => {
    const next = NextResponse.redirect(destination(request, result));
    const expiredCookie = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/api/admin/revenue/google",
      maxAge: 0,
    };
    next.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", expiredCookie);
    next.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, "", expiredCookie);
    return next;
  };
  if (!state || !expectedState || !codeVerifier || !validOAuthState(expectedState, state) || !code) {
    return response("failed");
  }
  try {
    const tokens = await exchangeGoogleAuthorizationCode({
      code,
      codeVerifier,
      env: process.env,
    });
    const existing = await getGoogleOAuthConnection(owner.client, owner.user.id);
    const refreshToken = tokens.refresh_token;
    if (!refreshToken && !existing) throw new Error("Refresh token unavailable.");
    const account = await discoverAdSenseAccount(tokens.access_token || "");
    if (refreshToken) {
      await saveGoogleOAuthConnection({
        client: owner.client,
        ownerId: owner.user.id,
        refreshToken,
        scopes: (tokens.scope || GOOGLE_ADSENSE_SCOPE).split(" ").filter(Boolean),
        account,
        env: process.env,
      });
    } else {
      const { error } = await owner.client
        .from("google_oauth_connections")
        .update({
          provider_account_id: account.accountId,
          publisher_id: account.publisherId,
          account_display_name: account.displayName,
          scopes: (tokens.scope || GOOGLE_ADSENSE_SCOPE).split(" ").filter(Boolean),
          updated_at: new Date().toISOString(),
        })
        .eq("owner_id", owner.user.id)
        .eq("provider", "adsense");
      if (error) throw error;
    }
    return response("connected");
  } catch {
    return response("failed");
  }
}
