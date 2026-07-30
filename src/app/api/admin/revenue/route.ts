import { NextResponse } from "next/server";
import { loadAdSenseRevenueSnapshot } from "@/lib/server/adsenseRevenueProvider";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const client = createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) return error("Authentication required.", 401);

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return error("Revenue Center could not verify owner access.", 503);
  }
  if (profile?.role !== "admin") {
    return error("BeastAdmin owner access required.", 403);
  }

  const snapshot = await loadAdSenseRevenueSnapshot(process.env);
  return NextResponse.json(snapshot, {
    headers: {
      "cache-control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
