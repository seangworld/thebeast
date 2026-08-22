import { NextResponse } from "next/server";
import { loadBeastFusionCanonicalReadModel } from "@/lib/server/beastFusionReadModel";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const privateHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders });
}

export async function GET() {
  try {
    const supabase = createRouteClient();
    const {
      data: { user },
      error: authenticationError,
    } = await supabase.auth.getUser();
    if (authenticationError || !user) {
      return json({ error: "Authentication required." }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return json(
        { error: "Development Console could not verify owner access." },
        503
      );
    }
    if (profile?.role !== "admin") {
      return json({ error: "BeastAdmin owner access required." }, 403);
    }

    const canonicalResult = await loadBeastFusionCanonicalReadModel();
    if (!canonicalResult.canonical) {
      return json(
        {
          error:
            "Canonical BeastFusion governance is unavailable; legacy roadmap and release records were not used as a fallback.",
          provider: canonicalResult.provider,
          canonical: null,
        },
        503
      );
    }

    return json({
      provider: canonicalResult.provider,
      canonical: canonicalResult.canonical,
    });
  } catch {
    return json(
      {
        error:
          "Development Console could not load the canonical BeastFusion read model.",
      },
      503
    );
  }
}
