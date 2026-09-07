import { NextResponse } from "next/server";
import {
  buildSeangworldIntelligenceSnapshot,
  buildServerSeangworldProviders,
} from "@/lib/seangworldIntelligence";
import { loadLiveSeangworldProviders } from "@/lib/server/seangworldGoogleProviders";
import { loadFirstPartyTelemetryProvider } from "@/lib/server/firstPartyTelemetry";
import { createRouteClient } from "@/lib/supabase/server";
import { getSeangworldAnalyticsScope } from "@/lib/seangworldAnalyticsScope";

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
  const searchParams = new URL(request.url).searchParams;
  const requestedDays = Number(searchParams.get("days") || 30);
  if (![7, 30, 90].includes(requestedDays)) {
    return error("Select a supported analytics range: 7, 30, or 90 days.", 400);
  }
  const requestedProduct = searchParams.get("product");
  const scope = getSeangworldAnalyticsScope(requestedProduct);
  if (requestedProduct && !scope) {
    return error("Select a supported product analytics scope.", 400);
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
    requestedDays,
    scope
  );
  const firstPartyProvider = scope
    ? null
    : await loadFirstPartyTelemetryProvider(
        client,
        requestedDays,
        generatedAt,
        process.env
      );
  const providers = configuredProviders.filter(
    (provider) => !scope || provider.id !== "first_party"
  ).map(
    (provider) =>
      (liveProviders || []).find((live) => live.id === provider.id) ||
      (provider.id === "first_party" && firstPartyProvider
        ? firstPartyProvider
        : provider)
  );
  const snapshot = buildSeangworldIntelligenceSnapshot({
    providers,
    generatedAt,
    comparisonPeriod: `${scope ? `${scope.label}: ` : ""}current ${requestedDays} days compared with previous ${requestedDays} days`,
  });
  return NextResponse.json(snapshot, {
    headers: { "cache-control": "private, no-cache, no-store, must-revalidate" },
  });
}
