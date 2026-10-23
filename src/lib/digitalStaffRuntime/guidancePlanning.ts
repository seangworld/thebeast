import type { ConversationState, RuntimeContext } from "./types";
const marker = "Current conversational planning constraint (not a saved-profile update): ";
const explicitTime = /\bi\s+(?:can\s+(?:only\s+)?(?:spare|study|commit|spend)|(?:only\s+)?have)\b[^.!?\n]{0,80}\b(?:\d+(?:\.\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:hours?|minutes?)\b/i;
/** Narrow explicit first-person statements only; not a general language parser.
 * Preserve wording rather than inferring weekly frequency, duration or consent. */
export function guidancePlanningConstraint(context: RuntimeContext) {
  if (context.professionalId !== "beasteducation.guidance-counselor") return null;
  for (const message of [...context.recentMessages, context.message].reverse()) {
    if (message.role !== "user" || /\b(?:if|suppose|imagine|for example|said|quoted?)\b/i.test(message.text)) continue;
    if (explicitTime.test(message.text)) return { statement: message.text.slice(0, 1000), sourceMessageId: message.id, duration: "not_inferred", savedProfileUpdated: false };
  }
  const prior = [...context.state.corrections].reverse().find(text => text.startsWith(marker));
  return prior ? { statement: prior.slice(marker.length, marker.length + 1000), sourceMessageId: null, duration: "not_inferred", savedProfileUpdated: false } : null;
}
export function guidancePlanningState(context: RuntimeContext, state: ConversationState): ConversationState {
  const constraint = guidancePlanningConstraint(context);
  if (!constraint) return state;
  // Remove competing weekly-time allocations from a conversational goal summary.
  // This does not touch the saved profile, proposals or the delivered model prose.
  const weeklyTime = /\b(?:\d+(?:\.\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:weekly\s+(?:hours?|minutes?)|(?:hours?|minutes?)\s*(?:\/\s*week|per\s+week|a\s+week))\b/gi;
  return {
    ...state,
    currentGoal: state.currentGoal?.replace(weeklyTime, "the latest conversational planning limit") ?? null,
    corrections: [...state.corrections.filter(text => !text.startsWith(marker)), marker + constraint.statement],
  };
}
