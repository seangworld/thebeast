import { NextResponse } from "next/server";
import {
  extractHealthDocumentProposals,
  fingerprintHealthDocument,
  healthDocumentExtractionVersion,
} from "@/lib/health/documentExtraction";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const maximumTextLength = 250_000;
type RouteContext = { params: Promise<{ documentId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const supabase = createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { consent?: unknown; text?: unknown }
    | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (body?.consent !== true) {
    return NextResponse.json(
      { error: "Explicit document extraction permission is required." },
      { status: 400 }
    );
  }
  if (!text || text.length > maximumTextLength) {
    return NextResponse.json(
      { error: `Document text must be between 1 and ${maximumTextLength.toLocaleString()} characters.` },
      { status: 400 }
    );
  }

  const [{ data: profile }, { data: document, error: documentError }] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase
        .from("beast_documents")
        .select("id, owner_id, title, category, status")
        .eq("id", documentId)
        .eq("owner_id", user.id)
        .eq("category", "Health")
        .maybeSingle(),
    ]);
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }
  if (documentError || !document || ["Archived", "Deleted"].includes(document.status)) {
    return NextResponse.json({ error: "Health document not found." }, { status: 404 });
  }

  const contentFingerprint = fingerprintHealthDocument(new TextEncoder().encode(text));
  const { data: remembered } = await supabase
    .from("beast_health_document_extractions")
    .select("id, status")
    .eq("owner_id", user.id)
    .eq("document_id", document.id)
    .eq("content_fingerprint", contentFingerprint)
    .eq("extraction_version", healthDocumentExtractionVersion)
    .maybeSingle();
  if (remembered) {
    return NextResponse.json({
      extractionId: remembered.id,
      status: remembered.status,
      reused: true,
    });
  }

  const parsed = extractHealthDocumentProposals(text);
  const { data: extraction, error: extractionError } = await supabase
    .from("beast_health_document_extractions")
    .insert({
      owner_id: user.id,
      document_id: document.id,
      content_fingerprint: contentFingerprint,
      extraction_version: healthDocumentExtractionVersion,
      status: "ready",
      summary: parsed.summary,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (extractionError || !extraction) {
    const { data: raced } = await supabase
      .from("beast_health_document_extractions")
      .select("id, status")
      .eq("owner_id", user.id)
      .eq("document_id", document.id)
      .eq("content_fingerprint", contentFingerprint)
      .eq("extraction_version", healthDocumentExtractionVersion)
      .maybeSingle();
    if (raced) {
      return NextResponse.json({ extractionId: raced.id, status: raced.status, reused: true });
    }
    return NextResponse.json({ error: "Extraction results could not be saved." }, { status: 503 });
  }

  if (parsed.items.length) {
    const { error: itemError } = await supabase
      .from("beast_health_document_extraction_items")
      .insert(
        parsed.items.map((item) => ({
          owner_id: user.id,
          extraction_id: extraction.id,
          category: item.category,
          label: item.label,
          value: item.value,
          occurred_on: item.occurredOn,
          source_excerpt: item.sourceExcerpt,
          confidence: item.confidence,
        }))
      );
    if (itemError) {
      await supabase
        .from("beast_health_document_extractions")
        .update({
          status: "failed",
          error_message: "Extraction proposals could not be saved. No health records were created.",
        })
        .eq("id", extraction.id)
        .eq("owner_id", user.id);
      return NextResponse.json({ error: "Extraction proposals could not be saved." }, { status: 503 });
    }
  }

  return NextResponse.json({ extractionId: extraction.id, status: "ready", reused: false });
}
