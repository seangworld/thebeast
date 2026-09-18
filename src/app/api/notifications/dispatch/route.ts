import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { pushConfiguration } from "@/lib/notifications/pushServer";
import { dispatchDeviceReminders } from "@/lib/notifications/dispatch";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { client, config } = await pushConfiguration();
    const received = Buffer.from(request.headers.get("authorization") || "");
    const expected = Buffer.from(`Bearer ${config.scheduler_token}`);
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    if (!config.enabled) return NextResponse.json({ enabled: false });
    return NextResponse.json(await dispatchDeviceReminders(client, config));
  } catch {
    return NextResponse.json(
      { error: "Notification dispatch unavailable." },
      { status: 503 },
    );
  }
}
