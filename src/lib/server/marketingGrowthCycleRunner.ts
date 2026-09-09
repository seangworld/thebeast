import "server-only";
import { createBeastFusionPublicationClient } from "../supabase/service";
import { loadLiveSeangworldProviders } from "./seangworldGoogleProviders";
import { getSeangworldAnalyticsScope } from "../seangworldAnalyticsScope";
import { prepareSearchGrowthCampaign, searchGrowthCampaignId, searchGrowthProduct } from "../searchGrowthCampaign";
import { buildSearchGrowthAssessment, searchGrowthAssessmentTarget } from "../searchGrowthAssessment";
import { growthTrafficEvidence } from "../marketingGrowthAttribution";
import { GROWTH_CYCLE_LIMIT, GROWTH_HISTORY_LIMIT, GROWTH_PUBLISHING_BLOCKER, growthAssessmentBatch, growthAssessmentId, growthDraftAsset, type GrowthCycleReport } from "../marketingGrowthCycle";

async function boundedProviderRead(product: "thebeast" | "seangworldnews", now: Date) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      loadLiveSeangworldProviders(process.env, now, (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12_000) }), undefined, 30, getSeangworldAnalyticsScope(product)),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("provider_timeout")), 15_000); }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function runMarketingGrowthCycle(ownerId: string, now = new Date()) {
  const client = createBeastFusionPublicationClient();
  const started = Date.now();
  async function enabled() {
    if (Date.now() - started > 40_000) throw new Error("cycle_time_budget_reached");
    const [control, profile] = await Promise.all([
      client.from("beast_marketing_growth_controls").select("enabled").eq("owner_id", ownerId).maybeSingle(),
      client.from("profiles").select("role").eq("id", ownerId).maybeSingle(),
    ]);
    if (control.error || profile.error) throw new Error("control_unavailable");
    return control.data?.enabled === true && profile.data?.role === "admin";
  }
  if (!await enabled()) return { status: "paused" };
  const report: GrowthCycleReport = { version: 1, prepared: [], assessed: [], unavailable: [], blockers: [GROWTH_PUBLISHING_BLOCKER] };
  // One claim per UTC day. Interrupted runs remain visible and never run twice that day.
  const claim = await client.from("beast_marketing_growth_runs").insert({ owner_id: ownerId, cycle_date: now.toISOString().slice(0, 10), status: "running", report }).select("id").single();
  if (claim.error?.code === "23505") return { status: "already_claimed" };
  if (claim.error || !claim.data) throw new Error("cycle_claim_unavailable");
  let status = "completed";
  try {
    const history = await client.from("beast_marketing_campaigns").select("id,status,source_facts", { count: "exact" }).eq("owner_id", ownerId).order("created_at", { ascending: true }).limit(GROWTH_HISTORY_LIMIT);
    if (history.error || history.count === null || history.count > GROWTH_HISTORY_LIMIT || history.data?.length !== history.count) throw new Error("campaign_history_incomplete");
    const campaigns = history.data!;
    for (const product of ["thebeast", "seangworldnews"] as const) {
      if (!await enabled()) throw new Error("cycle_paused");
      const providers = await boundedProviderRead(product, now);
      const provider = providers?.find((item) => item.id === "search_console");
      let freshEvidence = false;
      // Provider ordering is retained; at most two drafts per product per day.
      let productPrepared = 0;
      for (const opportunity of provider?.data?.searchOpportunities || []) {
        if (productPrepared >= GROWTH_CYCLE_LIMIT / 2) break;
        if (searchGrowthProduct(opportunity.page) !== product) continue;
        const draft = prepareSearchGrowthCampaign({ provider, page: opportunity.page, query: opportunity.query, now });
        if (!draft) continue;
        freshEvidence = true;
        const id = searchGrowthCampaignId(ownerId, opportunity.page, opportunity.query);
        if (campaigns.some((campaign) => campaign.id === id)) continue;
        if (campaigns.length >= GROWTH_HISTORY_LIMIT) throw new Error("campaign_capacity_reached");
        if (!await enabled()) throw new Error("cycle_paused");
        const saved = await client.from("beast_marketing_campaigns").insert({ id, owner_id: ownerId, title: draft.title, objective: draft.objective, audience: draft.audience, offer: draft.offer, channels: draft.channels, call_to_action: draft.callToAction, source_facts: draft.sourceFacts, success_measures: draft.successMeasures, limitations: draft.limitations, status: "draft" });
        if (saved.error?.code === "23505") continue;
        if (saved.error) throw new Error("campaign_save_failed");
        campaigns.push({ id, status: "draft", source_facts: draft.sourceFacts });
        report.prepared.push(id);
        productPrepared++;
      }
      const eligible = campaigns.filter((campaign) => !["paused", "completed", "archived"].includes(campaign.status) && searchGrowthAssessmentTarget(ownerId, campaign.id, campaign.source_facts)?.product === product);
      const batch = growthAssessmentBatch(eligible, now);
      if (eligible.length > batch.length) report.blockers.push(`${product}: ${eligible.length - batch.length} campaigns deferred by the rotating assessment budget.`);
      for (const campaign of batch) {
        const target = searchGrowthAssessmentTarget(ownerId, campaign.id, campaign.source_facts);
        if (!target || target.product !== product) continue;
        const assessment = buildSearchGrowthAssessment({ provider, page: target.page, query: target.query, now });
        if (!assessment) { report.unavailable.push(`campaign:${campaign.id}:fresh_search_evidence_unavailable`); continue; }
        freshEvidence = true;
        if (!await enabled()) throw new Error("cycle_paused");
        const current = await client.from("beast_marketing_campaigns").select("status").eq("owner_id", ownerId).eq("id", campaign.id).maybeSingle();
        if (current.error) throw new Error("campaign_state_unavailable");
        if (!current.data || ["paused", "completed", "archived"].includes(current.data.status)) continue;
        // Insert-only, including recovery after a previous interrupted asset write.
        if (current.data.status === "draft") {
          const asset = growthDraftAsset(ownerId, campaign.id, target.page);
          if (asset) {
            const saved = await client.from("beast_marketing_assets").insert(asset);
            if (saved.error && saved.error.code !== "23505") throw new Error("asset_save_failed");
          }
        }
        const baseline = provider!.data!.searchOpportunityBaseline!;
        const traffic = growthTrafficEvidence(providers?.find((item) => item.id === "ga4"), target.page, campaign.id, now);
        const id = growthAssessmentId(ownerId, campaign.id, baseline.currentStartDate, `${baseline.currentEndDate}:${traffic.windowKey}`);
        const saved = await client.from("beast_marketing_recommendations").insert({ id, owner_id: ownerId, campaign_id: campaign.id, ...assessment, decision: traffic.decision, evidence: [...assessment.evidence, ...traffic.evidence], limitations: [...assessment.limitations.filter((item) => !item.includes("owner-requested")), "Scheduled advisory assessment; no campaign status, distribution or spending change."] });
        if (saved.error && saved.error.code !== "23505") throw new Error("assessment_save_failed");
        if (!saved.error) report.assessed.push(campaign.id);
      }
      if (!freshEvidence) report.unavailable.push(`${product}:fresh_actionable_search_evidence_unavailable`);
    }
    report.blockers.push("Search assessments are visibility evidence, not attributed campaign outcomes. Qualified conversions and causal lift are not established.");
  } catch (error) {
    status = "failed";
    const code = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "cycle_failed";
    report.unavailable.push(code);
  }
  const saved = await client.from("beast_marketing_growth_runs").update({ status, report, completed_at: new Date().toISOString() }).eq("id", claim.data.id).eq("owner_id", ownerId);
  if (saved.error) throw new Error("cycle_completion_unconfirmed");
  return { status, report };
}
