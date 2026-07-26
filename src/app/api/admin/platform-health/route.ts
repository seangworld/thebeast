import { NextResponse } from "next/server";
import {
  buildBeastAdminPlatformHealthSnapshot,
  type BeastAdminPlatformHealthSignal,
} from "@/lib/beastAdminPlatformHealth";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function elapsed(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function signal(
  input: Omit<BeastAdminPlatformHealthSignal, "checkedAt">
): BeastAdminPlatformHealthSignal {
  return { ...input, checkedAt: new Date().toISOString() };
}

export async function GET() {
  const requestStartedAt = performance.now();

  try {
    const supabase = createRouteClient();
    const authenticationStartedAt = performance.now();
    const {
      data: { user },
      error: authenticationError,
    } = await supabase.auth.getUser();

    if (authenticationError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const authenticationSignal = signal({
      id: "authentication",
      status: "operational",
      summary: "The current owner session was verified.",
      evidence:
        "Supabase Auth resolved the signed-in user for this protected request.",
      source: "live_probe",
      latencyMs: elapsed(authenticationStartedAt),
    });

    const databaseStartedAt = performance.now();
    const { data: profile, error: databaseError } = await supabase
      .from("profiles")
      .select("id,role")
      .eq("id", user.id)
      .maybeSingle();
    const databaseLatency = elapsed(databaseStartedAt);

    if (databaseError) {
      return NextResponse.json(
        {
          error:
            "Platform Health could not verify owner access because the database probe failed.",
        },
        { status: 503 }
      );
    }
    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "BeastAdmin owner access required." },
        { status: 403 }
      );
    }

    const databaseSignal = signal({
      id: "database",
      status: "operational",
      summary: "The primary database accepted an owner-scoped query.",
      evidence:
        "The profiles table returned the authenticated owner record without bypassing RLS.",
      source: "live_probe",
      latencyMs: databaseLatency,
    });

    const storageStartedAt = performance.now();
    const { error: storageError } = await supabase.storage
      .from("beast-documents")
      .list(user.id, { limit: 1 });
    const storageSignal = storageError
      ? signal({
          id: "storage",
          status: "critical",
          summary: "The owner-scoped document storage probe failed.",
          evidence:
            "The Beast Documents bucket could not list the signed-in owner's path. Review the bucket, storage policies, and provider status.",
          source: "live_probe",
          latencyMs: elapsed(storageStartedAt),
        })
      : signal({
          id: "storage",
          status: "operational",
          summary: "Document storage responded to an owner-scoped probe.",
          evidence:
            "The Beast Documents bucket listed the signed-in owner's path without reading file contents.",
          source: "live_probe",
          latencyMs: elapsed(storageStartedAt),
        });

    const aiConfigured = Boolean(process.env.OPENAI_API_KEY);
    const currentRequestLatency = elapsed(requestStartedAt);
    const services: BeastAdminPlatformHealthSignal[] = [
      authenticationSignal,
      databaseSignal,
      signal({
        id: "api",
        status: "operational",
        summary: "The protected Platform Health API is responding.",
        evidence:
          "This owner-authorized request reached application code and completed its live probes.",
        source: "live_probe",
        latencyMs: currentRequestLatency,
      }),
      storageSignal,
      signal({
        id: "email",
        status: "unknown",
        summary: "Email delivery monitoring is not connected.",
        evidence:
          "Beast has branded Supabase Auth templates, but no read-only delivery or bounce feed is available to this health check.",
        source: "not_connected",
        latencyMs: null,
      }),
      signal({
        id: "ai",
        status: "warning",
        summary: aiConfigured
          ? "AI is configured, but provider availability is not probed."
          : "AI credentials are not configured in this environment.",
        evidence: aiConfigured
          ? "The server can confirm an AI credential exists without exposing it. No paid inference request is made for health monitoring."
          : "AI-dependent experiences use their existing unconfigured or deterministic fallback behavior.",
        source: "configuration",
        latencyMs: null,
      }),
      signal({
        id: "performance",
        status:
          currentRequestLatency >= 3000
            ? "critical"
            : currentRequestLatency >= 1500
              ? "warning"
              : "operational",
        summary: `The current health request completed its probes in ${currentRequestLatency} ms.`,
        evidence:
          "This is one server-request sample, not an uptime claim or replacement for centralized application performance monitoring.",
        source: "request_sample",
        latencyMs: currentRequestLatency,
      }),
      signal({
        id: "background_jobs",
        status: "unknown",
        summary: "Background job monitoring is not connected.",
        evidence:
          "No owner-approved queue, scheduler, or worker telemetry source is registered with BeastAdmin.",
        source: "not_connected",
        latencyMs: null,
      }),
    ];
    const snapshot = buildBeastAdminPlatformHealthSnapshot({ services });

    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Platform Health could not complete its probes.",
      },
      { status: 503 }
    );
  }
}
