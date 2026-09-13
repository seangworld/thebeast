import { NextResponse } from "next/server";
import { canTransitionKdpPublication, type KdpPublicationBrief, type KdpPublicationState } from "@/lib/kdpPublishingFactory";
import { kdpChapterDraftSchema, kdpChapterInstructions, parseKdpChapterDraft, type KdpManuscriptProviderPayload } from "@/lib/kdpManuscript";
import { requestOpenAIResponse } from "@/lib/digitalStaffRuntime/provider";
import { DigitalStaffServiceError } from "@/lib/digitalStaffRuntime/security";
import { OPENAI_BILLING_ACTION } from "@/lib/ownerProviderActions";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
const clean = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

async function owner() {
  const client = createRouteClient(); const auth = await client.auth.getUser();
  if (!auth.data.user || auth.error) return null;
  const profile = await client.from("profiles").select("role").eq("id", auth.data.user.id).maybeSingle();
  return !profile.error && profile.data?.role === "admin" ? { client, id: auth.data.user.id } : null;
}

async function publication(access: NonNullable<Awaited<ReturnType<typeof owner>>>, id: string) {
  return access.client.from("kdp_publications").select("id,title,audience,topic,state,brief,package_evidence").eq("id", id).eq("owner_id", access.id).maybeSingle();
}

export async function GET(request: Request) {
  const access = await owner(); if (!access) return reply({ error: "KDP factory owner access required." }, 403);
  const id = clean(new URL(request.url).searchParams.get("publicationId"), 80);
  const pub = await publication(access, id); if (pub.error || !pub.data) return reply({ error: "Publication candidate was not found." }, 404);
  const chapters = await access.client.from("kdp_chapters").select("*").eq("publication_id", id).eq("owner_id", access.id).order("chapter_number");
  if (chapters.error) return reply({ error: "The manuscript pipeline is unavailable until its migration is applied." }, 503);
  return reply({ chapters: chapters.data || [], publicationState: pub.data.state });
}

