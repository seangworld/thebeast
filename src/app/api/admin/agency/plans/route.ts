import { socialOwner, socialJson } from "@/lib/server/social/auth";
import { agencyPlanningAuthority, normalizeAgencyPlanningRequest } from "@/lib/agencyPlanning";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const owner = await socialOwner();
  if (!owner) return socialJson({ error: "Owner access required." }, 403);
  try {
    const [workstreams, plans] = await Promise.all([
      owner.client.from("beast_marketing_agency_workstreams").select("id,presenter_profile_id,campaign_id,video_series_id,mode,created_at").eq("owner_id", owner.id).order("created_at").limit(201),
      owner.client.from("beast_marketing_distribution_plans").select("id,agency_workstream_id,agency_presenter_profile_id,agency_channel,agency_connection_id,campaign_id,variant_id,variant_revision,variant_revision_hash,planned_for,timezone,status,owner_notes").eq("owner_id", owner.id).not("agency_workstream_id", "is", null).order("planned_for").limit(201),
    ]);
    if (workstreams.error || plans.error || !workstreams.data || !plans.data) return socialJson({ error: "Private planning data is unavailable." }, 503);
    return socialJson({ ...agencyPlanningAuthority, workstreams: workstreams.data.slice(0, 200), plans: plans.data.slice(0, 200), truncated: workstreams.data.length > 200 || plans.data.length > 200 });
  } catch { return socialJson({ error: "Private planning is unavailable." }, 503); }
}

export async function POST(request: Request) {
  const owner = await socialOwner(request);
  if (!owner) return socialJson({ error: "Owner access required." }, 403);
  const input = normalizeAgencyPlanningRequest(await request.json().catch(() => null));
  if (!input) return socialJson({ error: "Choose a saved character and valid private workstream or exact ad revision, channel, planned time, and timezone." }, 400);
  try {
    // Authenticated RPCs perform the owner, talent, revision and optional account checks
    // together under database locks. Never send browser-owned authority flags.
    const result = input.action === "link"
      ? await owner.client.rpc("link_beast_marketing_agency_workstream", {
        selected_presenter_id: input.presenterProfileId, selected_campaign_id: input.campaignId, selected_series_id: input.videoSeriesId,
      })
      : await owner.client.rpc("queue_beast_marketing_agency_plan", {
        selected_workstream_id: input.workstreamId, selected_presenter_id: input.presenterProfileId,
        selected_variant_id: input.variantId, selected_revision: input.revision, selected_revision_hash: input.revisionHash,
        selected_channel: input.channel, selected_connection_id: input.connectionId,
        selected_planned_for: input.plannedFor, selected_timezone: input.timezone, selected_owner_notes: input.ownerNotes,
      });
    if (result.error) {
      const conflict = ["P0001", "22023", "23514", "23503", "23505"].includes(result.error.code);
      return socialJson({ error: conflict ? "The private workstream, account binding, or exact approval no longer matches. Refresh and review before retrying." : "Private planning could not be confirmed. Refresh before retrying." }, conflict ? 409 : 503);
    }
    if (!result.data) return socialJson({ error: "Private planning could not be confirmed. Refresh before retrying." }, 503);
    return socialJson({ ...agencyPlanningAuthority, [input.action === "link" ? "workstream" : "plan"]: result.data });
  } catch { return socialJson({ error: "Private planning could not be confirmed. Refresh before retrying." }, 503); }
}
