import { NextResponse } from "next/server";
import { getAISpecialistById } from "@/lib/learning/aiRegistry";
import { buildLearningAIContext } from "@/lib/learning/contextBuilder";
import { getHomeworkPolicyForRequest } from "@/lib/learning/homeworkPolicy";
import { conversationTypeFromIntent, detectLearningIntent } from "@/lib/learning/intentDetection";
import { callOpenAILearningSpecialist } from "@/lib/learning/openai";
import { routeLearningAI } from "@/lib/learning/router";
import { createRouteClient } from "@/lib/supabase/server";
import type { MasteryProfile, OpenAILearningMessage } from "@/lib/learning/types";
import { boundLearningConversationMessages, maximumLearningRequestCharacters } from "@/lib/learning/conversationBounds";

export const dynamic = "force-dynamic";

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
  });

  return NextResponse.json({
    intent,
    conversationType,
    routed,
    response: aiResponse,
  });
}
