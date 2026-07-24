import type { GuidanceDiscoveryProfile } from "./discoveryConversation";
import {
  buildGuidanceCounselorUnderstanding,
  nextGuidanceUnderstandingQuestion,
  type GuidanceUnderstandingArea,
  type GuidanceUnderstandingItem,
} from "./guidanceUnderstanding";

export type ProfessionalIntakeStage =
  | "orientation"
  | "clarification"
  | "planning"
  | "refinement";

export type ProfessionalIntakeDecision = {
  area: GuidanceUnderstandingArea;
  question: string;
  purpose: string;
  expectedInfluence: string;
  stage: ProfessionalIntakeStage;
  specificity: "broad" | "focused" | "specific";
  basedOn: readonly string[];
};

type ProfessionalIntakeInput = {
  profile: GuidanceDiscoveryProfile;
  topics?: readonly string[];
  previousCounselorResponses?: readonly string[];
};

const intakePurpose: Record<
  GuidanceUnderstandingArea,
  Pick<ProfessionalIntakeDecision, "purpose" | "expectedInfluence">
> = {
  "career-goals": {
    purpose: "Clarify the life or work change the member wants education to support.",
    expectedInfluence:
      "Determines which career directions and education pathways are worth comparing.",
  },
  "educational-goals": {
    purpose: "Define the educational outcome that would be useful now.",
    expectedInfluence:
      "Shapes the roadmap outcome, milestones, and evidence of progress.",
  },
  "current-situation": {
    purpose: "Understand the member’s real starting conditions.",
    expectedInfluence:
      "Changes pathway feasibility, sequencing, and the kind of support recommended.",
  },
  "prior-experience": {
    purpose: "Avoid repeating education or overlooking transferable experience.",
    expectedInfluence:
      "Changes prerequisite assumptions, starting level, and learning order.",
  },
  strengths: {
    purpose: "Identify capabilities that can support the plan.",
    expectedInfluence:
      "Changes possible directions and how learning builds on existing strengths.",
  },
  "growth-areas": {
    purpose: "Identify the most consequential capability gap.",
    expectedInfluence:
      "Determines whether review, foundational learning, or Tutor support is useful next.",
  },
  "learning-style": {
    purpose: "Understand the conditions in which learning has worked well.",
    expectedInfluence:
      "Changes resource format, practice design, and support recommendations.",
  },
  "weekly-study-time": {
    purpose: "Set sustainable planning capacity instead of guessing at timing.",
    expectedInfluence:
      "Changes time estimates, weekly workload, and roadmap pacing.",
  },
  constraints: {
    purpose: "Plan around the practical factor most likely to block progress.",
    expectedInfluence:
      "Changes pathway tradeoffs, funding, schedule, and delivery recommendations.",
  },
  "college-interest": {
    purpose: "Learn whether college belongs in the options under consideration.",
    expectedInfluence:
      "Determines whether school, admissions, transfer, and funding planning are relevant.",
  },
  "trade-interest": {
    purpose: "Learn whether trade or apprenticeship routes should remain visible.",
    expectedInfluence:
      "Changes the pathway set and authoritative requirements needing verification.",
  },
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function wasAlreadyAsked(
  question: string,
  previousCounselorResponses: readonly string[]
) {
  const normalized = normalize(question);
  return previousCounselorResponses.some((response) =>
    normalize(response).includes(normalized)
  );
}

function intakeStage(knownCount: number): ProfessionalIntakeStage {
  if (knownCount <= 1) return "orientation";
  if (knownCount <= 2) return "clarification";
  if (knownCount <= 7) return "planning";
  return "refinement";
}

function purposefulQuestion(
  item: GuidanceUnderstandingItem,
  profile: GuidanceDiscoveryProfile
) {
  const goal = profile.goal.trim();
  switch (item.area) {
    case "current-situation":
      return goal
        ? `To plan realistically for ${goal}, what does your current work, school, or military situation look like?`
        : item.question;
    case "prior-experience":
      return goal
        ? `Before I sequence a path toward ${goal}, what relevant education, training, certifications, or experience are you already bringing with you?`
        : item.question;
    case "growth-areas":
      return goal
        ? `For ${goal}, what is the one skill or knowledge area you feel least prepared for right now?`
        : item.question;
    case "constraints":
      return goal
        ? `As we plan for ${goal}, which practical constraint should I account for first: cost, time, schedule, location, or family responsibilities?`
        : item.question;
    default:
      return item.question;
  }
}

export function planProfessionalIntake({
  profile,
  topics = [],
  previousCounselorResponses = [],
}: ProfessionalIntakeInput): ProfessionalIntakeDecision | undefined {
  const understanding = buildGuidanceCounselorUnderstanding(profile);
  const stage = intakeStage(understanding.whatIKnow.length);
  const focused = nextGuidanceUnderstandingQuestion(understanding, topics);
  const candidates = topics.length
    ? focused
      ? [focused]
      : []
    : [...understanding.whatIStillNeed].sort(
        (left, right) => left.priority - right.priority
      );
  const candidate = candidates.find((item) => {
    const question = purposefulQuestion(item, profile);
    return Boolean(
      question && !wasAlreadyAsked(question, previousCounselorResponses)
    );
  });
  if (!candidate) return undefined;

  const question = purposefulQuestion(candidate, profile);
  if (!question) return undefined;
  const reason = intakePurpose[candidate.area];

  return {
    area: candidate.area,
    question,
    purpose: reason.purpose,
    expectedInfluence: reason.expectedInfluence,
    stage,
    specificity:
      stage === "orientation"
        ? "broad"
        : stage === "refinement"
          ? "specific"
          : "focused",
    basedOn: [
      profile.goal ? `known goal: ${profile.goal}` : "",
      profile.currentSituation
        ? `known current situation: ${profile.currentSituation}`
        : "",
      topics.length ? `current topic: ${topics.join(", ")}` : "",
    ].filter(Boolean),
  };
}
