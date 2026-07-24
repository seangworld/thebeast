import type { GuidanceDiscoveryProfile } from "./discoveryConversation";

export type GuidanceUnderstandingConfidence =
  | "high"
  | "medium"
  | "unknown";

export type GuidanceUnderstandingState = "known" | "thought" | "needed";

export type GuidanceUnderstandingArea =
  | "career-goals"
  | "educational-goals"
  | "current-situation"
  | "prior-experience"
  | "strengths"
  | "growth-areas"
  | "learning-style"
  | "weekly-study-time"
  | "constraints"
  | "college-interest"
  | "trade-interest";

export type GuidanceUnderstandingItem = {
  area: GuidanceUnderstandingArea;
  label: string;
  state: GuidanceUnderstandingState;
  confidence: GuidanceUnderstandingConfidence;
  value?: string;
  evidence: readonly string[];
  question?: string;
  priority: number;
};

export type GuidanceCounselorUnderstanding = {
  items: readonly GuidanceUnderstandingItem[];
  whatIKnow: readonly GuidanceUnderstandingItem[];
  whatIThink: readonly GuidanceUnderstandingItem[];
  whatIStillNeed: readonly GuidanceUnderstandingItem[];
};

function known(
  area: GuidanceUnderstandingArea,
  label: string,
  value: string,
  priority: number,
  evidence: readonly string[]
): GuidanceUnderstandingItem {
  return {
    area,
    label,
    value,
    priority,
    evidence,
    state: "known",
    confidence: "high",
  };
}

function thought(
  area: GuidanceUnderstandingArea,
  label: string,
  value: string,
  priority: number,
  evidence: readonly string[]
): GuidanceUnderstandingItem {
  return {
    area,
    label,
    value,
    priority,
    evidence,
    state: "thought",
    confidence: "medium",
  };
}

function needed(
  area: GuidanceUnderstandingArea,
  label: string,
  question: string,
  priority: number
): GuidanceUnderstandingItem {
  return {
    area,
    label,
    question,
    priority,
    evidence: [],
    state: "needed",
    confidence: "unknown",
  };
}

