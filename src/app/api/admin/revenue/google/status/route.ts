import { NextResponse } from "next/server";
import { getGoogleOAuthConnection } from "@/lib/server/googleOAuth";
import { requireGoogleOAuthOwner } from "../owner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const owner = await requireGoogleOAuthOwner();
  if ("error" in owner) return owner.error;
  try {
    const connection = await getGoogleOAuthConnection(owner.client, owner.user.id);
    return NextResponse.json(
      connection
        ? {
            connected: true,
            provider: "adsense",
            publisherId: connection.publisher_id,
            account: connection.account_display_name,
            lastSync: connection.last_sync_at,
            connectedAt: connection.connected_at,
          }
        : { connected: false, provider: "adsense" },
      { headers: { "cache-control": "private, no-cache, no-store, must-revalidate" } }
    );
  } catch {
    return NextResponse.json(
      { connected: false, provider: "adsense", unavailable: true },
      { status: 503 }
    );
  }
}
