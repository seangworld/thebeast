export const memberAgentOutcomeWindows = ["immediate", "short", "7-day", "30-day"] as const;

export const memberAgentOutcomeDefinitions = {
  telemetryTaxonomy: ["professional_turn_started", "professional_turn_completed", "professional_turn_failed"] as const,
  privacyBoundary: "Aggregate event taxonomy, specialist ID, status, model route, error category, and latency bucket only. Never store prompts, responses, homework text or images, financial values, health data, or member identity in outcome evidence.",
  windows: {
    immediate: ["release health", "route availability", "deterministic safety and entitlement checks"],
    short: ["completion rate", "failure and escalation rate", "member-requested follow-up"],
    "7-day": ["repeat use", "successful specialist interaction completion", "Tutor lesson and Homework Review continuation"],
    "30-day": ["sustained useful completion", "Guidance follow-through", "Money and Health coaching completion", "investigate regressions or low use"],
  },
  recommendations: ["Continue", "Modify", "Stop", "Investigate"] as const,
} as const;
