import { NextResponse } from "next/server";
import { validateExternalEducationResearchQuery } from "@/lib/education/careerIntelligence";
import {
  educationResearchInstructions,
  parseEducationResearchResponse,
  type OpenAIEducationResearchPayload,
} from "@/lib/education/research";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const model = process.env.OPENAI_EDUCATION_MODEL || "gpt-5";

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { query?: unknown; externalResearchConsent?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const queryValidation = validateExternalEducationResearchQuery(query);
  if (!queryValidation.allowed) {
    return NextResponse.json(
      { error: queryValidation.reason, status: "invalid_query" },
      { status: 400 }
    );
  }
  if (body.externalResearchConsent !== true) {
    return NextResponse.json(
      {
        status: "consent_required",
        error:
          "External research requires approval for this question. Saved profile, document, goal, roadmap, and conversation data will not be sent.",
      },
      { status: 409 }
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        status: "unconfigured",
        error:
          "Current-source education research is not configured. No stale or uncited answer was generated.",
      },
      { status: 503 }
    );
  }

  try {
    const providerResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: educationResearchInstructions,
        input: query,
        tools: [{ type: "web_search", search_context_size: "high" }],
        tool_choice: "required",
      }),
    });
    if (!providerResponse.ok) {
      return NextResponse.json(
        {
          status: "error",
          error:
            "Current-source research is temporarily unavailable. No uncited answer was generated.",
        },
        { status: 502 }
      );
    }
    const result = parseEducationResearchResponse(
      (await providerResponse.json()) as OpenAIEducationResearchPayload
    );
    if (!result.answer || !result.sources.length) {
      return NextResponse.json(
        {
          status: "insufficient_sources",
          error:
            "No attributable current sources were returned. Confirm requirements directly with the responsible authority.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({
      status: "ready",
      answer: result.answer,
      sources: result.sources,
      limitations: [
        "This is informational planning support, not a guarantee of admission, employment, promotion, salary, eligibility, licensure, or certification.",
        "Requirements can vary by employer, institution, jurisdiction, and date; confirm them with the responsible authority.",
      ],
      model,
      privacy: "Only the submitted question was sent for external research.",
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error:
          "Current-source research is temporarily unavailable. No uncited answer was generated.",
      },
      { status: 502 }
    );
  }
}
