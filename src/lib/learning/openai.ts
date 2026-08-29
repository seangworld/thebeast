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
import { buildMentorConversationPresentationPrompt } from "./mentorConversationPresentation";
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
        buildMentorConversationPresentationPrompt({
          context: request.context,
          conversationType: request.conversationType,
        }),
        buildHomeworkPrompt(request.homeworkPolicy),
        buildContextPrompt(request.context),
      ].join("\n\n"),
    },
    ...request.messages,
  ];
}

type OpenAIProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" } }
  >;
};

function providerMessages(request: OpenAILearningRequest): OpenAIProviderMessage[] {
  const messages: OpenAIProviderMessage[] = buildOpenAILearningMessages(request);
  if (!request.imageAttachment) return messages;
  const lastUserIndex = messages.findLastIndex((message) => message.role === "user");
  const lastUser = messages[lastUserIndex];
  if (lastUser && typeof lastUser.content === "string") {
    messages[lastUserIndex] = {
      ...lastUser,
      content: [
        { type: "text", text: `${lastUser.content}\n\nThe learner attached ${request.imageAttachment.fileName}. Read only what is visibly present. Say clearly if any part is blurry, cropped, or uncertain.` },
        { type: "image_url", image_url: { url: request.imageAttachment.dataUrl, detail: "high" } },
      ],
    };
  }
  return messages;
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
        "OpenAI is not configured for this environment. BeastEducation will keep using the guided private beta experience until credentials are available.",
      model: defaultModel,
    };
  }

  const requestId = crypto.randomUUID();
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: createOpenAIRequestHeaders(requestId),
      body: JSON.stringify({
        model: defaultModel,
        messages: providerMessages(request),
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
    reportDigitalStaffError("learning-openai", error, requestId);
    return {
      status: "error",
      specialistId: request.specialistId,
      content: "The learning specialist is temporarily unavailable. Please try again.",
      model: defaultModel,
    };
  }
}
import {
  createOpenAIRequestHeaders,
} from "../digitalStaffRuntime/provider";
import { reportDigitalStaffError } from "../digitalStaffRuntime/security";
