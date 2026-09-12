import { normalizeVideoTopicPhrases } from "./beastMarketingVideo";

export const AI_CHARACTER_DISCLOSURE = "AI-generated character; not a real person.";

export type CharacterPersonaDraftInput = {
  name?: unknown;
  archetype?: unknown;
  audience?: unknown;
  visualDirection?: unknown;
  voiceDirection?: unknown;
  allowedTopics?: unknown;
};

const clean = (value: unknown, maximum: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maximum) : "";

export function buildInactiveCharacterPersonaDraft(input: CharacterPersonaDraftInput) {
  const name = clean(input.name, 80);
  const archetype = clean(input.archetype, 120);
  const audience = clean(input.audience, 120);
  const visualDirection = clean(input.visualDirection, 300);
  const voiceDirection = clean(input.voiceDirection, 200);
  const allowedTopics = normalizeVideoTopicPhrases(input.allowedTopics).slice(0, 10);
  const missing = [
    !name && "name",
    !archetype && "archetype",
    !audience && "audience",
    !visualDirection && "visual direction",
    !voiceDirection && "voice direction",
    !allowedTopics.length && "at least one allowed topic",
  ].filter(Boolean) as string[];

  if (missing.length) {
    return { valid: false as const, error: `Persona draft requires ${missing.join(", ")}.` };
  }

  return {
    valid: true as const,
    row: {
      name,
      presenter_type: "future_character" as const,
      visual_identity: { direction: visualDirection, assetStatus: "not_bound" },
      voice_identity: { direction: voiceDirection, assetStatus: "not_bound" },
      presentation_rules: {
        archetype,
        audience,
        fictionalCharacter: true,
        impersonationAllowed: false,
        facelessReelsEngine: true,
      },
      allowed_topics: allowedTopics,
      disclosure_rules: [AI_CHARACTER_DISCLOSURE],
      provenance: {
        origin: "owner_created_character_draft",
        likenessOrVoiceMediaUsed: false,
        identityApproval: false,
        disclosureApproved: false,
        assetsBound: false,
        publishingAuthorized: false,
      },
      active: false,
    },
  };
}
