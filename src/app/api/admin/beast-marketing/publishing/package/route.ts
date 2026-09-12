import { NextResponse } from "next/server";
import { buildKdpPackage, type KdpPackageInput } from "@/lib/kdpPackage";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
const clean = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

async function owner() {
  const client = createRouteClient();
  const auth = await client.auth.getUser();
  if (!auth.data.user || auth.error) return null;
  const profile = await client.from("profiles").select("role").eq("id", auth.data.user.id).maybeSingle();
  return !profile.error && profile.data?.role === "admin" ? { client, id: auth.data.user.id } : null;
}

export async function POST(request: Request) {
  const access = await owner();
  if (!access) return json({ error: "KDP factory owner access required." }, 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const publicationId = clean(body?.publicationId, 80);
  const publication = await access.client.from("kdp_publications").select("id,title,audience,topic,formats,state,brief,package_evidence").eq("id", publicationId).eq("owner_id", access.id).maybeSingle();
  if (publication.error || !publication.data) return json({ error: "Publication candidate was not found." }, 404);
  if (!["quality_review", "package_ready", "owner_approved"].includes(publication.data.state)) return json({ error: "All chapters must be approved before an interior package can be built." }, 409);
  const chapters = await access.client.from("kdp_chapters").select("chapter_number,title,draft_text,source_notes,status").eq("publication_id", publicationId).eq("owner_id", access.id).order("chapter_number");
  if (chapters.error || !chapters.data?.length) return json({ error: "Approved chapters could not be loaded." }, 503);
  if (chapters.data.some((chapter) => chapter.status !== "approved" || !chapter.draft_text)) return json({ error: "Every chapter must be approved and complete before package construction." }, 409);
  const input: KdpPackageInput = {
    publicationId: publication.data.id,
    title: publication.data.title,
    audience: publication.data.audience,
    topic: publication.data.topic,
    brief: publication.data.brief && typeof publication.data.brief === "object" ? publication.data.brief as KdpPackageInput["brief"] : undefined,
    formats: Array.isArray(publication.data.formats) ? publication.data.formats : [],
    chapters: chapters.data.map((chapter) => ({ chapterNumber: chapter.chapter_number, title: chapter.title, draftText: chapter.draft_text, sources: Array.isArray(chapter.source_notes) ? chapter.source_notes : [] })),
  };
  try {
    const built = await buildKdpPackage(input);
    const evidence = { ...((publication.data.package_evidence || {}) as Record<string, boolean>), manuscript: true, interior: true };
    const saved = await access.client.from("kdp_publications").update({ package_evidence: evidence, updated_at: new Date().toISOString() }).eq("id", publicationId).eq("owner_id", access.id).select("id").maybeSingle();
    if (saved.error || !saved.data) return json({ error: "The interior files passed validation, but package evidence could not be confirmed as saved." }, 503);
    return new NextResponse(Buffer.from(built.bytes), { status: 200, headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${built.fileName}"`, "cache-control": "private, no-store", "x-kdp-package-authority": "owner-review-only" } });
  } catch {
    return json({ error: "KDP interior construction failed validation. No package evidence was recorded." }, 500);
  }
}
