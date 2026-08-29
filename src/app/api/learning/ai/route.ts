import { NextResponse } from "next/server";
import { getAISpecialistById } from "@/lib/learning/aiRegistry";
import { buildLearningAIContext } from "@/lib/learning/contextBuilder";
import { getHomeworkPolicyForRequest } from "@/lib/learning/homeworkPolicy";
import { conversationTypeFromIntent, detectLearningIntent } from "@/lib/learning/intentDetection";
import { callOpenAILearningSpecialist } from "@/lib/learning/openai";
import { routeLearningAI } from "@/lib/learning/router";
import { createRouteClient } from "@/lib/supabase/server";
import { acquireDigitalStaffRequestLease } from "@/lib/digitalStaffRuntime";
import { digitalStaffTelemetryRecord, recordServerFirstPartyTelemetry } from "@/lib/server/firstPartyTelemetry";
import { requireProfessionalEntitlement } from "@/lib/memberAgeServer";
import { firstPartyPerformanceBucket, type FirstPartyTelemetryErrorCategory } from "@/lib/firstPartyTelemetry";
import { buildTutorLearnerContext, requireAuthenticatedTutorMember, tutorProfessionalId, tutorResponseHeaders, validateTutorImageAttachment } from "@/lib/learning/tutorRequest";
import type { LearningImageAttachment, MasteryProfile, OpenAILearningMessage } from "@/lib/learning/types";
import { boundLearningConversationMessages, maximumLearningRequestCharacters } from "@/lib/learning/conversationBounds";

export const dynamic = "force-dynamic";
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: tutorResponseHeaders });
}

function tutorTelemetry(status: "started" | "completed" | "failed", startedAt: number, errorCategory?: FirstPartyTelemetryErrorCategory) {
  if (status === "started") return {
    eventName: "professional_turn_started" as const,
    moduleId: "education" as const,
    professionalId: "tutor" as const,
    outcome: "started" as const,
    performanceBucket: "unknown" as const,
    modelRoute: "none" as const,
  };
  return digitalStaffTelemetryRecord({
    professionalId: tutorProfessionalId,
    status,
    latencyMs: Date.now() - startedAt,
    errorCategory,
  });
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
  const startedAt = Date.now();
  const supabase = createRouteClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return json({ error: "Authentication required." }, 401);
  }
  requireAuthenticatedTutorMember(user.id);

  const entitlement = await requireProfessionalEntitlement(tutorProfessionalId, { supabase, user });
  if (!entitlement.ok) return json({ error: "The AI Tutor is unavailable for this member profile." }, entitlement.status);

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
    return json({ error: "A valid learning request is required." }, 400);
  }
  const userRequest = body.userRequest?.trim();

  if (!userRequest || userRequest.length > maximumLearningRequestCharacters) {
    return json({ error: "A learning request is required." }, 400);
  }
  let imageAttachment: LearningImageAttachment | undefined;
  try {
    imageAttachment = validateTutorImageAttachment(body.imageAttachment);
  } catch (error) {
    void recordServerFirstPartyTelemetry({ actorId: user.id, record: tutorTelemetry("failed", startedAt, "validation")! });
    return json({ error: error instanceof Error ? error.message : "The homework image is invalid." }, 400);
  }

  const requestLease = acquireDigitalStaffRequestLease(user.id, tutorProfessionalId);
  if (!requestLease.ok) {
    void recordServerFirstPartyTelemetry({ actorId: user.id, record: tutorTelemetry("failed", startedAt, "rate_limited")! });
    return NextResponse.json({ error: "Another Tutor request is already being handled. Please retry shortly." }, { status: 429, headers: { ...tutorResponseHeaders, "Retry-After": String(requestLease.retryAfterSeconds) } });
  }
  void recordServerFirstPartyTelemetry({ actorId: user.id, record: tutorTelemetry("started", startedAt)! });

  try {
    const { data: learningProfile } = await supabase
      .from("learning_profiles")
      .select("focus,birthday,learning_style,preferred_pace")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const learnerContext = buildTutorLearnerContext({
      accountBirthday: entitlement.profile.birthday,
      learningBirthday: learningProfile?.birthday,
      focus: learningProfile?.focus,
      learningStyle: learningProfile?.learning_style,
      preferredPace: learningProfile?.preferred_pace,
    });

    const intent = detectLearningIntent(userRequest);
  const conversationType = conversationTypeFromIntent(intent);
    const context = buildLearningAIContext({
    learnerName: learnerContext.profile,
    mastery: body.mastery || defaultMastery,
    weakAreas: body.mastery?.weakConcepts || [],
    currentLesson: body.currentLesson || "Private beta learning session",
  });
    context.learningStyle = `${learnerContext.learningStyle}; preferred pace: ${learnerContext.preferredPace}`;
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
    outwardPersona: "tutor",
  });

    if (aiResponse.status !== "ready") {
      void recordServerFirstPartyTelemetry({ actorId: user.id, record: tutorTelemetry("failed", startedAt, aiResponse.status === "unconfigured" ? "configuration" : "provider")! });
      return json({ error: aiResponse.content }, aiResponse.status === "unconfigured" ? 503 : 502);
    }
    const completed = tutorTelemetry("completed", startedAt);
    if (completed) void recordServerFirstPartyTelemetry({ actorId: user.id, record: { ...completed, performanceBucket: firstPartyPerformanceBucket(Date.now() - startedAt) } });
    return json({
    intent,
    conversationType,
    routed,
    professionalId: tutorProfessionalId,
    response: { ...aiResponse, specialistId: tutorProfessionalId },
    });
  } catch {
    void recordServerFirstPartyTelemetry({ actorId: user.id, record: tutorTelemetry("failed", startedAt, "provider")! });
    return json({ error: "Your Tutor is temporarily unavailable. Please try again." }, 502);
  } finally {
    requestLease.release();
  }
}
