import { NextResponse } from "next/server";
import {
  type BeastAdminCEOSourceSnapshot,
  type BeastAdminCEOSourceState,
} from "@/lib/beastAdminCEOMode";
import { normalizeBeastAdminAIAnalytics } from "@/lib/beastAdminAIAnalytics";
import {
  normalizeBeastAdminFeedbackItems,
  type BeastAdminFeedbackItem,
} from "@/lib/beastAdminFeedback";
import {
  buildBeastAdminDevelopmentConsoleSnapshot,
  type BeastAdminDeploymentGitEvidence,
} from "@/lib/beastAdminDevelopmentConsole";
import { normalizeBeastAdminMemberDirectory } from "@/lib/beastAdminMemberTimeline";
import {
  normalizeBeastAdminReleaseRecords,
  type BeastAdminReleaseRecord,
} from "@/lib/beastAdminReleaseCenter";
import {
  normalizeBeastAdminRoadmapRow,
  type BeastAdminRoadmapItem,
  type BeastAdminRoadmapRow,
} from "@/lib/beastAdminRoadmap";
import { normalizeBeastFeatureFlags } from "@/lib/beastFeatureFlags";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function deploymentGitEvidence(): BeastAdminDeploymentGitEvidence | null {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || "";
  if (!/^[0-9a-f]{7,40}$/i.test(commitSha)) return null;

  return {
    commitSha,
    branch: process.env.VERCEL_GIT_COMMIT_REF?.trim() || "",
    repository: [
      process.env.VERCEL_GIT_REPO_OWNER?.trim(),
      process.env.VERCEL_GIT_REPO_SLUG?.trim(),
    ]
      .filter(Boolean)
      .join("/"),
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
        { error: "CEO Mode could not verify owner access." },
        { status: 503 }
      );
    }
    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "BeastAdmin owner access required." },
        { status: 403 }
      );
    }

    const generatedAt = new Date().toISOString();
    const [
      roadmapResult,
      releaseResult,
      feedbackResult,
      memberResult,
      analyticsResult,
      flagResult,
    ] = await Promise.all([
      supabase
        .from("beast_admin_roadmap_items")
        .select(
          "id,user_id,product_id,title,summary,status,owner_notes,created_at,updated_at"
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase.rpc("get_beast_admin_release_records"),
      supabase.rpc("get_beast_admin_beta_feedback"),
      supabase.rpc("get_beast_admin_member_directory"),
      supabase.rpc("get_beast_admin_ai_analytics", { window_days: 7 }),
      supabase.rpc("get_beast_admin_feature_flags"),
    ]);

    let roadmapItems: BeastAdminRoadmapItem[] = [];
    let releases: BeastAdminReleaseRecord[] = [];
    let feedback: BeastAdminFeedbackItem[] = [];
    let members: NonNullable<
      ReturnType<typeof normalizeBeastAdminMemberDirectory>
    > = [];
    let aiAnalytics: ReturnType<typeof normalizeBeastAdminAIAnalytics> = null;
    let featureFlags: NonNullable<
      ReturnType<typeof normalizeBeastFeatureFlags>
    > = [];

    let roadmapState: BeastAdminCEOSourceState = "unavailable";
    let releaseState: BeastAdminCEOSourceState = "unavailable";
    let feedbackState: BeastAdminCEOSourceState = "unavailable";
    let memberState: BeastAdminCEOSourceState = "unavailable";
    let analyticsState: BeastAdminCEOSourceState = "unavailable";
    let betaState: BeastAdminCEOSourceState = "unavailable";

    if (!roadmapResult.error) {
      const rows = (roadmapResult.data || []) as BeastAdminRoadmapRow[];
      const normalized = rows
        .map(normalizeBeastAdminRoadmapRow)
        .filter((item): item is BeastAdminRoadmapItem => Boolean(item));
      if (normalized.length === rows.length) {
        roadmapItems = normalized;
        roadmapState = "available";
      }
    }

    if (!releaseResult.error) {
      const normalized = normalizeBeastAdminReleaseRecords(releaseResult.data);
      if (normalized) {
        releases = normalized;
        releaseState = "available";
      }
    }

    if (!feedbackResult.error) {
      const normalized = normalizeBeastAdminFeedbackItems(feedbackResult.data);
      if (normalized) {
        feedback = normalized;
        feedbackState = "available";
      }
    }

    if (!memberResult.error) {
      const normalized = normalizeBeastAdminMemberDirectory(memberResult.data);
      if (normalized) {
        members = normalized;
        memberState = "available";
      }
    }

    if (!analyticsResult.error) {
      const normalized = normalizeBeastAdminAIAnalytics(analyticsResult.data);
      if (normalized) {
        aiAnalytics = normalized;
        analyticsState = "available";
      }
    }

    if (!flagResult.error) {
      const normalized = normalizeBeastFeatureFlags(flagResult.data);
      if (normalized) {
        featureFlags = normalized;
        betaState = "available";
      }
    }

    const snapshot: BeastAdminCEOSourceSnapshot = {
      generatedAt,
      development: buildBeastAdminDevelopmentConsoleSnapshot({
        roadmapItems,
        releases,
        roadmapAvailable: roadmapState === "available",
        releasesAvailable: releaseState === "available",
        gitEvidence: deploymentGitEvidence(),
        generatedAt,
      }),
      feedback,
      members,
      aiAnalytics,
      featureFlags,
      aiRecommendations: {
        state: "unavailable",
        detail:
          "This area will surface owner-reviewed recommendations from Beast professionals after connected sources become available.",
        items: [],
      },
      sources: {
        roadmap: roadmapState,
        releases: releaseState,
        feedback: feedbackState,
        members: memberState,
        betaTesting: betaState,
        aiActivity: analyticsState,
        aiRecommendations: "unavailable",
      },
    };

    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "CEO Mode could not load its verified operating sources." },
      { status: 503 }
    );
  }
}
