export type GuidanceCounselorConversationContext = {
  educationalGoal: string;
  interests: string;
  careerDirection: string;
  roadmap: string;
};

export type GuidanceCounselorReasoningResult = {
  text: string;
  confidence: "contextual" | "needs-verification";
  planningTopics: readonly GuidancePlanningTopic[];
  authoritativeSources: readonly string[];
};

export type GuidanceCounselorConversationTurn =
  GuidanceCounselorReasoningResult & {
    followUp?: string;
    referencedContext: readonly string[];
    intakeDecision?: ProfessionalIntakeDecision;
    relationshipMemory?: GuidanceRelationshipReference;
  };

type GuidancePlanningTopic =
  | "prerequisites"
  | "college-pathway"
  | "certification"
  | "career-progression"
  | "tradeoffs"
  | "time-estimate"
  | "learning-order"
  | "foundations"
  | "goals"
  | "interests"
  | "roadmap";

const intentPatterns: ReadonlyArray<{
  topic: GuidancePlanningTopic;
  pattern: RegExp;
}> = [
  { topic: "prerequisites", pattern: /\b(prerequisites?|pre-reqs?|prereqs?|require before|need before|qualif(?:y|ications?))\b/i },
  { topic: "college-pathway", pattern: /\b(college|university|degree|major|minor|transfer|admission|community college)\b/i },
  { topic: "certification", pattern: /\b(certification|certificate|credential|exam|recertif|renewal)\b/i },
  { topic: "career-progression", pattern: /\b(career|job|role|promotion|progression|advance|entry.level)\b/i },
  { topic: "tradeoffs", pattern: /\b(trade.?off|compare|versus|\bvs\.?\b|better|pros? and cons?|choose between)\b/i },
  { topic: "time-estimate", pattern: /\b(how long|time|timeline|weeks?|months?|years?|hours?|estimate)\b/i },
  { topic: "learning-order", pattern: /\b(order|sequence|first|next|roadmap|path|start|learn before)\b/i },
  { topic: "foundations", pattern: /\b(foundational|foundation|fundamental|basics?|background knowledge)\b/i },
  { topic: "goals", pattern: /\bgoal\b/i },
  { topic: "interests", pattern: /\binterest\b/i },
  { topic: "roadmap", pattern: /\broadmap|plan\b/i },
];

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function detectTopics(question: string) {
  return unique(
    intentPatterns
      .filter(({ pattern }) => pattern.test(question))
      .map(({ topic }) => topic)
  );
}

function isConfirmed(value: string) {
  return Boolean(
    value.trim() &&
      !/\b(no .+ confirmed|define .+ together|explore .+ fit|not yet|choosing a starting point)\b/i.test(
        value
      )
  );
}

function planningFrame(context: GuidanceCounselorConversationContext) {
  if (isConfirmed(context.educationalGoal)) {
    return `I’d anchor this to your goal of ${context.educationalGoal}.`;
  }
  return "Before I recommend a specific route, I’d want to pin down the outcome you want and the location or institution that governs it.";
}

function sourcesFor(topics: readonly GuidancePlanningTopic[]) {
  const sources: string[] = [];
  if (topics.includes("college-pathway") || topics.includes("prerequisites")) {
    sources.push(
      "the institution’s official admissions page and current academic catalog",
      "the program department’s published degree map or prerequisite list"
    );
  }
  if (topics.includes("college-pathway")) {
    sources.push(
      "the official transfer or articulation agreement, when transfer credit is part of the plan",
      "the recognized accreditor’s directory when accreditation affects the outcome"
    );
  }
  if (topics.includes("certification")) {
    sources.push(
      "the credential issuer’s current candidate handbook, exam objectives, and renewal policy",
      "the relevant licensing or regulatory board when the credential is legally required"
    );
  }
  if (topics.includes("career-progression")) {
    sources.push(
      "current employer role descriptions and promotion criteria",
      "a government occupational source and the applicable professional or licensing body"
    );
  }
  return unique(sources);
}

