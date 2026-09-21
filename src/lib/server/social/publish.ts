import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { validateDirectPost, validateSocialContent, type SocialPost } from "@/lib/marketingSocial";
import { unseal, seal } from "./auth";
import { createSocialPublication, metaRequest, ProviderFailure, xToken } from "./providers";

export async function publishSocialPost(ownerId: string, id: string) {
  const db = createBeastFusionPublicationClient();
  const now = new Date().toISOString();
  const [profile, controls, read] = await Promise.all([
    db.from("profiles").select("role").eq("id", ownerId).maybeSingle(),
    db.from("beast_marketing_social_controls").select("paused,x_paid_enabled").eq("owner_id", ownerId).maybeSingle(),
    db.from("beast_marketing_social_posts").select("*").eq("owner_id", ownerId).eq("id", id).maybeSingle(),
  ]);
  if (profile.error || controls.error || read.error) throw new Error("Publishing prerequisites are unavailable.");
  if (profile.data?.role !== "admin" || controls.data?.paused !== false) throw new Error("Publishing is paused.");
  const post = read.data as SocialPost & { approved_revision: number; provider_container_id: string | null };
  if (!post || !["scheduled", "processing"].includes(post.status) || post.approved_revision !== post.revision || !post.scheduled_at || post.scheduled_at > now) return { status: post?.status || "unavailable" };
  if (post.channel === "x" && !controls.data.x_paid_enabled) throw new Error("Paid X API posting is off. Use manual sharing or enable it in Accounts.");
  validateSocialContent(post.content, post.channel, process.env.NEXT_PUBLIC_SUPABASE_URL);
  validateDirectPost(post.content, post.channel);
  const connection = await db.from("beast_marketing_social_connections").select("*").eq("owner_id", ownerId).eq("id", post.connection_id).eq("channel", post.channel).is("disconnected_at", null).maybeSingle();
  if (connection.error || !connection.data) throw new Error("Reconnect the account before publishing.");
  // The compare-and-set claim prevents cron, repeated clicks and concurrent workers
  // from issuing the same external write. Stale claims are never retried automatically.
  const claim = await db.from("beast_marketing_social_posts").update({ status: "publishing", updated_at: now, last_error: null }).eq("owner_id", ownerId).eq("id", id).eq("status", post.status).eq("revision", post.revision).eq("approved_revision", post.revision).select("id").maybeSingle();
  if (claim.error) throw new Error("Could not claim this post.");
  if (!claim.data) return { status: "already_claimed" };
  let writeStarted = false;
  try {
    let credentials = unseal(connection.data.credentials, ownerId);
    if (connection.data.expires_at && Date.parse(connection.data.expires_at) <= Date.now() + 60_000) {
      if (post.channel !== "x" || !credentials.refresh_token) throw new Error("Account authorization expired. Reconnect it.");
      const fresh = await xToken({ grant_type: "refresh_token", refresh_token: credentials.refresh_token });
      credentials = { ...fresh, refresh_token: fresh.refresh_token || credentials.refresh_token };
      const saved = await db.from("beast_marketing_social_connections").update({ credentials: seal(credentials, ownerId), expires_at: new Date(Date.now() + (fresh.expires_in || 7200) * 1000).toISOString() }).eq("owner_id", ownerId).eq("id", connection.data.id).eq("connected_at", connection.data.connected_at).select("id").maybeSingle();
      if (saved.error || !saved.data) throw new Error("The refreshed account could not be saved. Reconnect it.");
    }
    // Check pause, account replacement/revocation, and owner role immediately before sending.
    const [control, active, role] = await Promise.all([
      db.from("beast_marketing_social_controls").select("paused,x_paid_enabled").eq("owner_id", ownerId).maybeSingle(),
      db.from("beast_marketing_social_connections").select("connected_at").is("disconnected_at", null).eq("id", connection.data.id).eq("owner_id", ownerId).maybeSingle(),
      db.from("profiles").select("role").eq("id", ownerId).maybeSingle(),
    ]);
    if (control.error || active.error || role.error || role.data?.role !== "admin" || control.data?.paused !== false || (post.channel === "x" && !control.data.x_paid_enabled) || active.data?.connected_at !== connection.data.connected_at) throw new Error("Publishing was paused or account access changed.");
    if (post.provider_container_id) {
      const status = await metaRequest(post.provider_container_id, credentials.access_token, { fields: "status_code" });
      if (status.status_code === "IN_PROGRESS") {
        const saved = await db.from("beast_marketing_social_posts").update({ status: "processing", scheduled_at: new Date(Date.now() + 60_000).toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", ownerId);
        if (saved.error) throw new Error("Could not save media processing status.");
        return { status: "processing" };
      }
      if (status.status_code !== "FINISHED") throw new Error("Instagram did not finish this media. Check its format and create a new draft.");
      writeStarted = true;
      const published = await metaRequest(`${connection.data.account_id}/media_publish`, credentials.access_token, { creation_id: post.provider_container_id }, true);
      if (!/^\d+$/.test(published.id || "")) throw new ProviderFailure("Instagram publication is unconfirmed.", true);
      const saved = await db.from("beast_marketing_social_posts").update({ status: "published", provider_post_id: published.id, published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", ownerId);
      if (saved.error) throw new ProviderFailure("Publication receipt could not be saved. Check Instagram.", true);
      return { status: "published" };
    }
    writeStarted = true;
    const result = await createSocialPublication(post, connection.data.account_id, credentials.access_token);
    const saved = await db.from("beast_marketing_social_posts").update({ status: result.containerId ? "processing" : "published", provider_container_id: result.containerId || null, provider_post_id: result.postId || null, published_at: result.postId ? new Date().toISOString() : null, scheduled_at: result.containerId ? new Date(Date.now() + 60_000).toISOString() : post.scheduled_at, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", ownerId);
    if (saved.error) throw new ProviderFailure("Publication receipt could not be saved. Inspect the social account.", true);
    return { status: result.containerId ? "processing" : "published" };
  } catch (error) {
    const uncertain = writeStarted && (!(error instanceof ProviderFailure) || error.uncertain);
    const message = error instanceof Error ? error.message : "Publication could not be completed.";
    await db.from("beast_marketing_social_posts").update({ status: uncertain ? "unconfirmed" : "failed", last_error: message, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", ownerId);
    return { status: uncertain ? "unconfirmed" : "failed", error: message };
  }
}
