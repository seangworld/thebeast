import { NextResponse } from "next/server";
import {
  createOpenAIRequestHeaders,
  digitalStaffEvaluationCases,
  requireDigitalStaffEvaluationCase,
  runDigitalStaffRuntime,
} from "@/lib/digitalStaffRuntime";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const supportedEvaluationModels = [
  "gpt-5",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.6-luna",
] as const;

function isSupportedEvaluationModel(value: unknown): value is (typeof supportedEvaluationModels)[number] {
  return typeof value === "string" && supportedEvaluationModels.includes(value as (typeof supportedEvaluationModels)[number]);
}

async function requirePreviewOwner() {
  if (process.env.VERCEL_ENV === "production") {
    return { response: NextResponse.json({ error: "Model evaluation is disabled in Production." }, { status: 404 }) };
  }
  const supabase = createRouteClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) {
    return { response: NextResponse.json({ error: "Owner access could not be verified." }, { status: 503 }) };
  }
  if (profile?.role !== "admin") {
    return { response: NextResponse.json({ error: "BeastAdmin owner access required." }, { status: 403 }) };
  }
  return { response: null };
}

export async function GET() {
  const access = await requirePreviewOwner();
  if (access.response) return access.response;
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: createOpenAIRequestHeaders(crypto.randomUUID()),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ error: `OpenAI model availability check returned status ${response.status}.` }, { status: 502 });
    }
    const payload = await response.json() as { data?: Array<{ id?: string }> };
    const available = new Set((payload.data || []).map((item) => item.id).filter((id): id is string => Boolean(id)));
    return NextResponse.json({
      models: supportedEvaluationModels.map((model) => ({ model, available: available.has(model) })),
      cases: digitalStaffEvaluationCases.map(({ id, professionalId, tier, category, expectations }) => ({ id, professionalId, tier, category, expectations })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "OpenAI model availability could not be verified." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const access = await requirePreviewOwner();
  if (access.response) return access.response;
  let body: { model?: unknown; caseId?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "A valid evaluation request is required." }, { status: 400 });
  }
  if (!isSupportedEvaluationModel(body.model) || typeof body.caseId !== "string") {
    return NextResponse.json({ error: "A supported model and evaluation case are required." }, { status: 400 });
  }
  let evaluationCase;
  try {
    evaluationCase = requireDigitalStaffEvaluationCase(body.caseId);
  } catch {
    return NextResponse.json({ error: "Unknown evaluation case." }, { status: 400 });
  }
  try {
    const result = await runDigitalStaffRuntime(evaluationCase.context, {}, { modelOverride: body.model });
    return NextResponse.json({
      caseId: evaluationCase.id,
      professionalId: evaluationCase.professionalId,
      requestedTier: evaluationCase.tier,
      category: evaluationCase.category,
      model: result.model,
      response: result.response,
      intent: result.intent,
      nextQuestion: result.nextQuestion,
      proposalCount: result.proposals.length,
      toolCallCount: result.toolCalls.length,
      researchSourceCount: result.researchSources.length,
      validationFailures: result.validationFailures,
      timings: result.timings,
      expectations: evaluationCase.expectations,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The synthetic model evaluation failed safely." }, { status: 502 });
  }
}