function verifiedSourceSentence(sources: readonly string[]) {
  if (!sources.length) {
    return "Once we name the exact program, credential, employer, and location, I can help you identify the official source that governs the decision.";
  }
  return `Before treating any requirement as settled, check ${sources.join(
    "; "
  )}. Those sources outrank course listings, search summaries, and general advice.`;
}

function requirementsResponse(
  topics: readonly GuidancePlanningTopic[],
  context: GuidanceCounselorConversationContext,
  sources: readonly string[]
) {
  const kind = topics.includes("certification")
    ? "credential"
    : topics.includes("college-pathway")
      ? "program"
      : "path";
  return [
    `${planningFrame(context)} For a ${kind}, I separate true entry requirements from recommended preparation: prior courses or credentials, minimum grades or scores, experience, application steps, location rules, and any renewal obligations.`,
    `I don’t have a verified current requirement set for the exact ${kind} in your question, so I would not tell you that a particular course, degree, exam, or amount of experience is mandatory yet. Requirements can change by institution, issuer, employer, and jurisdiction.`,
    `${verifiedSourceSentence(sources)} Bring me what the official source says and I’ll turn it into a clean prerequisite chain: what you already satisfy, what is missing, and what should come first.`,
  ].join("\n\n");
}

function pathwayResponse(
  topics: readonly GuidancePlanningTopic[],
  context: GuidanceCounselorConversationContext,
  sources: readonly string[]
) {
  const college = topics.includes("college-pathway");
  return [
    `${planningFrame(context)} I’d compare at least two credible routes instead of assuming the longest or most familiar one is best.`,
    college
      ? "For each route, we should compare admission and transfer requirements, accreditation, total time, total cost, schedule and support, credits that actually apply to the major, internship or portfolio opportunities, and the option to change direction without losing too much progress."
      : "For each route, we should compare the skills and evidence it builds, entry requirements, time and cost, flexibility, credibility with the target employers, and what options remain if your goal changes.",
    topics.includes("tradeoffs")
      ? "The right tradeoff depends on what you value most: speed, affordability, depth, flexibility, a recognized credential, or direct work experience. Tell me which two matter most and I’ll help you narrow the routes without choosing for you."
      : "Once those facts are visible, we can choose a route that fits your constraints and keep a sensible alternative open.",
    verifiedSourceSentence(sources),
  ].join("\n\n");
}

function sequenceResponse(
  topics: readonly GuidancePlanningTopic[],
  context: GuidanceCounselorConversationContext
) {
  return [
    `${planningFrame(context)} I’d organize this around verified requirements and useful milestones, not a generic checklist.`,
    "First, verify what the destination actually requires. Next, inventory the education, experience, and skills you already have. Then identify only the missing requirements, put the planning decisions in dependency order, and define the evidence that will show each milestone is complete.",
    topics.includes("time-estimate")
      ? "A responsible time estimate needs four things I do not want to guess: your starting level, the verified scope, hours you can sustain each week, and the standard of evidence required. With those, I can give you a range and checkpoints; without them, a precise completion date would be false confidence."
      : "We should use evidence-based checkpoints: an official requirement verified, a decision made with clear tradeoffs, an application milestone completed, or a credential requirement documented.",
    isConfirmed(context.roadmap)
      ? `Your current roadmap gives us a starting frame: ${context.roadmap}`
      : "Once we confirm the destination, I can turn this into a practical now-next-later sequence.",
  ].join("\n\n");
}

function careerResponse(
  topics: readonly GuidancePlanningTopic[],
  context: GuidanceCounselorConversationContext,
  sources: readonly string[]
) {
  return [
    `${planningFrame(context)} Career progression is usually a sequence of increasing scope and evidence, not a guaranteed ladder.`,
    "I’d map the target role backward: responsibilities, required versus preferred qualifications, skills used on the job, credible proof, and the experience typically expected at the step before it. Then we can compare an education route, a credential route, and an experience-first route where each is genuinely available.",
    topics.includes("time-estimate")
      ? "Timing will depend on your starting evidence, local opportunity, hiring cycles, and the hours you can sustain. I can estimate a range after we verify the target-role requirements and inventory what you already have."
      : "The immediate goal is to find the smallest step that improves both capability and evidence without closing off better options.",
    verifiedSourceSentence(sources),
  ].join("\n\n");
}

