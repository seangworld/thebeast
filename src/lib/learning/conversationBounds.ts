import type { OpenAILearningMessage } from "./types";

export const maximumLearningRequestCharacters = 4_000;
export const maximumLearningHistoryMessages = 8;
export const maximumLearningHistoryCharacters = 16_000;

export function boundLearningConversationMessages(
  messages: unknown,
  currentRequest: string
): OpenAILearningMessage[] {
  const supplied = Array.isArray(messages)
    ? messages.flatMap((message) => {
        if (!message || typeof message !== "object" || Array.isArray(message)) return [];
        const candidate = message as { role?: unknown; content?: unknown };
        if (
          (candidate.role !== "user" && candidate.role !== "assistant")
          || typeof candidate.content !== "string"
        ) return [];
        const content = candidate.content.trim().slice(0, maximumLearningRequestCharacters);
        return content ? [{ role: candidate.role as "user" | "assistant", content }] : [];
      })
    : [];
  const current = currentRequest.trim().slice(0, maximumLearningRequestCharacters);
  if (
    current
    && (supplied.at(-1)?.role !== "user" || supplied.at(-1)?.content !== current)
  ) {
    supplied.push({ role: "user", content: current });
  }

  const bounded: OpenAILearningMessage[] = [];
  let characters = 0;
  for (const message of supplied.slice(-maximumLearningHistoryMessages).reverse()) {
    if (characters + message.content.length > maximumLearningHistoryCharacters) continue;
    bounded.push(message);
    characters += message.content.length;
  }
  return bounded.reverse();
}
