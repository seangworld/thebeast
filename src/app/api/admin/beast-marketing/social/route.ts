import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { isSocialChannel, isUuid, validateSocialContent, validateDirectPost } from "@/lib/marketingSocial";
import { socialOwner, socialJson, socialConfiguration } from "@/lib/server/social/auth";
import { publishSocialPost } from "@/lib/server/social/publish";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const fields = "id,channel,connection_id,content,revision,status,scheduled_at,created_at,published_at,provider_post_id,last_error";

export async function GET() {
  const owner = await socialOwner();
  if (!owner) return socialJson({ error: "Owner access required." }, 403);
  const db = createBeastFusionPublicationClient();
  const [posts, connections, controls, campaigns, assets] = await Promise.all([
    db.from("beast_marketing_social_posts").select(fields).eq("owner_id", owner.id).order("created_at", { ascending: false }).limit(100),
    db.from("beast_marketing_social_connections").select("id,channel,account_id,label,connected_at,expires_at").eq("owner_id", owner.id).is("disconnected_at", null),
    db.from("beast_marketing_social_controls").select("paused,x_paid_enabled").eq("owner_id", owner.id).maybeSingle(),
    owner.client.from("beast_marketing_campaigns").select("id,title,call_to_action,offer").eq("owner_id", owner.id).order("updated_at", { ascending: false }).limit(50),
    owner.client.from("beast_marketing_assets").select("id,campaign_id,name,body").eq("owner_id", owner.id).order("updated_at", { ascending: false }).limit(50),
  ]);
  if ([posts, connections, controls, campaigns, assets].some(r => r.error)) return socialJson({ error: "Social workspace data is unavailable. The social database setup may still be pending." }, 503);
  return socialJson({ posts: posts.data, connections: connections.data, controls: controls.data || { paused: true, x_paid_enabled: false }, campaigns: campaigns.data, assets: assets.data, configuration: socialConfiguration() });
}