function relationshipResponse(
  topics: readonly GuidancePlanningTopic[],
  context: GuidanceCounselorConversationContext
) {
  if (topics.includes("interests")) {
    return "Let’s look beyond subject names. What kinds of problems hold your attention, what work gives you energy, and what environments help you do your best? I’ll use those patterns to identify a few directions worth testing without locking you into one identity.";
  }
  if (topics.includes("goals")) {
    return `${planningFrame(context)} Let’s test the goal for fit, urgency, constraints, and the evidence that would count as real progress. We can keep it, refine it, pause it, or replace it; the roadmap should serve your life, not trap you in an old decision.`;
  }
  if (topics.includes("roadmap")) {
    return `${planningFrame(context)} We’ll review what changed, verify any requirements that control the route, and organize the plan into now, next, and later. The next step should be practical enough to complete and useful enough to show whether the direction still fits.`;
  }
  return "Tell me the outcome you are considering, where you are starting, and what constraints matter most—time, cost, location, schedule, or flexibility. I’ll help you separate verified requirements from assumptions, compare realistic routes, and choose a next step that keeps your options open.";
}

function conversationalGuidance(
  topics: readonly GuidancePlanningTopic[]
) {
  if (
    topics.includes("time-estimate") &&
    (topics.includes("prerequisites") || topics.includes("certification"))
  ) {
    return "A realistic timeline depends on where you’re starting, what the credential actually requires, and how much time you can give it each week. I don’t want to give you a date that sounds certain before we know those pieces.";
  }
  if (topics.includes("prerequisites") || topics.includes("certification")) {
    return "Requirements can vary, so I don’t want to guess. Once we know the exact program or credential, we can check the official requirements and see what you already have.";
  }
  if (topics.includes("college-pathway") || topics.includes("tradeoffs")) {
    return "There may be more than one good route. The best fit will depend on the time, cost, support, and flexibility that matter most to you.";
  }
  if (
    topics.includes("learning-order") ||
    topics.includes("foundations") ||
    topics.includes("time-estimate")
  ) {
    return "We’ll start with the foundation you actually need and build from there. A realistic timeline depends on where you’re starting and how much time you can give it each week.";
  }
  if (topics.includes("career-progression")) {
    return "Most careers don’t follow one perfect ladder. We can look at the work you want to do, what employers expect, and which next step would give you useful experience.";
  }
  if (topics.includes("interests")) {
    return "You don’t have to choose a permanent direction today. A few small, realistic experiences can tell us a lot about what holds your interest and what feels like a good fit.";
  }
  if (topics.includes("goals") || topics.includes("roadmap")) {
    return "We can keep the plan simple: one useful step now, then a chance to see whether the direction still feels right.";
  }
  return "You don’t need to have the whole plan figured out yet. We can start with what matters most to you and take it one step at a time.";
}

function relevantKnownContext(
  profile: GuidanceDiscoveryProfile,
  context: GuidanceCounselorConversationContext
) {
  const references: string[] = [];
  if (profile.goal || isConfirmed(context.educationalGoal)) {
    references.push(`your goal of ${profile.goal || context.educationalGoal}`);
  }
  if (profile.currentEmployment) {
    references.push(`your current work as ${profile.currentEmployment}`);
  } else if (profile.militaryExperience) {
    references.push("the military experience you shared");
  }
  if (profile.availableStudyTimeKnown) {
    references.push(`${profile.weeklyHours} study hours per week`);
  }
  if (profile.learningPreferences.length) {
    references.push(
      `your preference for ${profile.learningPreferences.slice(0, 2).join(" and ")} learning`
    );
  }
  if (profile.incomeGoal) references.push(profile.incomeGoal);
  if (profile.preferredWork) references.push("the work preferences you described");
  if (profile.familyConsiderations) {
    references.push("the family considerations you asked me to respect");
  }
  if (profile.constraints) references.push("the constraints you already identified");
  return references.slice(0, 3);
}

