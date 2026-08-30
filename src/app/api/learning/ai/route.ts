import { NextResponse } from "next/server";
import { getAISpecialistById } from "@/lib/learning/aiRegistry";
import { buildLearningAIContext } from "@/lib/learning/contextBuilder";
import { getHomeworkPolicyForRequest } from "@/lib/learning/homeworkPolicy";
import { conversationTypeFromIntent, detectLearningIntent } from "@/lib/learning/intentDetection";
import { callOpenAILearningSpecialist, learningProviderModel } from "@/lib/learning/openai";
import { routeLearningAI } from "@/lib/learning/router";
import { createRouteClient } from "@/lib/supabase/server";
import { acquireDigitalStaffRequestLease } from "@/lib/digitalStaffRuntime";
import { digitalStaffTelemetryRecord, recordServerFirstPartyTelemetry } from "@/lib/server/firstPartyTelemetry";
import { requireProfessionalEntitlement } from "@/lib/memberAgeServer";
import { firstPartyPerformanceBucket, type FirstPartyTelemetryErrorCategory } from "@/lib/firstPartyTelemetry";
import { buildTutorLearnerContext, requireAuthenticatedTutorMember, tutorProfessionalId, tutorResponseHeaders, validateTutorImageAttachment } from "@/lib/learning/tutorRequest";
import type { LearningImageAttachment, MasteryProfile, OpenAILearningMessage } from "@/lib/learning/types";
import { boundLearningConversationMessages, maximumLearningRequestCharacters } from "@/lib/learning/conversationBounds";
import { buildMemberSpecialistContextPacket } from "@/lib/memberAgentCapabilityFramework";
import { enforceMemberAgentResponseSafety, filterMemberAgentContextItems, memberAgentSafetyFallback, sanitizeUntrustedMemberText, screenMemberAgentInput } from "@/lib/memberAgentResponseSafety";
import { requireProfessionalConfig } from "@/lib/digitalStaffRuntime";
import { verifyMemberAgentSemanticSafety } from "@/lib/memberAgentSemanticVerifier";

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
  const inputSafety = screenMemberAgentInput(userRequest);
  if (!inputSafety.safe) {
    return json({ professionalId: tutorProfessionalId, response: { status: "ready", specialistId: tutorProfessionalId, content: inputSafety.response, model: "deterministic-safety-policy" }, validationFailures: inputSafety.failures });
  }
  const sanitizedUserRequest = sanitizeUntrustedMemberText(userRequest).value;
  const intent = detectLearningIntent(sanitizedUserRequest);
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
    const semanticInput = await verifyMemberAgentSemanticSafety({
      professionalId: tutorProfessionalId,
      phase: "input",
      memberMessage: userRequest,
      learningIntent: intent,
      model: learningProviderModel,
      signal: request.signal,
    });
    if (!semanticInput.valid || semanticInput.verdict !== "safe") {
      const completed = tutorTelemetry("completed", startedAt);
      if (completed) void recordServerFirstPartyTelemetry({ actorId: user.id, record: completed });
      return json({
        intent,
        professionalId: tutorProfessionalId,
        response: { status: "ready", specialistId: tutorProfessionalId, content: memberAgentSafetyFallback(tutorProfessionalId, userRequest, [semanticInput.failure || "semantic-verifier-input-rejected", ...semanticInput.categories]), model: "semantic-safety-verifier" },
        validationFailures: [semanticInput.failure || "semantic-verifier-input-rejected", ...semanticInput.categories],
      });
    }
    const [learningProfileResult, tutorThreadsResult] = await Promise.all([
      supabase
      .from("learning_profiles")
      .select("focus,birthday,learning_style,preferred_pace")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
      supabase.from("agent_conversations").select("id,message_count,updated_at").eq("owner_id", user.id).eq("agent_id", tutorProfessionalId).order("updated_at", { ascending: false }).limit(1),
    ]);
    const { data: learningProfile } = learningProfileResult;
    const { data: tutorThreads } = tutorThreadsResult;
    const tutorThread = tutorThreads?.[0];
    const serverHistoryResult = tutorThread
      ? await supabase.from("agent_conversation_messages").select("sender,content,created_at").eq("owner_id", user.id).eq("conversation_id", tutorThread.id).order("created_at", { ascending: false }).limit(12)
      : { data: [], error: null };
    const { data: serverHistory } = serverHistoryResult;
    const learnerContext = buildTutorLearnerContext({
      accountBirthday: entitlement.profile.birthday,
      learningBirthday: learningProfile?.birthday,
      focus: learningProfile?.focus,
      learningStyle: learningProfile?.learning_style,
      preferredPace: learningProfile?.preferred_pace,
    });

    const serverMessagesUnscreened: OpenAILearningMessage[] = [...(serverHistory || [])].reverse().flatMap((item) => {
      const sender = item.sender as { kind?: string } | null;
      const content = item.content;
      const text = typeof content === "string" ? content : content && typeof content === "object" && typeof (content as { text?: unknown }).text === "string" ? String((content as { text?: unknown }).text) : "";
      return text ? [{ role: sender?.kind === "agent" ? "assistant" as const : "user" as const, content: text }] : [];
    });
    const serverMessageSafety = filterMemberAgentContextItems(serverMessagesUnscreened);
    const serverMessages = serverMessageSafety.accepted;
    const contextBoundary = buildMemberSpecialistContextPacket({
      config: requireProfessionalConfig(tutorProfessionalId),
      ageBand: entitlement.decision.ageStatus,
      sources: [
        { domain: "education", provenance: "canonical-record", updatedAt: null },
        ...(serverHistory || []).slice(0, 1).map((item) => ({ domain: tutorProfessionalId, provenance: "current-conversation" as const, updatedAt: String(item.created_at) })),
      ],
      canonicalRecordsComplete: !learningProfileResult.error && !tutorThreadsResult.error && !serverHistoryResult.error,
      recentConversationCount: Number(tutorThread?.message_count || 0),
      currentAgentMemoryCount: 0,
    });
    const conversationType = conversationTypeFromIntent(intent);
    const context = buildLearningAIContext({
      learnerName: learnerContext.profile,
      mastery: defaultMastery,
      weakAreas: [],
      currentLesson: "Homework and guided learning",
    });
    context.learningStyle = `${learnerContext.learningStyle}; preferred pace: ${learnerContext.preferredPace}`;
    const routed = routeLearningAI({
      userRequest: sanitizedUserRequest,
      context,
      goal: intent,
      subject: "All",
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
      messages: boundLearningConversationMessages([...serverMessages, { role: "user", content: sanitizedUserRequest }], sanitizedUserRequest),
      context,
      homeworkPolicy: getHomeworkPolicyForRequest(sanitizedUserRequest),
      imageAttachment,
      outwardPersona: "tutor",
      contextBoundary,
    });

    if (aiResponse.status !== "ready") {
      void recordServerFirstPartyTelemetry({ actorId: user.id, record: tutorTelemetry("failed", startedAt, aiResponse.status === "unconfigured" ? "configuration" : "provider")! });
      return json({ error: aiResponse.content }, aiResponse.status === "unconfigured" ? 503 : 502);
    }
    const completed = tutorTelemetry("completed", startedAt);
    if (completed) void recordServerFirstPartyTelemetry({ actorId: user.id, record: { ...completed, performanceBucket: firstPartyPerformanceBucket(Date.now() - startedAt) } });
    let safety = enforceMemberAgentResponseSafety({ professionalId: tutorProfessionalId, memberMessage: userRequest, response: aiResponse.content, imageProvided: Boolean(imageAttachment), contract: aiResponse.safetyContract, learningIntent: intent });
    if (safety.safe) {
      const semanticOutput = await verifyMemberAgentSemanticSafety({
        professionalId: tutorProfessionalId,
        phase: "output",
        memberMessage: userRequest,
        candidateResponse: aiResponse.content,
        learningIntent: intent,
        model: learningProviderModel,
        signal: request.signal,
      });
      if (!semanticOutput.valid || semanticOutput.verdict !== "safe") {
        safety = {
          safe: false,
          response: memberAgentSafetyFallback(tutorProfessionalId, userRequest, [semanticOutput.failure || "semantic-verifier-output-rejected", ...semanticOutput.categories]),
          failures: [semanticOutput.failure || "semantic-verifier-output-rejected", ...semanticOutput.categories],
        };
      }
    }
    return json({
      intent,
      conversationType,
      routed,
      professionalId: tutorProfessionalId,
      response: { ...aiResponse, content: safety.response, specialistId: tutorProfessionalId },
      validationFailures: [...(serverMessageSafety.rejectedCount ? [`Rejected ${serverMessageSafety.rejectedCount} untrusted Tutor history item(s) containing instruction-override content.`] : []), ...safety.failures],
    });
  } catch {
    void recordServerFirstPartyTelemetry({ actorId: user.id, record: tutorTelemetry("failed", startedAt, "provider")! });
    return json({ error: "Your Tutor is temporarily unavailable. Please try again." }, 502);
  } finally {
    requestLease.release();
  }
}
