import { NextRequest, NextResponse } from "next/server";
import { getGoogleConnectionSecrets } from "@/lib/server/googleOAuth";
import { requireGoogleOAuthOwner } from "../owner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const owner = await requireGoogleOAuthOwner();
  if ("error" in owner) return owner.error;
  try {
    const secret = await getGoogleConnectionSecrets(
      owner.client,
      owner.user.id,
      process.env
    );
    if (secret) {
      try {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: secret.refreshToken }),
          cache: "no-store",
        });
      } catch {
        // Local credential deletion must still complete when Google is unavailable.
      }
    }
    const { error } = await owner.client
      .from("google_oauth_connections")
      .delete()
      .eq("owner_id", owner.user.id)
      .eq("provider", "adsense");
    if (error) throw error;
    return NextResponse.json({ disconnected: true });
  } catch {
    return NextResponse.json(
      { error: "Google AdSense could not be disconnected." },
      { status: 503 }
    );
  }
}
