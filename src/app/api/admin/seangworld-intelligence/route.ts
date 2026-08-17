import { NextResponse } from "next/server";
import {
  buildSeangworldIntelligenceSnapshot,
  buildServerSeangworldProviders,
} from "@/lib/seangworldIntelligence";
import { loadLiveSeangworldProviders } from "@/lib/server/seangworldGoogleProviders";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const client = createRouteClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return error("Authentication required.", 401);
  const { data: profile, error: profileError } = await client
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) return error("SEANGWORLD Intelligence could not verify owner access.", 503);
  if (profile?.role !== "admin") return error("BeastAdmin owner access required.", 403);

  const generatedAt = new Date().toISOString();
  const requestedDays = Number(new URL(request.url).searchParams.get("days") || 30);
  if (![7, 30, 90].includes(requestedDays)) {
    return error("Select a supported analytics range: 7, 30, or 90 days.", 400);
  }
  const configuredProviders = buildServerSeangworldProviders(
    process.env,
    generatedAt
  );
  const liveProviders = await loadLiveSeangworldProviders(
    process.env,
    new Date(generatedAt),
    fetch,
    undefined,
    requestedDays
  );
  const providers = liveProviders
    ? configuredProviders.map(
        (provider) =>
          liveProviders.find((live) => live.id === provider.id) || provider
      )
    : configuredProviders;
  const snapshot = buildSeangworldIntelligenceSnapshot({
    providers,
    generatedAt,
    comparisonPeriod: `Current ${requestedDays} days compared with previous ${requestedDays} days`,
  });
  return NextResponse.json(snapshot, {
    headers: { "cache-control": "private, no-cache, no-store, must-revalidate" },
  });
}
