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
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return NextResponse.json(
        { error: "Repository intelligence could not verify owner access." },
        { status: 503 }
      );
    }
    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "BeastAdmin owner access required." },
        { status: 403 }
      );
    }

    const canonicalResult = await loadBeastFusionCanonicalReadModel();
    if (!canonicalResult.canonical) {
      return NextResponse.json(
        {
          error:
            "Canonical BeastFusion release truth is unavailable; legacy records were not used as a fallback.",
          canonicalProvider: canonicalResult.provider,
        },
        {
          status: 503,
          headers: { "Cache-Control": "private, no-store" },
        }
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

    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Repository and release intelligence could not load its verified sources.",
      },
      { status: 503 }
    );
  }
}