export function buildGuidanceCounselorUnderstanding(
  profile: GuidanceDiscoveryProfile
): GuidanceCounselorUnderstanding {
  const items: GuidanceUnderstandingItem[] = [
    profile.goal
      ? known("career-goals", "Career goals", profile.goal, 10, ["stated goal"])
      : profile.careerInterests.length
        ? thought(
            "career-goals",
            "Career goals",
            profile.careerInterests.join(", "),
            10,
            ["expressed career interests"]
          )
        : needed(
            "career-goals",
            "Career goals",
            "What would you most like education or career guidance to help you change?",
            10
          ),
    profile.educationalGoals.length
      ? known(
          "educational-goals",
          "Educational goals",
          profile.educationalGoals.join("; "),
          20,
          ["stated education direction"]
        )
      : needed(
          "educational-goals",
          "Educational goals",
          "What educational outcome would feel most useful to you right now?",
          20
        ),
    profile.currentEmployment || profile.militaryExperience || profile.currentSituation
      ? known(
          "current-situation",
          "Current situation",
          profile.currentEmployment ||
            profile.militaryExperience ||
            profile.currentSituation,
          30,
          ["member-described current situation"]
        )
      : needed(
          "current-situation",
          "Current situation",
          "What does your current work, school, or military situation look like?",
          30
        ),
    profile.otherEducationalContext || profile.certifications.length
      ? known(
          "prior-experience",
          "Education and experience",
          [
            profile.otherEducationalContext,
            profile.certifications.join(", "),
          ]
            .filter(Boolean)
            .join("; "),
          40,
          ["reported education, training, or credentials"]
        )
      : needed(
          "prior-experience",
          "Education and experience",
          "What relevant education, training, certifications, or experience are you already bringing with you?",
          40
        ),
    profile.strengths
      ? known("strengths", "Strengths", profile.strengths, 50, ["stated strengths"])
      : needed(
          "strengths",
          "Strengths",
          "What kind of work or learning tends to come naturally to you?",
          50
        ),
    profile.growthAreas
      ? known(
          "growth-areas",
          "Areas to strengthen",
          profile.growthAreas,
          60,
          ["stated growth area"]
        )
      : needed(
          "growth-areas",
          "Areas to strengthen",
          "What is one skill or area you most want to strengthen?",
          60
        ),
    profile.learningPreferences.length
      ? thought(
          "learning-style",
          "Learning style",
          profile.learningPreferences.join(", "),
          70,
          ["observed learning preferences"]
        )
      : needed(
          "learning-style",
          "Learning style",
          "When learning goes well for you, what usually helps it click?",
          70
        ),
    profile.availableStudyTimeKnown
      ? known(
          "weekly-study-time",
          "Weekly study time",
          `${profile.weeklyHours} hours per week`,
          80,
          ["stated weekly availability"]
        )
      : needed(
          "weekly-study-time",
          "Weekly study time",
          "How many hours could you realistically protect for this in a typical week?",
          80
        ),
    profile.constraints
      ? known(
          "constraints",
          "Planning constraints",
          profile.constraints,
          90,
          ["stated practical constraint"]
        )
      : needed(
          "constraints",
          "Planning constraints",
          "Which practical constraint should I plan around first: cost, time, schedule, location, or family responsibilities?",
          90
        ),
    profile.collegeInterest !== null
      ? known(
          "college-interest",
          "College interest",
          profile.collegeInterest ? "Interested" : "Not currently interested",
          100,
          ["stated college interest"]
        )
      : needed(
          "college-interest",
          "College interest",
          "Is college currently one of the paths you want us to consider?",
          100
        ),
    profile.tradeInterest !== null
      ? known(
          "trade-interest",
          "Trade interest",
          profile.tradeInterest ? "Interested" : "Not currently interested",
          110,
          ["stated trade interest"]
        )
      : needed(
          "trade-interest",
          "Trade interest",
          "Would you like us to consider skilled trades or apprenticeship paths?",
          110
        ),
  ];

  return {
    items,
    whatIKnow: items.filter((item) => item.state === "known"),
    whatIThink: items.filter((item) => item.state === "thought"),
    whatIStillNeed: items.filter((item) => item.state === "needed"),
  };
}

const topicAreas: Record<string, readonly GuidanceUnderstandingArea[]> = {
  prerequisites: ["prior-experience"],
  certification: ["prior-experience"],
  "time-estimate": ["weekly-study-time"],
  "college-pathway": ["college-interest", "constraints"],
  tradeoffs: ["constraints", "college-interest", "trade-interest"],
  "career-progression": ["career-goals", "current-situation"],
  interests: ["strengths", "learning-style"],
  "learning-order": ["growth-areas", "learning-style"],
  foundations: ["growth-areas", "prior-experience"],
  goals: ["career-goals", "educational-goals"],
  roadmap: ["career-goals", "constraints", "weekly-study-time"],
};

export function nextGuidanceUnderstandingQuestion(
  understanding: GuidanceCounselorUnderstanding,
  topics: readonly string[] = []
) {
  const topicPriority = [
    "time-estimate",
    "prerequisites",
    "certification",
    "college-pathway",
    "tradeoffs",
    "career-progression",
    "learning-order",
    "foundations",
    "interests",
    "goals",
    "roadmap",
  ];
  const focusedAreas = topicPriority
    .filter((topic) => topics.includes(topic))
    .flatMap((topic) => topicAreas[topic] || []);
  const focused = focusedAreas
    .map((area) =>
      understanding.whatIStillNeed.find((item) => item.area === area)
    )
    .find(Boolean);
  if (topics.length > 0) return focused;
  return (
    [...understanding.whatIStillNeed].sort(
      (left, right) => left.priority - right.priority
    )[0]
  );
}
