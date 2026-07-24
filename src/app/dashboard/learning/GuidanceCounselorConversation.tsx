"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AgentAvatar,
  AgentContextSummary,
  AgentConversationInput,
  AgentConversationTimeline,
  AgentExperience,
  AgentGreeting,
  AgentHeader,
  AgentLoadingState,
  AgentStatus,
  AgentSuggestedActions,
  type AgentConversationMessage,
} from "@/app/components/agents";
import {
  buildGuidanceCounselorResponse,
  type GuidanceCounselorConversationContext,
} from "@/lib/education";
import { createClient } from "@/lib/supabase/client";
import {
  discoveryProfileUpdate,
  guidanceDiscoveryProfileFromRow,
  learnFromDiscoveryTurn,
  nextDiscoveryQuestion,
  type GuidanceDiscoveryProfile,
} from "@/lib/education/discoveryConversation";

export const guidanceCounselorSuggestedQuestions = [
  "Let's review your educational goals.",
  "Let's talk about your interests.",
  "Have your career goals changed?",
  "Let's update your roadmap.",
] as const;

type StoredMessage = {
  id: string;
  role: "user" | "agent";
  author: string;
  content: string;
};

type GuidanceCounselorConversationProps = {
  memberId: string;
  memberName: string;
  context: GuidanceCounselorConversationContext;
  initialProfile: GuidanceDiscoveryProfile;
};

export default function GuidanceCounselorConversation({
  memberId,
  memberName,
  context,
  initialProfile,
}: GuidanceCounselorConversationProps) {
  const router = useRouter();
  const storageKey = `beasteducation:guidance-counselor:${memberId}`;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [discoveryProfile, setDiscoveryProfile] =
    useState<GuidanceDiscoveryProfile>(initialProfile);
  const [profileSaveStatus, setProfileSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // A private or restricted browser can still use the current conversation.
    } finally {
      setHistoryReady(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!historyReady) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Conversation remains available for the current page session.
    }
  }, [historyReady, messages, storageKey]);

  const timelineMessages = useMemo<AgentConversationMessage[]>(
    () => messages.map((message) => ({ ...message })),
    [messages]
  );

  async function saveDiscoveryProfile(profile: GuidanceDiscoveryProfile) {
    setProfileSaveStatus("saving");
    const supabase = createClient();
    const result = await supabase
      .from("education_profiles")
      .upsert(
        {
          owner_id: memberId,
          ...discoveryProfileUpdate(profile),
        },
        { onConflict: "owner_id" }
      )
      .select("owner_id")
      .single();
    if (result.error) {
      setProfileSaveStatus("error");
      return;
    }
    setProfileSaveStatus("saved");
    router.refresh();
  }

  function sendMessage(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    const turnId = `${Date.now()}-${messages.length}`;
    const learnedProfile = learnFromDiscoveryTurn(
      cleanQuestion,
      discoveryProfile
    );
    const followUp = nextDiscoveryQuestion(learnedProfile);
    const discoveryComplete =
      followUp === "What would you like us to work on first?";
    const response = discoveryComplete
      ? buildGuidanceCounselorResponse({
          question: cleanQuestion,
          context: {
            ...context,
            educationalGoal:
              learnedProfile.goal || context.educationalGoal,
            interests:
              learnedProfile.careerInterests.join(", ") || context.interests,
            careerDirection:
              learnedProfile.goal || context.careerDirection,
          },
        }).text
      : `Thank you—that helps me understand where you’re starting. ${followUp}`;
    setMessages((current) => [
      ...current,
      {
        id: `${turnId}-member`,
        role: "user",
        author: memberName,
        content: cleanQuestion,
      },
      {
        id: `${turnId}-counselor`,
        role: "agent",
        author: "Guidance Counselor",
        content: response,
      },
    ]);
    setDiscoveryProfile(learnedProfile);
    void saveDiscoveryProfile(learnedProfile);
    setInput("");
  }

  const knownContext = [
    discoveryProfile.goal
      ? `Goal: ${discoveryProfile.goal}`
      : "",
    discoveryProfile.currentEmployment
      ? `Current work: ${discoveryProfile.currentEmployment}`
      : "",
    discoveryProfile.strengths
      ? `Strengths: ${discoveryProfile.strengths}`
      : "",
    discoveryProfile.availableStudyTimeKnown
      ? `Study time: ${discoveryProfile.weeklyHours} hours per week`
      : "",
  ].filter(Boolean);

  return (
    <div
      id="guidance-counselor-conversation"
      className="scroll-mt-24"
      aria-busy={!historyReady}
      data-guidance-home-primary="true"
    >
      <AgentExperience
        className="max-w-none gap-5 rounded-3xl border-indigo-300/25 bg-gradient-to-b from-[#181e2e] via-[#151b29] to-[#111722] shadow-[0_26px_90px_rgba(0,0,0,0.32)] ring-1 ring-indigo-300/[0.06] transition-[border-color,box-shadow] duration-300 focus-within:border-indigo-300/40 focus-within:shadow-[0_30px_100px_rgba(49,46,129,0.2)] sm:gap-6 sm:p-7"
        suggestedActionsPlacement="after-conversation"
        header={
          <AgentHeader
            title="Guidance Counselor"
            subtitle="Your primary BeastEducation professional"
            avatar={<AgentAvatar name="Guidance Counselor" initials="GC" size="lg" />}
            status={<AgentStatus state="available" label="Ready to plan with you" />}
          />
        }
        greeting={
          <AgentGreeting greeting={`Hi${memberName ? ` ${memberName}` : ""}.`}>
            <p>
              I&apos;m your Guidance Counselor.
            </p>
            <p>
              How can I help you today?
            </p>
          </AgentGreeting>
        }
        contextSummary={
          knownContext.length ? (
            <AgentContextSummary
              title="What I’ve learned about you"
              items={knownContext.map((item) => (
                <span key={item}>{item}</span>
              ))}
            />
          ) : null
        }
        suggestedActions={
          messages.length ? (
            <AgentSuggestedActions
              label="Suggested questions"
              actions={guidanceCounselorSuggestedQuestions.map((question, index) => ({
                id: `guidance-question-${index}`,
                label: question,
                onSelect: () => sendMessage(question),
              }))}
            />
          ) : null
        }
        conversation={
          <AgentConversationTimeline
            title="Conversation history"
            messages={timelineMessages}
          />
        }
        composer={
          <AgentConversationInput
            value={input}
            onChange={setInput}
            onSubmit={sendMessage}
            label="Message your Guidance Counselor"
            placeholder="Tell your Guidance Counselor what you want to explore or update…"
            submitLabel="Send"
          />
        }
        statusArea={
          !historyReady ? (
            <AgentLoadingState
              label="Restoring your Guidance Counselor conversation"
              lines={2}
            />
          ) : profileSaveStatus === "saving" ? (
            <p className="text-xs font-bold text-indigo-100" role="status">
              Remembering what you shared…
            </p>
          ) : profileSaveStatus === "saved" ? (
            <p className="text-xs font-bold text-emerald-200" role="status">
              I’ll remember this for future guidance.
            </p>
          ) : profileSaveStatus === "error" ? (
            <p className="text-xs font-bold text-red-200" role="alert">
              I couldn’t save that profile update. Your conversation is still here.
            </p>
          ) : null
        }
      />
    </div>
  );
}
