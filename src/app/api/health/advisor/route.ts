import { NextResponse } from "next/server";
import {
  buildHealthAdvisorRecordEvidence,
  healthAdvisorAnswerLimitations,
  healthAdvisorExternalResearchInstructions,
  healthAuthorityDomains,
  parseHealthAdvisorOpenAIResponse,
  type HealthAdvisorQuestionAnswer,
  type OpenAIHealthResponsePayload,
} from "@/lib/health/healthAdvisorQuestionAnswering";
import {
  normalizeHealthRecord,
  type HealthRecordRow,
} from "@/lib/health/foundation";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const healthModel = process.env.OPENAI_HEALTH_MODEL || "gpt-5";
const maxQuestionLength = 2_000;

function response(value: HealthAdvisorQuestionAnswer, status = 200) {
  return NextResponse.json(value, { status });
}

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  let body: { question?: unknown; externalResearchConsent?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "A valid question is required." },
      { status: 400 }
    );
  }
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > maxQuestionLength) {
    return NextResponse.json(
      {
        error: `Enter a health question between 1 and ${maxQuestionLength.toLocaleString()} characters.`,
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("beast_health_records")
    .select(
      "id, owner_id, record_type, title, status, occurred_on, source, details, notes, created_at, updated_at"
    )
    .eq("owner_id", user.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) {
    return response(
      {
        status: "error",
        answer:
          "I could not load your BeastHealth context, so I did not generate a health answer.",
        recordEvidence: [],
        externalSources: [],
        limitations: [...healthAdvisorAnswerLimitations],
        model: healthModel,
      },
      503
    );
  }

  const records = ((data || []) as HealthRecordRow[])
    .map(normalizeHealthRecord)
    .filter((record): record is NonNullable<typeof record> => Boolean(record));
  const recordEvidence = buildHealthAdvisorRecordEvidence(records, question);
  if (body.externalResearchConsent !== true) {
    return response(
      {
        status: "consent_required",
        answer:
          "External medical research requires your approval for this question. Your saved BeastHealth records remain inside Beast and are not sent to the external AI provider.",
        recordEvidence,
        externalSources: [],
        limitations: [...healthAdvisorAnswerLimitations],
        model: healthModel,
      },
      409
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return response(
      {
        status: "unconfigured",
        answer:
          "Current medical-source research is not configured in this environment. I can show your saved records, but I will not answer this question without current reputable sources.",
        recordEvidence,
        externalSources: [],
        limitations: [...healthAdvisorAnswerLimitations],
        model: healthModel,
      },
      503
    );
  }

  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: healthModel,
        store: false,
        instructions: healthAdvisorExternalResearchInstructions,
        input: question,
        tools: [
          {
            type: "web_search",
            filters: { allowed_domains: [...healthAuthorityDomains] },
            search_context_size: "high",
          },
        ],
        tool_choice: "required",
      }),
    });
    if (!openAIResponse.ok) {
      return response(
        {
          status: "error",
          answer:
            "Current medical-source research is temporarily unavailable. I did not generate an uncited health answer.",
          recordEvidence,
          externalSources: [],
          limitations: [...healthAdvisorAnswerLimitations],
          model: healthModel,
        },
        502
      );
    }
    const parsed = parseHealthAdvisorOpenAIResponse(
      (await openAIResponse.json()) as OpenAIHealthResponsePayload
    );
    if (!parsed.text || parsed.sources.length === 0) {
      return response(
        {
          status: "insufficient_sources",
          answer:
            "I could not verify a current answer from the approved medical sources. I will not provide an uncited medical response. A qualified clinician or pharmacist can help with this question.",
          recordEvidence,
          externalSources: [],
          limitations: [...healthAdvisorAnswerLimitations],
          model: healthModel,
        },
        503
      );
    }
    return response({
      status: "ready",
      answer: parsed.text,
      recordEvidence,
      externalSources: parsed.sources,
      limitations: [...healthAdvisorAnswerLimitations],
      model: healthModel,
    });
  } catch {
    return response(
      {
        status: "error",
        answer:
          "Current medical-source research is temporarily unavailable. I did not generate an uncited health answer.",
        recordEvidence,
        externalSources: [],
        limitations: [...healthAdvisorAnswerLimitations],
        model: healthModel,
      },
      502
    );
  }
}
