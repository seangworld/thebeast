import { verifyCronAuthorization } from "@/lib/standingObservation";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { publishSocialPost } from "@/lib/server/social/publish";
import { socialJson } from "@/lib/server/social/auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!verifyCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)) return socialJson({ error: "Not authorized." }, 401);
  const db = createBeastFusionPublicationClient();
  // A timed-out write is ambiguous, not permission to publish a duplicate.
  const stale = await db.from("beast_marketing_social_posts").update({ status: "unconfirmed", last_error: "Publishing was interrupted. Inspect the social account; this post will not retry automatically." }).eq("status", "publishing").lt("updated_at", new Date(Date.now() - 5 * 60_000).toISOString());
  if (stale.error) return socialJson({ error: "Queue recovery unavailable." }, 503);
  const controls = await db.from("beast_marketing_social_controls").select("owner_id").eq("paused", false).limit(20);
  if (controls.error) return socialJson({ error: "Publishing controls unavailable." }, 503);
  if (!controls.data?.length) return socialJson({ status: "paused" });
  const due = await db.from("beast_marketing_social_posts").select("id,owner_id").in("owner_id", controls.data.map(c => c.owner_id)).in("status", ["scheduled", "processing"]).lte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(1);
  if (due.error) return socialJson({ error: "Queue unavailable." }, 503);
  if (!due.data?.length) return socialJson({ status: "idle" });
  try { return socialJson(await publishSocialPost(due.data[0].owner_id, due.data[0].id)); }
  catch (error) {
    // Surface a preflight blocker once instead of allowing it to starve the queue.
    await db.from("beast_marketing_social_posts").update({ status: "failed", last_error: error instanceof Error ? error.message : "Publishing prerequisites unavailable." }).eq("id", due.data[0].id).eq("owner_id", due.data[0].owner_id).in("status", ["scheduled", "processing"]);
    return socialJson({ status: "blocked" });
  }
}