function conversationalGoal(value: string) {
  const goal = value.trim();
  const verb = goal.match(
    /^(?:to\s+)?(become|earn|work|study|complete|pursue|learn|get|build)\s+(.+)$/i
  );
  if (!verb) return goal;
  const gerunds: Record<string, string> = {
    become: "becoming",
    earn: "earning",
    work: "working",
    study: "studying",
    complete: "completing",
    pursue: "pursuing",
    learn: "learning",
    get: "getting",
    build: "building",
  };
  return `${gerunds[verb[1].toLowerCase()]} ${verb[2]}`;
}

function naturalContextLead(
  profile: GuidanceDiscoveryProfile,
  context: GuidanceCounselorConversationContext
) {
  const goal = profile.goal || (
    isConfirmed(context.educationalGoal) ? context.educationalGoal : ""
  );
  if (goal) {
    return `I see you’re interested in ${conversationalGoal(goal)}.`;
  }
  if (profile.currentEmployment) {
    return `Your experience as ${profile.currentEmployment} gives us something useful to build on.`;
  }
  if (profile.militaryExperience) {
    return "The experience you gained through military service gives us something useful to build on.";
  }
  return "You don’t need to have everything figured out before we start.";
}

export function buildGuidanceCounselorResponse({
  question,
  context,
}: {
  question: string;
  context: GuidanceCounselorConversationContext;
}): GuidanceCounselorReasoningResult {
  const topics = detectTopics(question);
  const authoritativeSources = sourcesFor(topics);
  const needsVerification =
    authoritativeSources.length > 0 ||
    topics.includes("prerequisites") ||
    topics.includes("time-estimate");

  let text: string;
  if (
    topics.includes("prerequisites") ||
    topics.includes("certification")
  ) {
    text = requirementsResponse(topics, context, authoritativeSources);
  } else if (
    topics.includes("college-pathway") ||
    topics.includes("tradeoffs")
  ) {
    text = pathwayResponse(topics, context, authoritativeSources);
  } else if (
    topics.includes("learning-order") ||
    topics.includes("foundations") ||
    topics.includes("time-estimate")
  ) {
    text = sequenceResponse(topics, context);
  } else if (topics.includes("career-progression")) {
    text = careerResponse(topics, context, authoritativeSources);
  } else {
    text = relationshipResponse(topics, context);
  }

  return {
    text,
    confidence: needsVerification ? "needs-verification" : "contextual",
    planningTopics: topics,
    authoritativeSources,
  };
}

export function buildGuidanceCounselorConversationTurn({
  question,
  context,
  profile,
  previousCounselorResponses = [],
  relationshipMemory,
}: {
  question: string;
  context: GuidanceCounselorConversationContext;
  profile: GuidanceDiscoveryProfile;
  previousCounselorResponses?: readonly string[];
  relationshipMemory?: GuidanceRelationshipReference;
}): GuidanceCounselorConversationTurn {
  const reasoning = buildGuidanceCounselorResponse({ question, context });
  const referencedContext = relevantKnownContext(profile, context);
  const intakeDecision = planProfessionalIntake({
    profile,
    topics: reasoning.planningTopics,
    previousCounselorResponses,
  });
  const followUp = intakeDecision?.question;
  const contextLead =
    relationshipMemory?.text || naturalContextLead(profile, context);
  const guidance = conversationalGuidance(reasoning.planningTopics);

  return {
    ...reasoning,
    followUp,
    intakeDecision,
    relationshipMemory,
    referencedContext,
    text: [contextLead, guidance, followUp]
      .filter(Boolean)
      .join("\n\n"),
  };
}
import type { GuidanceDiscoveryProfile } from "./discoveryConversation";
import type { GuidanceRelationshipReference } from "./guidanceRelationshipMemory";
import {
  planProfessionalIntake,
  type ProfessionalIntakeDecision,
} from "./professionalIntake";

// Professional intake now governs the nextGuidanceUnderstandingQuestion decision
// so purpose, prior questions, and increasing specificity shape every follow-up.
