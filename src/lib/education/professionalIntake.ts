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
  "education-history": {
    purpose: "Understand the member’s educational journey without repeating prior work.",
    expectedInfluence:
      "Changes pathway comparisons, prerequisite verification, and roadmap starting points.",
  },
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
  schools: {
    purpose: "Understand institutions already attended or under consideration.",
    expectedInfluence:
      "Changes admissions, transfer, accreditation, and fit questions that need verification.",
  },
  degrees: {
    purpose: "Understand completed or considered degree work.",
    expectedInfluence:
      "Changes prerequisite assumptions, transfer questions, and program comparisons.",
  },
  certifications: {
    purpose: "Understand credentials already earned or under consideration.",
    expectedInfluence:
      "Changes credential sequencing and the official requirements that need verification.",
  },
  "military-training": {
    purpose: "Recognize military education, training, and transferable experience.",
    expectedInfluence:
      "Changes credit, benefit, credential, and career-path questions worth investigating.",
  },
  experience: {
    purpose: "Avoid overlooking transferable work and life experience.",
    expectedInfluence:
      "Changes pathway assumptions, starting points, and evidence already available.",
  },
  skills: {
    purpose: "Identify skills the member can already apply.",
    expectedInfluence:
      "Changes possible directions, gaps, and the evidence needed for future roles.",
  },
  strengths: {
    purpose: "Identify capabilities that can support the plan.",
    expectedInfluence:
      "Changes possible directions and how learning builds on existing strengths.",
  },
  "growth-areas": {
    purpose: "Identify the most consequential capability gap.",
    expectedInfluence:
      "Changes which skill-building options and planning milestones deserve attention next.",
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
  "education-budget": {
    purpose: "Understand the affordability boundary for education planning.",
    expectedInfluence:
      "Changes school, credential, funding, and timeline tradeoffs.",
  },
  "gi-bill": {
    purpose: "Learn whether GI Bill benefits may be relevant.",
    expectedInfluence:
      "Changes which official benefit and school-eligibility sources should be reviewed.",
  },
  vre: {
    purpose: "Learn whether VR&E may be relevant.",
    expectedInfluence:
      "Changes benefit-verification and funding questions in the plan.",
  },
  "employer-reimbursement": {
    purpose: "Learn whether employer education assistance may be available.",
    expectedInfluence:
      "Changes affordability, eligible-program, and reimbursement-timing questions.",
  },
  "scholarship-interest": {
    purpose: "Learn whether scholarship planning should be included.",
    expectedInfluence:
      "Changes funding milestones, evidence collection, and deadline planning.",
  },
  timeline: {
    purpose: "Understand the date or pace the member is planning around.",
    expectedInfluence:
      "Changes roadmap sequencing, application timing, and feasibility tradeoffs.",
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
  const role = goal.match(/^(?:to\s+)?become\s+(.+)$/i)?.[1];
  switch (item.area) {
    case "career-goals":
      return "What kind of work do you picture yourself doing?";
    case "educational-goals":
      return goal
        ? "What would you like to accomplish first on the way there?"
        : "What would you like education to help you accomplish first?";
    case "current-situation":
      return "What does life look like for you right now—are you working, in school, serving, or something else?";
    case "education-history":
    case "experience":
      return goal
        ? role
          ? `What experience do you already have that could help you move toward becoming ${role}?`
          : `What experience do you already have that could help you move toward ${goal}?`
        : item.question;
    case "growth-areas":
      return goal
        ? `What part of ${role || goal} feels least familiar or most challenging right now?`
        : item.question;
    case "constraints":
      return "What is most likely to get in the way right now—time, cost, schedule, location, or family responsibilities?";
    case "college-interest":
      return "Is college one of the options you’re open to considering?";
    case "trade-interest":
      return "Would you be open to a trade or apprenticeship path if it fits what you want?";
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
