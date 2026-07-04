import { getAISpecialistById } from "./aiRegistry";
import {
  assessmentPrompt,
  buildContextPrompt,
  buildHomeworkPrompt,
  buildSpecialistPrompt,
  learningSystemPrompt,
  reflectionPrompt,
  teachingPrompt,
} from "./promptLibrary";
import type {
  LearningConversationType,
  OpenAILearningMessage,
  OpenAILearningRequest,
  OpenAILearningResponse,
} from "./types";

const defaultModel = process.env.OPENAI_LEARNING_MODEL || "gpt-4.1-mini";

function promptForConversationType(conversationType: LearningConversationType) {
  if (conversationType === "Assessment") return assessmentPrompt;
  if (conversationType === "Reflection") return reflectionPrompt;

  return teachingPrompt;
}

export function buildOpenAILearningMessages(
  request: OpenAILearningRequest
): OpenAILearningMessage[] {
  const specialist = getAISpecialistById(request.specialistId);
  const specialistPrompt = specialist
    ? buildSpecialistPrompt(specialist)
    : `${request.specialistName} learning specialist.`;

  return [
    {
      role: "system",
      content: [
        learningSystemPrompt,
        specialistPrompt,
        promptForConversationType(request.conversationType),
        buildHomeworkPrompt(request.homeworkPolicy),
        buildContextPrompt(request.context),
      ].join("\n\n"),
    },
    ...request.messages,
  ];
}

export function isOpenAILearningConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function callOpenAILearningSpecialist(
  request: OpenAILearningRequest
): Promise<OpenAILearningResponse> {
  if (!isOpenAILearningConfigured()) {
    return {
      status: "unconfigured",
      specialistId: request.specialistId,
      content:
        "OpenAI is not configured for this environment. BeastLearning will keep using the guided private beta experience until credentials are available.",
      model: defaultModel,
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: defaultModel,
        messages: buildOpenAILearningMessages(request),
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        specialistId: request.specialistId,
        content: `OpenAI returned ${response.status}.`,
        model: defaultModel,
      };
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    return {
      status: "ready",
      specialistId: request.specialistId,
      content:
        payload.choices?.[0]?.message?.content ||
        "The specialist is ready, but no response content was returned.",
      model: defaultModel,
    };
  } catch (error) {
    return {
      status: "error",
      specialistId: request.specialistId,
      content: error instanceof Error ? error.message : "OpenAI request failed.",
      model: defaultModel,
    };
  }
}
