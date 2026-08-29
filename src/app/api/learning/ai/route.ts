import { NextResponse } from "next/server";
import { getAISpecialistById } from "@/lib/learning/aiRegistry";
import { buildLearningAIContext } from "@/lib/learning/contextBuilder";
import { getHomeworkPolicyForRequest } from "@/lib/learning/homeworkPolicy";
import { conversationTypeFromIntent, detectLearningIntent } from "@/lib/learning/intentDetection";
import { callOpenAILearningSpecialist } from "@/lib/learning/openai";
import { routeLearningAI } from "@/lib/learning/router";
import { createRouteClient } from "@/lib/supabase/server";
import type { LearningImageAttachment, MasteryProfile, OpenAILearningMessage } from "@/lib/learning/types";
import { boundLearningConversationMessages, maximumLearningRequestCharacters } from "@/lib/learning/conversationBounds";

export const dynamic = "force-dynamic";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumImageBytes = 8 * 1024 * 1024;

function validateImageAttachment(value: unknown): LearningImageAttachment | undefined {
  if (value == null) return undefined;
  if (!value || typeof value !== "object") throw new Error("The homework image is invalid.");
  const attachment = value as Record<string, unknown>;
  const dataUrl = typeof attachment.dataUrl === "string" ? attachment.dataUrl : "";
  const fileName = typeof attachment.fileName === "string" ? attachment.fileName.trim().slice(0, 120) : "homework image";
  const mediaType = typeof attachment.mediaType === "string" ? attachment.mediaType : "";
  if (!allowedImageTypes.has(mediaType) || !dataUrl.startsWith(`data:${mediaType};base64,`)) {
    throw new Error("Use a JPEG, PNG, or WebP homework image.");
  }
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("The homework image is not valid base64 data.");
  }
  const approximateBytes = Math.floor((encoded.length * 3) / 4);
  if (!encoded || approximateBytes > maximumImageBytes) throw new Error("Homework images must be 8 MB or smaller.");
  return { dataUrl, fileName: fileName || "homework image", mediaType: mediaType as LearningImageAttachment["mediaType"] };
}

const defaultMastery: MasteryProfile = {
  overallMasteryPercent: 0,
  confidence: "low",
  concepts: [],
  weakConcepts: [],
  strongestConcepts: [],
  suggestedReviewTopics: [],
};

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: {
    userRequest?: string;
    learnerName?: string;
    subject?: string;
    goal?: string;
    currentLesson?: string;
    mastery?: MasteryProfile;
    messages?: OpenAILearningMessage[];
    imageAttachment?: LearningImageAttachment;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "A valid learning request is required." }, { status: 400 });
  }
  const userRequest = body.userRequest?.trim();

  if (!userRequest || userRequest.length > maximumLearningRequestCharacters) {
    return NextResponse.json({ error: "A learning request is required." }, { status: 400 });
  }
  let imageAttachment: LearningImageAttachment | undefined;
  try {
    imageAttachment = validateImageAttachment(body.imageAttachment);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The homework image is invalid." }, { status: 400 });
  }

  const intent = detectLearningIntent(userRequest);
  const conversationType = conversationTypeFromIntent(intent);
  const context = buildLearningAIContext({
    learnerName: user.email?.split("@")[0] || "Learner",
    mastery: body.mastery || defaultMastery,
    weakAreas: body.mastery?.weakConcepts || [],
    currentLesson: body.currentLesson || "Private beta learning session",
  });
  const routed = routeLearningAI({
    userRequest,
    context,
    goal: body.goal || intent,
    subject: body.subject || "All",
    currentLesson: context.currentLesson,
    mastery: context.mastery.join(", ") || "Unknown",
    conversationType,
  });
  const specialistId = routed.selectedSpecialistIds[0] || "tutor";
  const specialist = getAISpecialistById(specialistId);

  const aiResponse = await callOpenAILearningSpecialist({
    specialistId,
    specialistName: specialist?.name || "Tutor",
    conversationType,
    messages: boundLearningConversationMessages(body.messages, userRequest),
    context,
    homeworkPolicy: getHomeworkPolicyForRequest(userRequest),
    imageAttachment,
  });

  return NextResponse.json({
    intent,
    conversationType,
    routed,
    response: aiResponse,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
