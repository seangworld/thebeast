import { NextResponse } from "next/server";
import {
  buildBeastAdminRepositoryReleaseSnapshot,
  type BeastAdminOperationalReleaseNote,
} from "@/lib/beastAdminRepositoryReleaseIntelligence";
import { classifyLegacyBeastAdminRecord } from "@/lib/beastAdminCanonicalProjection";
import {
  readGitHubRepositoryEvidence,
  readVercelDeploymentEvidence,
} from "@/lib/server/beastAdminRepositoryProviders";
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

type OperationalReleaseRow = {
  id: string;
  product: string;
  version: string;
  title: string;
  updated_at: string;
  governance_classification: string | null;
};

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
        { error: "Repository intelligence could not verify owner access." },
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
            "Canonical BeastFusion release truth is unavailable; legacy records were not used as a fallback.",
          canonicalProvider: canonicalResult.provider,
        },
        503
      );
    }

    const [github, vercel, releaseRows] = await Promise.all([
      readGitHubRepositoryEvidence(),
      readVercelDeploymentEvidence(),
      supabase
        .from("beast_admin_release_records")
        .select(
          "id,product,version,title,updated_at,governance_classification"
        )
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false }),
    ]);

    const operationalNotes: BeastAdminOperationalReleaseNote[] = [];
    if (!releaseRows.error && Array.isArray(releaseRows.data)) {
      for (const row of releaseRows.data as OperationalReleaseRow[]) {
        const classification = classifyLegacyBeastAdminRecord({
          classification: row.governance_classification,
        });
        if (classification === "canonical_projection") continue;
        operationalNotes.push({
          id: row.id,
          product: row.product,
          version: row.version,
          title: row.title,
          updatedAt: row.updated_at,
          classification,
          source: "beastadmin_operational_note",
        });
      }
    }

    const snapshot = buildBeastAdminRepositoryReleaseSnapshot({
      canonical: canonicalResult.canonical,
      githubProvider: github.provider,
      vercelProvider: vercel.provider,
      repositoryObservations: github.observations,
      deploymentObservations: vercel.observations,
      operationalNotes,
    });

    return json(snapshot);
  } catch {
    return json(
      {
        error:
          "Repository and release intelligence could not load its verified sources.",
      },
      503
    );
  }
}
