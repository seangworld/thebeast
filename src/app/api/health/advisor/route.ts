import { NextResponse } from "next/server";
import { createOpenAIRequestHeaders } from "@/lib/digitalStaffRuntime";
import {
  buildHealthAdvisorConversationEvidence,
  buildHealthAdvisorDocumentEvidence,
  buildHealthAdvisorRecordEvidence,
  healthAdvisorAnswerLimitations,
  healthAdvisorExternalResearchInstructions,
  healthAuthorityDomains,
  parseHealthAdvisorOpenAIResponse,
  parseHealthAdvisorMedicalSections,
  type HealthAdvisorConversationContext,
  type HealthAdvisorDocumentContext,
  type HealthAdvisorQuestionAnswer,
  type OpenAIHealthResponsePayload,
} from "@/lib/health/healthAdvisorQuestionAnswering";
import {
  healthAdvisorProfessionalId,
  normalizeHealthRecord,
  type HealthRecordRow,
} from "@/lib/health/foundation";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const healthModel = process.env.OPENAI_HEALTH_MODEL || "gpt-5";
const maxQuestionLength = 2_000;

type HealthDocumentRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  file_name: string;
  metadata: Record<string, unknown> | null;
  updated_at: string;
};

type HealthConversationRow = {
  id: string;
  title: string;
  summary: Record<string, unknown> | null;
  archived: boolean;
  updated_at: string;
};

function response(value: HealthAdvisorQuestionAnswer, status = 200) {
  return NextResponse.json(value, { status });
}

function documentContext(row: HealthDocumentRow): HealthAdvisorDocumentContext {
  const metadata = row.metadata || {};
  const permission = metadata.ai_summary_permission;
  const summary = metadata.ai_summary;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    updatedAt: row.updated_at,
    source: `${row.title} (${row.file_name})`,
    summary:
      permission === "Allowed" &&
      typeof summary === "string" &&
      summary.trim()
        ? summary.trim()
        : null,
  };
}

function conversationContext(
  row: HealthConversationRow
): HealthAdvisorConversationContext {
  const overview = row.summary?.overview;
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
    summary:
      typeof overview === "string" && overview.trim()
        ? overview.trim()
        : "No saved conversation summary is available.",
    archived: row.archived,
  };
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

  const [recordResult, documentResult, conversationResult] = await Promise.all([
    supabase
      .from("beast_health_records")
      .select(
        "id, owner_id, record_type, title, status, occurred_on, source, details, notes, created_at, updated_at"
      )
      .eq("owner_id", user.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("beast_documents")
      .select(
        "id, title, description, status, file_name, metadata, updated_at"
      )
      .eq("owner_id", user.id)
      .eq("category", "Health")
      .order("updated_at", { ascending: false }),
    supabase
      .from("agent_conversations")
      .select("id, title, summary, archived, updated_at")
      .eq("owner_id", user.id)
      .eq("agent_id", healthAdvisorProfessionalId)
      .order("updated_at", { ascending: false }),
  ]);
  if (recordResult.error) {
    return response(
      {
        status: "error",
        answer:
          "I could not load your BeastHealth context, so I did not generate a health answer.",
        generalInformation: "",
        possibleExplanations: "",
        questionsForClinician: "",
        recordEvidence: [],
        documentEvidence: [],
        conversationEvidence: [],
        contextWarnings: [],
        externalSources: [],
        limitations: [...healthAdvisorAnswerLimitations],
        model: healthModel,
      },
      503
    );
  }

  const records = ((recordResult.data || []) as HealthRecordRow[])
    .map(normalizeHealthRecord)
    .filter((record): record is NonNullable<typeof record> => Boolean(record));
  const recordEvidence = buildHealthAdvisorRecordEvidence(records, question);
  const documents = documentResult.error
    ? []
    : ((documentResult.data || []) as HealthDocumentRow[]).map(documentContext);
  const conversations = conversationResult.error
    ? []
    : ((conversationResult.data || []) as HealthConversationRow[]).map(
        conversationContext
      );
  const documentEvidence = buildHealthAdvisorDocumentEvidence(
    documents,
    question
  );
  const conversationEvidence = buildHealthAdvisorConversationEvidence(
    conversations,
    question
  );
  const contextWarnings = [
    ...(documentResult.error
      ? ["Uploaded health documents are temporarily unavailable."]
      : []),
    ...(conversationResult.error
      ? ["Prior Health Advisor conversations are temporarily unavailable."]
      : []),
  ];
  const memberContext = {
    recordEvidence,
    documentEvidence,
    conversationEvidence,
    contextWarnings,
  };
  if (body.externalResearchConsent !== true) {
    return response(
      {
        status: "consent_required",
        answer:
          "External medical research requires your approval for this question. Your saved BeastHealth records remain inside Beast and are not sent to the external AI provider.",
        generalInformation: "",
        possibleExplanations: "",
        questionsForClinician: "",
        ...memberContext,
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
        generalInformation: "",
        possibleExplanations: "",
        questionsForClinician: "",
        ...memberContext,
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
      headers: createOpenAIRequestHeaders(crypto.randomUUID()),
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
          generalInformation: "",
          possibleExplanations: "",
          questionsForClinician: "",
          ...memberContext,
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
          generalInformation: "",
          possibleExplanations: "",
          questionsForClinician: "",
          ...memberContext,
          externalSources: [],
          limitations: [...healthAdvisorAnswerLimitations],
          model: healthModel,
        },
        503
      );
    }
    const sections = parseHealthAdvisorMedicalSections(parsed.text);
    return response({
      status: "ready",
      answer: parsed.text,
      generalInformation: sections.generalInformation,
      possibleExplanations: sections.possibleExplanations,
      questionsForClinician: sections.questionsForClinician,
      ...memberContext,
      externalSources: parsed.sources,
      limitations: [
        ...(sections.safetyLimitations
          ? [sections.safetyLimitations]
          : []),
        ...healthAdvisorAnswerLimitations,
      ],
      model: healthModel,
    });
  } catch {
    return response(
      {
        status: "error",
        answer:
          "Current medical-source research is temporarily unavailable. I did not generate an uncited health answer.",
        generalInformation: "",
        possibleExplanations: "",
        questionsForClinician: "",
        ...memberContext,
        externalSources: [],
        limitations: [...healthAdvisorAnswerLimitations],
        model: healthModel,
      },
      502
    );
  }
}
