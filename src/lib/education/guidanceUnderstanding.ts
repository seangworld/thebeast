import type { GuidanceDiscoveryProfile } from "./discoveryConversation";

export type GuidanceUnderstandingConfidence =
  | "high"
  | "medium"
  | "unknown";

export type GuidanceUnderstandingState = "known" | "thought" | "needed";

export type GuidanceUnderstandingArea =
  | "education-history"
  | "career-goals"
  | "educational-goals"
  | "current-situation"
  | "schools"
  | "degrees"
  | "certifications"
  | "military-training"
  | "experience"
  | "skills"
  | "strengths"
  | "growth-areas"
  | "learning-style"
  | "weekly-study-time"
  | "education-budget"
  | "gi-bill"
  | "vre"
  | "employer-reimbursement"
  | "scholarship-interest"
  | "timeline"
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
    profile.educationHistory.length || profile.otherEducationalContext
      ? known(
          "education-history",
          "Educational journey",
          profile.educationHistory.join("; ") ||
            profile.otherEducationalContext,
          5,
          ["member-described education history"]
        )
      : needed(
          "education-history",
          "Educational journey",
          "Tell me about your educational journey.",
          5
        ),
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
    profile.currentEmployment || profile.currentSituation
      ? known(
          "current-situation",
          "Current career or situation",
          profile.currentEmployment || profile.currentSituation,
          30,
          ["member-described current work or situation"]
        )
      : needed(
          "current-situation",
          "Current career or situation",
          "What does your current work, school, or military situation look like?",
          30
        ),
    profile.schools.length
      ? known(
          "schools",
          "Schools",
          profile.schools.join("; "),
          40,
          ["member-described schools"]
        )
      : needed(
          "schools",
          "Schools",
          "Which schools have you attended or are you considering?",
          40
        ),
    profile.degrees.length
      ? known(
          "degrees",
          "Degrees",
          profile.degrees.join("; "),
          45,
          ["member-described degree history"]
        )
      : needed(
          "degrees",
          "Degrees",
          "What should I know about degrees you have completed or are considering?",
          45
        ),
    profile.certifications.length
      ? known(
          "certifications",
          "Certifications",
          profile.certifications.join("; "),
          50,
          ["member-described certifications"]
        )
      : needed(
          "certifications",
          "Certifications",
          "What certifications or credentials have you earned or considered?",
          50
        ),
    profile.militaryTraining.length || profile.militaryExperience
      ? known(
          "military-training",
          "Military training",
          profile.militaryTraining.join("; ") ||
            profile.militaryExperience,
          55,
          ["member-described military education or training"]
        )
      : needed(
          "military-training",
          "Military training",
          "Is there military education, training, or experience that should count toward the plan?",
          55
        ),
    profile.experience.length
      ? known(
          "experience",
          "Experience",
          profile.experience.join("; "),
          60,
          ["member-described experience"]
        )
      : needed(
          "experience",
          "Experience",
          "What work or life experience should I consider when we compare paths?",
          60
        ),
    profile.skills.length
      ? known(
          "skills",
          "Skills",
          profile.skills.join("; "),
          65,
          ["member-described skills"]
        )
      : needed(
          "skills",
          "Skills",
          "Which skills do you already use confidently?",
          65
        ),
    profile.strengths
      ? known("strengths", "Strengths", profile.strengths, 70, ["stated strengths"])
      : needed(
          "strengths",
          "Strengths",
          "What kind of work or learning tends to come naturally to you?",
          70
        ),
    profile.growthAreas
      ? known(
          "growth-areas",
          "Areas to strengthen",
          profile.growthAreas,
          75,
          ["stated growth area"]
        )
      : needed(
          "growth-areas",
          "Areas to strengthen",
          "What is one skill or area you most want to strengthen?",
          75
        ),
    profile.learningPreferences.length
      ? known(
          "learning-style",
          "Learning preferences",
          profile.learningPreferences.join(", "),
          80,
          ["member-described learning preferences"]
        )
      : needed(
          "learning-style",
          "Learning preferences",
          "When learning goes well for you, what usually helps it click?",
          80
        ),
    profile.availableStudyTimeKnown
      ? known(
          "weekly-study-time",
          "Weekly study time",
          `${profile.weeklyHours} hours per week`,
          85,
          ["stated weekly availability"]
        )
      : needed(
          "weekly-study-time",
          "Weekly study time",
          "How many hours could you realistically protect for this in a typical week?",
          85
        ),
    profile.educationBudget
      ? known(
          "education-budget",
          "Education budget",
          profile.educationBudget,
          90,
          ["member-described budget"]
        )
      : needed(
          "education-budget",
          "Education budget",
          "What budget or affordability limit should shape the plan?",
          90
        ),
    profile.giBill !== null
      ? known(
          "gi-bill",
          "GI Bill",
          profile.giBill ? "Available for consideration" : "Not available",
          95,
          ["member-described GI Bill status"]
        )
      : needed(
          "gi-bill",
          "GI Bill",
          "Do you have GI Bill benefits you want considered?",
          95
        ),
    profile.vre !== null
      ? known(
          "vre",
          "VR&E",
          profile.vre ? "Available for consideration" : "Not available",
          100,
          ["member-described VR&E status"]
        )
      : needed(
          "vre",
          "VR&E",
          "Is VR&E available or worth investigating for your plan?",
          100
        ),
    profile.employerReimbursement !== null
      ? known(
          "employer-reimbursement",
          "Employer reimbursement",
          profile.employerReimbursement
            ? "Available for consideration"
            : "Not available",
          105,
          ["member-described employer benefit"]
        )
      : needed(
          "employer-reimbursement",
          "Employer reimbursement",
          "Does your employer offer tuition assistance or reimbursement?",
          105
        ),
    profile.scholarshipInterest !== null
      ? known(
          "scholarship-interest",
          "Scholarships",
          profile.scholarshipInterest
            ? "Include scholarship planning"
            : "Not currently part of the plan",
          110,
          ["member-described scholarship interest"]
        )
      : needed(
          "scholarship-interest",
          "Scholarships",
          "Should scholarships be part of the funding plan?",
          110
        ),
    profile.targetTimeline
      ? known(
          "timeline",
          "Timeline",
          profile.targetTimeline,
          115,
          ["member-described timeline"]
        )
      : needed(
          "timeline",
          "Timeline",
          "Is there a timeline or deadline that should shape the plan?",
          115
        ),
    profile.constraints
      ? known(
          "constraints",
          "Planning constraints",
          profile.constraints,
          120,
          ["stated practical constraint"]
        )
      : needed(
          "constraints",
          "Planning constraints",
          "Which practical constraint should I plan around first: cost, time, schedule, location, or family responsibilities?",
          120
        ),
    profile.collegeInterest !== null
      ? known(
          "college-interest",
          "College interest",
          profile.collegeInterest ? "Interested" : "Not currently interested",
          125,
          ["stated college interest"]
        )
      : needed(
          "college-interest",
          "College interest",
          "Is college currently one of the paths you want us to consider?",
          125
        ),
    profile.tradeInterest !== null
      ? known(
          "trade-interest",
          "Trade interest",
          profile.tradeInterest ? "Interested" : "Not currently interested",
          130,
          ["stated trade interest"]
        )
      : needed(
          "trade-interest",
          "Trade interest",
          "Would you like us to consider skilled trades or apprenticeship paths?",
          130
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
  prerequisites: [
    "education-history",
    "degrees",
    "certifications",
    "experience",
  ],
  certification: ["certifications", "experience"],
  "time-estimate": ["weekly-study-time"],
  "college-pathway": [
    "college-interest",
    "schools",
    "education-budget",
    "timeline",
  ],
  tradeoffs: [
    "constraints",
    "education-budget",
    "college-interest",
    "trade-interest",
  ],
  "career-progression": ["career-goals", "current-situation"],
  interests: ["strengths", "skills", "learning-style"],
  "learning-order": ["growth-areas", "skills", "learning-style"],
  foundations: ["growth-areas", "education-history", "experience"],
  goals: ["career-goals", "educational-goals"],
  roadmap: [
    "career-goals",
    "constraints",
    "weekly-study-time",
    "timeline",
  ],
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
