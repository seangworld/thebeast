import { NextResponse } from "next/server";
import { createGoogleOAuthRequest, GOOGLE_OAUTH_STATE_COOKIE, GOOGLE_OAUTH_VERIFIER_COOKIE } from "@/lib/server/googleOAuth";
import { googleOAuthError, requireGoogleOAuthOwner } from "../owner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const owner = await requireGoogleOAuthOwner();
  if ("error" in owner) return owner.error;
  try {
    const request = createGoogleOAuthRequest(process.env);
    const response = NextResponse.redirect(request.url);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/api/admin/revenue/google",
      maxAge: 10 * 60,
    };
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, request.state, cookieOptions);
    response.cookies.set(
      GOOGLE_OAUTH_VERIFIER_COOKIE,
      request.codeVerifier,
      cookieOptions
    );
    return response;
  } catch {
    return googleOAuthError("Google OAuth is not configured.", 503);
  }
}
