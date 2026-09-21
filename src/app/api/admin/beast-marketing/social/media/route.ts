import { randomUUID } from "node:crypto";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { socialOwner, socialJson } from "@/lib/server/social/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const owner = await socialOwner(request);
  if (!owner) return socialJson({ error: "Owner access required." }, 403);
  const body = await request.json().catch(() => null);
  const types: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "video/mp4": "mp4" };
  if (!types[body?.type] || !Number.isSafeInteger(body?.size) || body.size < 1 || body.size > 50 * 1024 * 1024) return socialJson({ error: "Choose a JPEG, PNG, or MP4 up to 50 MB." }, 400);
  const path = `${owner.id}/${randomUUID()}.${types[body.type]}`;
  const bucket = createBeastFusionPublicationClient().storage.from("beast-marketing-social");
  const signed = await bucket.createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data) return socialJson({ error: "Media upload is unavailable." }, 503);
  return socialJson({ uploadUrl: signed.data.signedUrl, publicUrl: bucket.getPublicUrl(path).data.publicUrl });
}
