import { NextResponse } from "next/server";
import {
  type BeastAdminCEOSourceSnapshot,
  type BeastAdminCEOSourceState,
} from "@/lib/beastAdminCEOMode";
import { normalizeBeastAdminAIAnalytics } from "@/lib/beastAdminAIAnalytics";
import { normalizeBeastAdminFeedbackItems } from "@/lib/beastAdminFeedback";
import { normalizeBeastAdminMemberDirectory } from "@/lib/beastAdminMemberTimeline";
import { buildBeastAdminRepositoryReleaseSnapshot } from "@/lib/beastAdminRepositoryReleaseIntelligence";
import {
  readGitHubRepositoryEvidence,
  readVercelDeploymentEvidence,
} from "@/lib/server/beastAdminRepositoryProviders";
import { loadBeastFusionCanonicalReadModel } from "@/lib/server/beastFusionReadModel";
import { normalizeBeastFeatureFlags } from "@/lib/beastFeatureFlags";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const privateHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders });
}

function canonicalSourceState(
  status: string
): BeastAdminCEOSourceState {
  if (status === "connected") return "available";
  if (status === "stale") return "stale";
  if (status === "error" || status === "drift_detected") return "error";
  return "unavailable";
}

function repositorySourceState(
  status: string
): BeastAdminCEOSourceState {
  if (status === "connected" || status === "partial") return "available";
  if (status === "stale") return "stale";
  if (status === "error") return "error";
  return "unavailable";
}

function canonicalOpportunityRecommendations(
  canonical: BeastAdminCEOSourceSnapshot["canonical"]
): BeastAdminCEOSourceSnapshot["opportunityRecommendations"] {
  if (!canonical) {
    return {
      state: "unavailable",
      detail: "Canonical Strategy Proposal evidence is unavailable.",
      items: [],
    };
  }
  const items = (canonical.proposals || [])
    .filter(
      (proposal) =>
        proposal.ownerApproved &&
        proposal.evidence.length > 0 &&
        !["rejected", "archived"].includes(proposal.status)
    )
    .map((proposal) => ({
      id: proposal.id,
      professionalName:
        proposal.sourceAgent === "research_planning_agent"
          ? "Research + Planning"
          : "Observer / Operations",
      recommendation: proposal.title,
      whySurfaced: proposal.evidence.map((item) => item.summary).join(" "),
      createdAt: proposal.createdAt,
    }));
  return {
    state: "available",
    detail:
      items.length > 0
        ? "Connected to owner-approved, source-cited Strategy Proposal evidence from canonical BeastFusion."
        : "Connected to the canonical Strategy Proposal feed; no owner-approved recommendation is currently pending.",
    items,
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
      return json({ error: "Authentication required." }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return json({ error: "CEO Mode could not verify owner access." }, 503);
    }
    if (profile?.role !== "admin") {
      return json({ error: "BeastAdmin owner access required." }, 403);
    }

    const generatedAt = new Date().toISOString();
    const canonicalResult = await loadBeastFusionCanonicalReadModel({
      now: new Date(generatedAt),
    });
    const [feedbackResult, memberResult, analyticsResult, flagResult, github, vercel] =
      await Promise.all([
        supabase.rpc("get_beast_admin_beta_feedback"),
        supabase.rpc("get_beast_admin_member_directory"),
        supabase.rpc("get_beast_admin_ai_analytics", { window_days: 7 }),
        supabase.rpc("get_beast_admin_feature_flags"),
        readGitHubRepositoryEvidence(),
        readVercelDeploymentEvidence(),
      ]);

    const feedback = feedbackResult.error
      ? null
      : normalizeBeastAdminFeedbackItems(feedbackResult.data);
    const members = memberResult.error
      ? null
      : normalizeBeastAdminMemberDirectory(memberResult.data);
    const aiAnalytics = analyticsResult.error
      ? null
      : normalizeBeastAdminAIAnalytics(analyticsResult.data);
    const featureFlags = flagResult.error
      ? null
      : normalizeBeastFeatureFlags(flagResult.data);
    const repositoryRelease = canonicalResult.canonical
      ? buildBeastAdminRepositoryReleaseSnapshot({
          canonical: canonicalResult.canonical,
          githubProvider: github.provider,
          vercelProvider: vercel.provider,
          repositoryObservations: github.observations,
          deploymentObservations: vercel.observations,
          operationalNotes: [],
          now: new Date(generatedAt),
        })
      : null;
    const repositoryState = repositoryRelease
      ? repositorySourceState(
          repositoryRelease.providers.github.status === "connected" &&
            repositoryRelease.providers.vercel.status === "connected"
            ? "connected"
            : repositoryRelease.providers.github.status === "error" ||
                repositoryRelease.providers.vercel.status === "error"
              ? "error"
              : repositoryRelease.providers.github.status === "stale" ||
                  repositoryRelease.providers.vercel.status === "stale"
                ? "stale"
                : "partial"
        )
      : "unavailable";

    const opportunityRecommendations = canonicalOpportunityRecommendations(
      canonicalResult.canonical
    );
    const snapshot: BeastAdminCEOSourceSnapshot = {
      generatedAt,
      canonical: canonicalResult.canonical,
      repositoryRelease,
      feedback: feedback || [],
      members: members || [],
      aiAnalytics,
      featureFlags: featureFlags || [],
      opportunityRecommendations,
      sources: {
        canonicalGovernance: canonicalSourceState(canonicalResult.provider.status),
        repositoryIntelligence: repositoryState,
        feedback: feedback ? "available" : "unavailable",
        members: members ? "available" : "unavailable",
        betaTesting: featureFlags ? "available" : "unavailable",
        aiActivity: aiAnalytics ? "available" : "unavailable",
        opportunityRecommendations: opportunityRecommendations.state,
      },
    };

    return json(snapshot);
  } catch {
    return json(
      { error: "CEO Mode could not load its verified operating sources." },
      503
    );
  }
}
