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
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - 5 * 60_000).toISOString();
  // Preserve minute-resolution publishing. An idle tick needs one bounded read,
  // not a no-op recovery UPDATE and a controls scan. No provider calls here.
  const candidates = await db.from("beast_marketing_social_posts").select("id")
    .or(`and(status.in.(scheduled,processing),scheduled_at.lte.${now}),and(status.eq.publishing,updated_at.lt.${staleBefore})`)
    .limit(1);
  if (candidates.error) return socialJson({ error: "Queue unavailable." }, 503);
  if (!candidates.data?.length) return socialJson({ status: "idle" });
  const stale = await db.from("beast_marketing_social_posts").select("id").eq("status", "publishing").lt("updated_at", staleBefore).limit(20);
  if (stale.error) return socialJson({ error: "Queue recovery unavailable." }, 503);
  if (stale.data?.length) {
    // Only observed stale claims are recovered. A concurrent fresh claim is safe.
    const recovered = await db.from("beast_marketing_social_posts").update({ status: "unconfirmed", last_error: "Publishing was interrupted. Inspect the social account; this post will not retry automatically." })
      .in("id", stale.data.map(post => post.id)).eq("status", "publishing").lt("updated_at", staleBefore);
    if (recovered.error) return socialJson({ error: "Queue recovery unavailable." }, 503);
  }
  // Query enabled owners and their due jobs independently of the preflight
  // row, so old paused-owner work cannot starve an authorized scheduled post.
  const controls = await db.from("beast_marketing_social_controls").select("owner_id").eq("paused", false).limit(20);
  if (controls.error) return socialJson({ error: "Publishing controls unavailable." }, 503);
  if (!controls.data?.length) return socialJson({ status: "paused" });
  const due = await db.from("beast_marketing_social_posts").select("id,owner_id")
    .in("owner_id", controls.data.map(control => control.owner_id)).in("status", ["scheduled", "processing"])
    .lte("scheduled_at", now).order("scheduled_at").limit(1);
  if (due.error) return socialJson({ error: "Queue unavailable." }, 503);
  const next = due.data?.[0];
  if (!next) return socialJson({ status: "idle" });
  // Existing publisher rechecks role, approval/revision, pause, connection and CAS
  // before any external write. A timer/eligibility row is never authorization.
  try { return socialJson(await publishSocialPost(next.owner_id, next.id)); }
  catch (error) {
    await db.from("beast_marketing_social_posts").update({ status: "failed", last_error: error instanceof Error ? error.message : "Publishing prerequisites unavailable." })
      .eq("id", next.id).eq("owner_id", next.owner_id).in("status", ["scheduled", "processing"]);
    return socialJson({ status: "blocked" });
  }
}
