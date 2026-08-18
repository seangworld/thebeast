import { NextResponse } from "next/server";
import { normalizeFirstPartyTelemetryRecord } from "@/lib/firstPartyTelemetry";
import { recordServerFirstPartyTelemetry } from "@/lib/server/firstPartyTelemetry";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const client = createRouteClient();
  const {
    data: { user },
    error: authenticationError,
  } = await client.auth.getUser();
  if (authenticationError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid telemetry event is required." }, { status: 400 });
  }
  const record = normalizeFirstPartyTelemetryRecord(body);
  if (!record) {
    return NextResponse.json({ error: "Telemetry event rejected by the governed taxonomy." }, { status: 400 });
  }
  const recorded = await recordServerFirstPartyTelemetry({
    actorId: user.id,
    record,
  });
  return recorded
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json(
        { error: "Telemetry is temporarily unavailable. The primary action remains complete." },
        { status: 202 }
      );
}
