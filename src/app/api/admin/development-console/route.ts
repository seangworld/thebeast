import { NextResponse } from "next/server";
import {
  buildBeastAdminDevelopmentConsoleSnapshot,
  type BeastAdminDeploymentGitEvidence,
} from "@/lib/beastAdminDevelopmentConsole";
import {
  normalizeBeastAdminRoadmapRow,
  type BeastAdminRoadmapItem,
  type BeastAdminRoadmapRow,
} from "@/lib/beastAdminRoadmap";
import {
  normalizeBeastAdminReleaseRecords,
  type BeastAdminReleaseRecord,
} from "@/lib/beastAdminReleaseCenter";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function deploymentGitEvidence(): BeastAdminDeploymentGitEvidence | null {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || "";
  if (!/^[0-9a-f]{7,40}$/i.test(commitSha)) return null;

  const repository = [
    process.env.VERCEL_GIT_REPO_OWNER?.trim(),
    process.env.VERCEL_GIT_REPO_SLUG?.trim(),
  ]
    .filter(Boolean)
    .join("/");

  return {
    commitSha,
    branch: process.env.VERCEL_GIT_COMMIT_REF?.trim() || "",
    repository,
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE?.trim() || "",
  };
}

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
        { error: "Development Console could not verify owner access." },
        { status: 503 }
      );
    }
    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "BeastAdmin owner access required." },
        { status: 403 }
      );
    }

    let roadmapItems: BeastAdminRoadmapItem[] = [];
    let releases: BeastAdminReleaseRecord[] = [];
    let roadmapAvailable = false;
    let releasesAvailable = false;

    const { data: roadmapData, error: roadmapError } = await supabase
      .from("beast_admin_roadmap_items")
      .select(
        "id,user_id,product_id,title,summary,status,owner_notes,created_at,updated_at"
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!roadmapError) {
      const normalized = ((roadmapData || []) as BeastAdminRoadmapRow[])
        .map(normalizeBeastAdminRoadmapRow)
        .filter((item): item is BeastAdminRoadmapItem => Boolean(item));
      if (normalized.length === (roadmapData || []).length) {
        roadmapItems = normalized;
        roadmapAvailable = true;
      }
    }

    const { data: releaseData, error: releaseError } = await supabase.rpc(
      "get_beast_admin_release_records"
    );
    if (!releaseError) {
      const normalized = normalizeBeastAdminReleaseRecords(releaseData);
      if (normalized) {
        releases = normalized;
        releasesAvailable = true;
      }
    }

    const snapshot = buildBeastAdminDevelopmentConsoleSnapshot({
      roadmapItems,
      releases,
      roadmapAvailable,
      releasesAvailable,
      gitEvidence: deploymentGitEvidence(),
    });

    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Development Console could not load its verified sources." },
      { status: 503 }
    );
  }
}