export async function POST(request: Request) {
  const access = await owner(); if (!access) return reply({ error: "KDP factory owner access required." }, 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = clean(body?.publicationId, 80), action = clean(body?.action, 40);
  const pub = await publication(access, id); if (pub.error || !pub.data) return reply({ error: "Publication candidate was not found." }, 404);

  if (action === "initialize") {
    if (!canTransitionKdpPublication(pub.data.state as KdpPublicationState, "drafting")) return reply({ error: `${pub.data.state} cannot start drafting.` }, 409);
    const brief = pub.data.brief as KdpPublicationBrief; if (!Array.isArray(brief?.chapters) || !brief.chapters.length) return reply({ error: "An approved structured brief is required." }, 409);
    const rows = brief.chapters.map((title, index) => ({ publication_id: id, owner_id: access.id, chapter_number: index + 1, title: clean(title, 180), status: "planned" }));
    const created = await access.client.from("kdp_chapters").upsert(rows, { onConflict: "publication_id,chapter_number", ignoreDuplicates: true });
    if (created.error) return reply({ error: "Chapter plan could not be confirmed as saved." }, 503);
    const advanced = await access.client.from("kdp_publications").update({ state: "drafting", updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", access.id);
    if (advanced.error) return reply({ error: "Drafting state could not be confirmed as saved." }, 503);
    return reply({ publicationState: "drafting", chapterCount: rows.length });
  }

  if (action === "generate_next") {
    if (pub.data.state !== "drafting") return reply({ error: "The publication must be in drafting." }, 409);
    if (!process.env.OPENAI_API_KEY) return reply({ error: "KDP manuscript generation is not configured in this environment." }, 503);
    const chapters = await access.client.from("kdp_chapters").select("id,chapter_number,title,status").eq("publication_id", id).eq("owner_id", access.id).order("chapter_number");
    const waiting = (chapters.data || []).filter((item) => item.status === "planned" || item.status === "blocked");
    const chapter = waiting[0];
    if (!chapter) return reply({ error: "No chapter is waiting for generation." }, 409);
    const claimed = await access.client.from("kdp_chapters").update({ status: "generating", updated_at: new Date().toISOString() }).eq("id", chapter.id).eq("owner_id", access.id).in("status", ["planned", "blocked"]).select("id").maybeSingle();
    if (claimed.error || !claimed.data) return reply({ error: "Another generation request already claimed this chapter. Refresh the chapter list before retrying." }, 409);
    try {
      const model = process.env.OPENAI_KDP_MODEL || "gpt-5";
      const payload = await requestOpenAIResponse<KdpManuscriptProviderPayload>({ model, store: false, instructions: kdpChapterInstructions(), input: JSON.stringify({ publication: { title: pub.data.title, audience: pub.data.audience, topic: pub.data.topic, brief: pub.data.brief }, chapter, task: "Create the complete review draft and attributable source notes for this chapter." }), tools: [{ type: "web_search", search_context_size: "high" }], tool_choice: "required", include: ["web_search_call.action.sources"], text: { format: { type: "json_schema", name: "kdp_chapter_draft", strict: true, schema: kdpChapterDraftSchema } } });
      const draft = parseKdpChapterDraft(payload); const wordCount = draft.draftText.split(/\s+/).length;
      const saved = await access.client.from("kdp_chapters").update({ status: "review_ready", draft_text: draft.draftText, word_count: wordCount, source_notes: draft.sources, limitations: draft.limitations, provider_model: model, generated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", chapter.id).eq("owner_id", access.id).select("*").single();
      if (saved.error || !saved.data) return reply({ error: "Generated chapter could not be confirmed as saved." }, 503);
      return reply({ chapter: saved.data, remainingCount: waiting.length - 1, manuscriptAuthority: "review_draft_only" });
    } catch (error) {
      await access.client.from("kdp_chapters").update({ status: "blocked", updated_at: new Date().toISOString() }).eq("id", chapter.id).eq("owner_id", access.id);
      if (error instanceof DigitalStaffServiceError && error.category === "provider_quota_exhausted") {
        return reply({ error: "OpenAI API credit is required before BeastAdmin can generate this chapter. Nothing is processing in the background.", code: "ai_credit_unavailable", requestId: error.requestId, ownerAction: OPENAI_BILLING_ACTION }, 503);
      }
      return reply({ error: "Chapter generation failed safely. No uncited draft was accepted." }, 502);
    }
  }
  return reply({ error: "Unsupported manuscript action." }, 400);
}

export async function PATCH(request: Request) {
  const access = await owner(); if (!access) return reply({ error: "KDP factory owner access required." }, 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const chapterId = clean(body?.chapterId, 80), action = clean(body?.action, 40);
  const current = await access.client.from("kdp_chapters").select("id,publication_id,status").eq("id", chapterId).eq("owner_id", access.id).maybeSingle();
  if (current.error || !current.data) return reply({ error: "Chapter was not found." }, 404);
  if (action !== "approve" || current.data.status !== "review_ready") return reply({ error: "Only a review-ready chapter can be approved." }, 409);
  const saved = await access.client.from("kdp_chapters").update({ status: "approved", reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", chapterId).eq("owner_id", access.id).select("*").single();
  if (saved.error || !saved.data) return reply({ error: "Chapter approval could not be confirmed as saved." }, 503);
  const remaining = await access.client.from("kdp_chapters").select("id", { count: "exact", head: true }).eq("publication_id", current.data.publication_id).eq("owner_id", access.id).neq("status", "approved");
  if (remaining.error) return reply({ error: "Chapter approval was saved, but manuscript completeness is unavailable." }, 503);
  if ((remaining.count || 0) === 0) {
    const pub = await publication(access, current.data.publication_id); const evidence = { ...((pub.data?.package_evidence || {}) as Record<string, boolean>), manuscript: true };
    await access.client.from("kdp_publications").update({ state: "quality_review", package_evidence: evidence, updated_at: new Date().toISOString() }).eq("id", current.data.publication_id).eq("owner_id", access.id);
  }
  return reply({ chapter: saved.data, manuscriptComplete: (remaining.count || 0) === 0 });
}
