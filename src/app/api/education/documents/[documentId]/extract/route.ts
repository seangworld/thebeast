import { NextResponse } from "next/server";
import {
  educationDocumentExtractionVersion,
  extractEducationDocumentProposals,
  fingerprintEducationDocument,
} from "@/lib/education/documentExtraction";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const maximumTextLength = 250_000;
type RouteContext = { params: { documentId: string } };

export async function POST(request: Request, context: RouteContext) {
  const supabase = createRouteClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { consent?: unknown; text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (body?.consent !== true) {
    return NextResponse.json({ error: "Explicit document extraction permission is required." }, { status: 400 });
  }
  if (!text || text.length > maximumTextLength) {
    return NextResponse.json({ error: `Document text must be between 1 and ${maximumTextLength.toLocaleString()} characters.` }, { status: 400 });
  }
  const { data: document, error: documentError } = await supabase
    .from("beast_documents")
    .select("id, owner_id, title, category, status")
    .eq("id", context.params.documentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (documentError || !document || ["Archived", "Deleted"].includes(document.status)) {
    return NextResponse.json({ error: "Education document not found." }, { status: 404 });
  }

  const contentFingerprint = fingerprintEducationDocument(new TextEncoder().encode(text));
  const { data: remembered } = await supabase
    .from("education_career_document_extractions")
    .select("id, status")
    .eq("owner_id", user.id)
    .eq("document_id", document.id)
    .eq("content_fingerprint", contentFingerprint)
    .eq("extraction_version", educationDocumentExtractionVersion)
    .maybeSingle();
  if (remembered) {
    return NextResponse.json({ extractionId: remembered.id, status: remembered.status, reused: true });
  }

  const parsed = extractEducationDocumentProposals(text);
  const { data: extraction, error: extractionError } = await supabase
    .from("education_career_document_extractions")
    .insert({
      owner_id: user.id,
      document_id: document.id,
      content_fingerprint: contentFingerprint,
      extraction_version: educationDocumentExtractionVersion,
      status: "ready",
      summary: parsed.summary,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (extractionError || !extraction) {
    const { data: raced } = await supabase
      .from("education_career_document_extractions")
      .select("id, status")
      .eq("owner_id", user.id)
      .eq("document_id", document.id)
      .eq("content_fingerprint", contentFingerprint)
      .eq("extraction_version", educationDocumentExtractionVersion)
      .maybeSingle();
    if (raced) return NextResponse.json({ extractionId: raced.id, status: raced.status, reused: true });
    return NextResponse.json({ error: "Extraction results could not be saved." }, { status: 503 });
  }

  if (parsed.items.length) {
    const { error: itemError } = await supabase.from("education_career_document_extraction_items").insert(
      parsed.items.map((item) => ({
        owner_id: user.id,
        extraction_id: extraction.id,
        phase: item.phase,
        category: item.category,
        label: item.label,
        value: item.value,
        occurred_on: item.occurredOn,
        source_excerpt: item.sourceExcerpt,
        confidence: item.confidence,
      }))
    );
    if (itemError) {
      await supabase.from("education_career_document_extractions").update({
        status: "failed",
        error_message: "Extraction proposals could not be saved. No profile records were created.",
      }).eq("id", extraction.id).eq("owner_id", user.id);
      return NextResponse.json({ error: "Extraction proposals could not be saved." }, { status: 503 });
    }
  }
  return NextResponse.json({ extractionId: extraction.id, status: "ready", reused: false, proposedItemCount: parsed.items.length });
}