export async function POST(request: Request) {
  const owner = await socialOwner(request);
  if (!owner) return socialJson({ error: "Owner access required." }, 403);
  const body = await request.json().catch(() => null);
  const db = createBeastFusionPublicationClient();
  try {
    if (body?.action === "controls") {
      if (typeof body.paused !== "boolean" || typeof body.xPaidEnabled !== "boolean") return socialJson({ error: "Choose publishing settings." }, 400);
      if (body.xPaidEnabled && body.confirmXCharges !== true) return socialJson({ error: "Confirm that direct X API activity may incur charges." }, 400);
      const saved = await db.from("beast_marketing_social_controls").upsert({ owner_id: owner.id, paused: body.paused, x_paid_enabled: body.xPaidEnabled });
      if (saved.error) throw new Error("Could not save publishing settings.");
      return socialJson({ saved: true });
    }
    if (body?.action === "disconnect" && isUuid(body.id)) {
      // Retain history and prevent queued posts from losing their account silently.
      const active = await db.from("beast_marketing_social_posts").select("id").eq("owner_id", owner.id).eq("connection_id", body.id).in("status", ["publishing", "processing", "scheduled"]).limit(1);
      if (active.error || active.data?.length) throw new Error("Cancel scheduled posts and finish in-flight posts before disconnecting. Pause publishing now if needed.");
      const cleared = await db.from("beast_marketing_social_connections").update({ credentials: {}, disconnected_at: new Date().toISOString(), expires_at: "2000-01-01T00:00:00Z", connected_at: new Date().toISOString() }).eq("owner_id", owner.id).eq("id", body.id);
      if (cleared.error) throw new Error("Disconnect could not be confirmed.");
      return socialJson({ saved: true });
    }
    if (body?.action === "save") {
      if (!isUuid(body.id) || !isSocialChannel(body.channel)) throw new Error("Choose a valid post and channel.");
      const content = validateSocialContent(body.content, body.channel, process.env.NEXT_PUBLIC_SUPABASE_URL);
      if (content.campaignId) {
        const campaign = await owner.client.from("beast_marketing_campaigns").select("id").eq("owner_id", owner.id).eq("id", content.campaignId).maybeSingle();
        if (campaign.error || !campaign.data) throw new Error("This campaign is unavailable.");
      }
      let connectionId: string | null = null;
      if (body.connectionId) {
        if (!isUuid(body.connectionId)) throw new Error("Choose an account.");
        const connection = await db.from("beast_marketing_social_connections").select("id").eq("owner_id", owner.id).eq("id", body.connectionId).eq("channel", body.channel).is("disconnected_at", null).maybeSingle();
        if (connection.error || !connection.data) throw new Error("Choose an account for this channel.");
        connectionId = connection.data.id;
      }
      const revision = body.revision;
      if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Invalid draft revision.");
      const payload = { channel: body.channel, connection_id: connectionId, content, updated_at: new Date().toISOString(), approved_at: null, approved_revision: null };
      const result = revision === 0
        ? await db.from("beast_marketing_social_posts").insert({ id: body.id, owner_id: owner.id, ...payload }).select(fields).single()
        : await db.from("beast_marketing_social_posts").update({ ...payload, revision: revision + 1 }).eq("owner_id", owner.id).eq("id", body.id).eq("revision", revision).eq("status", "draft").select(fields).maybeSingle();
      if (result.error || !result.data) throw new Error("Post was not saved. Refresh; it may have changed or already been saved.");
      return socialJson({ post: result.data });
    }
    if (!isUuid(body?.id) || !Number.isInteger(body.revision)) throw new Error("Choose a saved post.");
    if (body.action === "publish" || body.action === "schedule") {
      if (body.confirm !== true) throw new Error("Review and approve this exact saved post before publishing.");
      const current = await db.from("beast_marketing_social_posts").select("*").eq("owner_id", owner.id).eq("id", body.id).eq("revision", body.revision).eq("status", "draft").maybeSingle();
      if (current.error || !current.data) throw new Error("This draft changed. Refresh and review it again.");
      const post = current.data;
      validateSocialContent(post.content, post.channel, process.env.NEXT_PUBLIC_SUPABASE_URL);
      validateDirectPost(post.content, post.channel);
      if (!post.connection_id) throw new Error("Connect and select an account first.");
      const controls = await db.from("beast_marketing_social_controls").select("paused,x_paid_enabled").eq("owner_id", owner.id).maybeSingle();
      if (controls.error || controls.data?.paused !== false) throw new Error("Publishing is paused. Enable it in Accounts first.");
      if (post.channel === "x" && !controls.data.x_paid_enabled) throw new Error("Direct X posting is off. Use Open X or enable paid API access in Accounts.");
      const time = body.action === "publish" ? Date.now() : Date.parse(body.scheduledAt || "");
      if (!Number.isFinite(time) || (body.action === "schedule" && (time < Date.now() + 60_000 || time > Date.now() + 90 * 86400000))) throw new Error("Choose a time between one minute and 90 days from now.");
      if ((body.action === "schedule" || post.channel === "instagram") && !socialConfiguration().scheduler) throw new Error("The publishing scheduler needs setup first.");
      const connection = await db.from("beast_marketing_social_connections").select("expires_at").is("disconnected_at", null).eq("owner_id", owner.id).eq("id", post.connection_id).maybeSingle();
      if (connection.error || !connection.data || (connection.data.expires_at && Date.parse(connection.data.expires_at) <= time && post.channel !== "x")) throw new Error("Reconnect this account before the requested publish time.");
      const saved = await db.from("beast_marketing_social_posts").update({ status: "scheduled", approved_revision: body.revision, approved_at: new Date().toISOString(), scheduled_at: new Date(time).toISOString(), updated_at: new Date().toISOString() }).eq("owner_id", owner.id).eq("id", body.id).eq("revision", body.revision).eq("status", "draft").select("id").maybeSingle();
      if (saved.error || !saved.data) throw new Error("Could not approve this post. Refresh before trying again.");
      if (body.action === "publish") return socialJson(await publishSocialPost(owner.id, body.id));
      return socialJson({ status: "scheduled" });
    }
    if (body.action === "cancel" || body.action === "edit" || body.action === "manual") {
      const allowed = body.action === "manual" ? ["draft"] : body.action === "edit" ? ["scheduled", "cancelled", "failed"] : ["draft", "scheduled", "processing"];
      const status = body.action === "manual" ? "shared_manually" : body.action === "edit" ? "draft" : "cancelled";
      if (body.action === "manual" && body.confirm !== true) throw new Error("Confirm you completed the post on the platform.");
      const update = await db.from("beast_marketing_social_posts").update({ status, approved_at: null, approved_revision: null, scheduled_at: null, provider_container_id: null, last_error: null, revision: body.revision + 1, updated_at: new Date().toISOString() }).eq("owner_id", owner.id).eq("id", body.id).eq("revision", body.revision).in("status", allowed).select("id").maybeSingle();
      if (update.error || !update.data) throw new Error("This post changed or is already being sent. Refresh its status.");
      return socialJson({ status });
    }
    return socialJson({ error: "Unknown action." }, 400);
  } catch (error) { return socialJson({ error: error instanceof Error ? error.message : "Social action failed." }, 409); }
}
