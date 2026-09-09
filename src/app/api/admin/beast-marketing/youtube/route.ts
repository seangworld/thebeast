import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { youtubeConfiguration, YOUTUBE_CALLBACK } from "@/lib/server/directYouTube";
import { youtubeJson, youtubeOwner } from "./owner";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const owner = await youtubeOwner();
  if (!owner) return youtubeJson({ error: "Owner access required." }, 403);
  const config = youtubeConfiguration(process.env);
  const service = createBeastFusionPublicationClient();
  const [connection, uploads, jobs] = await Promise.all([
    service.from("beast_marketing_youtube_connections").select("channel_id,channel_title,channel_handle,connected_at").eq("owner_id", owner.user.id).maybeSingle(),
    service.from("beast_marketing_youtube_uploads").select("id,asset_id,status,video_id,created_at").eq("owner_id", owner.user.id).order("created_at", { ascending: false }).limit(20),
    owner.client.from("beast_marketing_video_jobs").select("id,quality").eq("owner_id", owner.user.id).eq("state", "ready").limit(100),
  ]);
  if (connection.error || uploads.error || jobs.error) return youtubeJson({ error: "YouTube connection records are unavailable." }, 503);
  const approvedIds = (jobs.data || []).filter((job) => job.quality?.ownerWorkflowDecision === "approved" && job.quality?.ownerApprovalSource === "manual").map((job) => job.id);
  const assets = approvedIds.length ? await owner.client.from("beast_marketing_video_assets").select("id,job_id,size_bytes,duration_ms").eq("owner_id", owner.user.id).eq("role", "final_video").eq("status", "available").in("job_id", approvedIds).limit(100) : { data: [], error: null };
  if (assets.error) return youtubeJson({ error: "Reviewed video assets are unavailable." }, 503);
  return youtubeJson({ configured: config.configured, missing: config.missing, redirectUri: YOUTUBE_CALLBACK, connection: connection.data, uploads: uploads.data, assets: assets.data, publicPublishing: false, automaticPublishing: false });
}
export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== "https://thebeast.seangworld.com") return youtubeJson({ error: "Use the live owner workspace." }, 403);
  const owner = await youtubeOwner();
  if (!owner) return youtubeJson({ error: "Owner access required." }, 403);
  const removed = await createBeastFusionPublicationClient().from("beast_marketing_youtube_connections").delete().eq("owner_id", owner.user.id);
  return removed.error ? youtubeJson({ error: "Disconnect could not be confirmed." }, 503) : youtubeJson({ disconnected: true, note: "Beast credentials removed. Existing uploads remain on YouTube; Google account access can also be revoked in Google settings." });
}
