"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AgentAvatar,
  AgentContextSummary,
  AgentConversationInput,
  AgentConversationTimeline,
  AgentExperience,
  AgentGreeting,
  AgentHeader,
  AgentStatus,
  AgentSuggestedActions,
  type AgentConversationMessage,
} from "@/app/components/agents";
import {
  buildGuidanceCounselorResponse,
  type GuidanceCounselorConversationContext,
} from "@/lib/education";

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
};

const welcomeMessage: StoredMessage = {
  id: "guidance-counselor-welcome",
  role: "agent",
  author: "Guidance Counselor",
  content:
    "I’m your Guidance Counselor. I’ll keep the big picture in view, help you explore credible options, and maintain your educational roadmap as your goals change.",
};

export default function GuidanceCounselorConversation({
  memberId,
  memberName,
  context,
}: GuidanceCounselorConversationProps) {
  const storageKey = `beasteducation:guidance-counselor:${memberId}`;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<StoredMessage[]>([welcomeMessage]);
  const [historyReady, setHistoryReady] = useState(false);

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

  function sendMessage(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    const turnId = `${Date.now()}-${messages.length}`;
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
        content: buildGuidanceCounselorResponse({
          question: cleanQuestion,
          context,
        }).text,
      },
    ]);
    setInput("");
  }

  return (
    <div id="guidance-counselor-conversation" className="scroll-mt-24">
      <AgentExperience
        className="max-w-none border-indigo-300/20 bg-gradient-to-b from-[#171c2a] to-[#121722]"
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
          <AgentGreeting greeting={`Welcome${memberName ? `, ${memberName}` : ""}.`}>
            <p>
              This relationship starts with your goals, interests, options, and
              long-term direction. Courses and Tutor support remain available when
              your roadmap calls for them.
            </p>
          </AgentGreeting>
        }
        contextSummary={
          <AgentContextSummary
            title="Context I’m keeping in view"
            items={[
              <span key="goal"><strong className="text-white">Educational goal:</strong> {context.educationalGoal}</span>,
              <span key="interests"><strong className="text-white">Interests:</strong> {context.interests}</span>,
              <span key="career"><strong className="text-white">Career direction:</strong> {context.careerDirection}</span>,
              <span key="roadmap"><strong className="text-white">Roadmap:</strong> {context.roadmap}</span>,
            ]}
          />
        }
        suggestedActions={
          <AgentSuggestedActions
            label="Suggested questions"
            actions={guidanceCounselorSuggestedQuestions.map((question, index) => ({
              id: `guidance-question-${index}`,
              label: question,
              onSelect: () => sendMessage(question),
            }))}
          />
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
      />
    </div>
  );
}
