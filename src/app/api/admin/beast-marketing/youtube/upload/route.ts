import { createHash } from "node:crypto";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { decryptGoogleRefreshToken } from "@/lib/server/googleOAuth";
import { privateYouTubeMetadata, uploadPrivateYouTubeVideo, verifySeangworldChannel, youtubeToken, YOUTUBE_MAX_BYTES } from "@/lib/server/directYouTube";
import { youtubeJson, youtubeOwner } from "../owner";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const startedAt = Date.now();
  if (request.headers.get("origin") !== "https://thebeast.seangworld.com") return youtubeJson({ error: "Use the live owner workspace." }, 403);
  const owner = await youtubeOwner();
  if (!owner) return youtubeJson({ error: "Owner access required." }, 403);
  const body = await request.json().catch(() => null);
  if (!/^[0-9a-f-]{36}$/.test(body?.assetId || "") || body?.confirmPrivateUpload !== true) return youtubeJson({ error: "Select a reviewed asset and confirm its private transfer to YouTube." }, 400);
  let metadata: ReturnType<typeof privateYouTubeMetadata>;
  try { metadata = privateYouTubeMetadata(body.title, body.description, body.madeForKids, body.containsSyntheticMedia); }
  catch { return youtubeJson({ error: "Enter a valid title, description, audience and synthetic-content disclosure." }, 400); }
  const service = createBeastFusionPublicationClient();
  let claimId: string | null = null;
  try {
    const [connection, asset, prior, controls] = await Promise.all([
      service.from("beast_marketing_youtube_connections").select("*").eq("owner_id", owner.user.id).maybeSingle(),
      owner.client.from("beast_marketing_video_assets").select("*").eq("owner_id", owner.user.id).eq("id", body.assetId).maybeSingle(),
      service.from("beast_marketing_youtube_uploads").select("id,status,video_id").eq("owner_id", owner.user.id).eq("asset_id", body.assetId).maybeSingle(),
      owner.client.from("beast_marketing_video_controls").select("pause_all_publishing").eq("owner_id", owner.user.id).maybeSingle(),
    ]);
    if (connection.error || asset.error || prior.error || controls.error) throw new Error("read_failed");
    if (prior.data) return youtubeJson({ upload: prior.data, reused: true, note: "Existing attempt retained. Unconfirmed attempts require inspection in YouTube Studio; no duplicate transfer is started." });
    if (!connection.data) return youtubeJson({ error: "Connect SEANGWORLD directly to Beast first." }, 409);
    if (controls.data?.pause_all_publishing !== false) return youtubeJson({ error: "Global publishing pause is active. Release it in Video Growth before a private upload." }, 409);
    const media = asset.data;
    if (!media || media.role !== "final_video" || media.status !== "available" || media.mime_type !== "video/mp4" || !Number.isSafeInteger(media.size_bytes) || media.size_bytes < 12 || media.size_bytes > YOUTUBE_MAX_BYTES
      || !media.storage_path.startsWith(`${owner.user.id}/`) || media.storage_path.includes("..") || !/^[a-f0-9]{64}$/.test(media.content_hash) || !media.license_reference || media.provenance?.publicationWatermarkEligible !== true) return youtubeJson({ error: "Select an available, licensed production MP4 of at most 32 MiB." }, 409);
    const job = await owner.client.from("beast_marketing_video_jobs").select("id,state,revision,quality,production").eq("owner_id", owner.user.id).eq("id", media.job_id).maybeSingle();
    const manifest = job.data?.production?.manifest;
    if (job.error || job.data?.state !== "ready" || job.data.quality?.renderReady !== true || job.data.quality?.ownerWorkflowDecision !== "approved" || job.data.quality?.ownerApprovalSource !== "manual"
      || !manifest || manifest.jobId !== job.data.id || manifest.revision !== job.data.revision || manifest.checksum !== media.provenance?.manifestChecksum || manifest.aspectRatio !== "9:16"
      || !Number.isInteger(media.duration_ms) || media.duration_ms < 60_000 || media.duration_ms > 180_000 || manifest.runtimeMs !== media.duration_ms) return youtubeJson({ error: "A current, manually approved vertical render between one and three minutes is required." }, 409);
    const download = await owner.client.storage.from("beast-marketing-media").download(media.storage_path);
    if (download.error || !download.data || download.data.size !== media.size_bytes) throw new Error("media_unavailable");
    const bytes = Buffer.from(await download.data.arrayBuffer());
    if (bytes.subarray(4, 8).toString("ascii") !== "ftyp" || createHash("sha256").update(bytes).digest("hex") !== media.content_hash) throw new Error("media_integrity_failed");
    const token = await youtubeToken({ grant_type: "refresh_token", refresh_token: decryptGoogleRefreshToken(connection.data, process.env) }, process.env);
    const channel = await verifySeangworldChannel(token.access_token);
    if (channel.id !== connection.data.channel_id) throw new Error("channel_changed");
    // Recheck revocation, pause and revision after provider reads, immediately before claiming.
    const [stillConnected, stillEnabled, currentJob, currentAsset] = await Promise.all([
      service.from("beast_marketing_youtube_connections").select("connected_at,channel_id").eq("owner_id", owner.user.id).maybeSingle(),
      owner.client.from("beast_marketing_video_controls").select("pause_all_publishing").eq("owner_id", owner.user.id).maybeSingle(),
      owner.client.from("beast_marketing_video_jobs").select("state,revision,quality,production").eq("owner_id", owner.user.id).eq("id", media.job_id).maybeSingle(),
      owner.client.from("beast_marketing_video_assets").select("status,content_hash,provenance").eq("owner_id", owner.user.id).eq("id", media.id).maybeSingle(),
    ]);
    if (stillConnected.error || stillEnabled.error || currentJob.error || currentAsset.error || stillConnected.data?.connected_at !== connection.data.connected_at || stillConnected.data?.channel_id !== channel.id || stillEnabled.data?.pause_all_publishing !== false
      || currentJob.data?.state !== "ready" || currentJob.data.revision !== job.data.revision || currentJob.data.quality?.ownerWorkflowDecision !== "approved" || currentJob.data.quality?.ownerApprovalSource !== "manual" || currentJob.data.quality?.renderReady !== true
      || JSON.stringify(currentJob.data.production?.manifest) !== JSON.stringify(manifest) || currentAsset.data?.status !== "available" || currentAsset.data.content_hash !== media.content_hash || currentAsset.data.provenance?.publicationWatermarkEligible !== true || currentAsset.data.provenance?.manifestChecksum !== manifest.checksum) throw new Error("authority_changed");
    if (Date.now() - startedAt > 20_000) throw new Error("preflight_budget_exceeded");
    const claim = await service.from("beast_marketing_youtube_uploads").insert({ owner_id: owner.user.id, asset_id: media.id, channel_id: channel.id, content_hash: media.content_hash, metadata, status: "started" }).select("id").single();
    if (claim.error?.code === "23505") return youtubeJson({ error: "This asset already has an upload attempt. Refresh its history." }, 409);
    if (claim.error || !claim.data) throw new Error("claim_failed");
    claimId = claim.data.id;
    const videoId = await uploadPrivateYouTubeVideo(token.access_token, new Blob([bytes], { type: "video/mp4" }), metadata);
    const saved = await service.from("beast_marketing_youtube_uploads").update({ status: "uploaded_private", video_id: videoId, completed_at: new Date().toISOString() }).eq("owner_id", owner.user.id).eq("id", claimId);
    if (saved.error) throw new Error("receipt_unconfirmed");
    return youtubeJson({ status: "uploaded_private", videoId, publicPublishing: false });
  } catch {
    if (claimId) await service.from("beast_marketing_youtube_uploads").update({ status: "unconfirmed" }).eq("owner_id", owner.user.id).eq("id", claimId);
    return youtubeJson({ error: claimId ? "Upload completion is unconfirmed. Inspect YouTube Studio before any further action; this asset will not be uploaded twice automatically." : "Upload prerequisites could not be verified. No upload was started." }, 503);
  }
}
