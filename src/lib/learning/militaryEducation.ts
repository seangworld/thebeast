export type MilitaryEducationConceptId =
  | "asvab"
  | "cool"
  | "tuition_assistance"
  | "gi_bill"
  | "skillbridge";

export type MilitaryEducationConcept = {
  id: MilitaryEducationConceptId;
  name: string;
  category: "assessment" | "credentialing" | "education_funding" | "career_transition";
  summary: string;
  questionsToVerify: string[];
  officialSource: {
    label: string;
    url: string;
    authority: string;
  };
  informationalOnly: true;
  eligibilityDetermination: false;
};

export type MilitaryEducationPlanInput = {
  learnerGoal: string;
  serviceContext?: string;
  conceptIds?: MilitaryEducationConceptId[];
};

const officialHosts = new Set([
  "officialasvab.com",
  "www.officialasvab.com",
  "cool.osd.mil",
  "www.cool.osd.mil",
  "militaryonesource.mil",
  "www.militaryonesource.mil",
  "va.gov",
  "www.va.gov",
  "skillbridge.osd.mil",
]);

export const militaryEducationConcepts: readonly MilitaryEducationConcept[] = [
  {
    id: "asvab",
    name: "ASVAB",
    category: "assessment",
    summary: "Explore the official aptitude assessment, its subtests, score information, and preparation resources.",
    questionsToVerify: [
      "Which test or retest policy applies to your situation?",
      "Which official score requirements apply to the path you are considering?",
    ],
    officialSource: {
      label: "Official ASVAB Enlistment Testing Program",
      url: "https://www.officialasvab.com/",
      authority: "ASVAB Enlistment Testing Program",
    },
    informationalOnly: true,
    eligibilityDetermination: false,
  },
  {
    id: "cool",
    name: "Credentialing Opportunities On-Line (COOL)",
    category: "credentialing",
    summary: "Explore service-specific credentials that may connect military occupations with civilian certifications and licenses.",
    questionsToVerify: [
      "Which service-specific COOL portal applies to you?",
      "What current funding, experience, or exam requirements does the official portal list?",
    ],
    officialSource: {
      label: "Credentialing Opportunities On-Line",
      url: "https://www.cool.osd.mil/",
      authority: "U.S. Department of Defense",
    },
    informationalOnly: true,
    eligibilityDetermination: false,
  },
  {
    id: "tuition_assistance",
    name: "Military Tuition Assistance",
    category: "education_funding",
    summary: "Learn where to compare education options and confirm current service-specific tuition assistance rules.",
    questionsToVerify: [
      "Which service branch rules and approval steps apply to you?",
      "Is the school, program, course, and timing currently eligible?",
    ],
    officialSource: {
      label: "Military OneSource higher education funding guide",
      url: "https://www.militaryonesource.mil/education-employment/for-service-members/need-money-for-higher-education/",
      authority: "Military OneSource",
    },
    informationalOnly: true,
    eligibilityDetermination: false,
  },
  {
    id: "gi_bill",
    name: "GI Bill benefits",
    category: "education_funding",
    summary: "Review official Veterans Affairs education benefit programs, covered training types, and application resources.",
    questionsToVerify: [
      "Which benefit program and current eligibility rules apply to your service history?",
      "How would the school, training program, enrollment level, and timing affect your benefits?",
    ],
    officialSource: {
      label: "Veterans Affairs GI Bill benefits",
      url: "https://www.va.gov/education/about-gi-bill-benefits/",
      authority: "U.S. Department of Veterans Affairs",
    },
    informationalOnly: true,
    eligibilityDetermination: false,
  },
  {
    id: "skillbridge",
    name: "SkillBridge",
    category: "career_transition",
    summary: "Explore the official career-transition program and its current participant and provider information.",
    questionsToVerify: [
      "Does your command and service policy permit participation for your timing and circumstances?",
      "Which opportunities and approval steps are currently listed by the official program?",
    ],
    officialSource: {
      label: "Official SkillBridge program",
      url: "https://skillbridge.osd.mil/",
      authority: "U.S. Department of Defense",
    },
    informationalOnly: true,
    eligibilityDetermination: false,
  },
] as const;

export const militaryEducationBoundaries = [
  "BeastLearning organizes informational planning resources; it does not recruit, determine eligibility, approve benefits, or promise education, credential, career, or service outcomes.",
  "Program rules, benefits, deadlines, availability, and service requirements can change and must be confirmed with the linked official source and an authorized counselor or program representative.",
  "Learners choose which options to investigate; BeastLearning does not rank programs or make a benefit recommendation.",
] as const;

export function validateMilitaryEducationCatalog(
  concepts: readonly MilitaryEducationConcept[] = militaryEducationConcepts
) {
  const issues: string[] = [];
  const ids = new Set<string>();

  for (const concept of concepts) {
    if (ids.has(concept.id)) issues.push(`Duplicate concept id: ${concept.id}.`);
    ids.add(concept.id);

    let source: URL | null = null;
    try {
      source = new URL(concept.officialSource.url);
    } catch {
      issues.push(`${concept.id} must link to a valid official source URL.`);
    }
    if (source && (source.protocol !== "https:" || !officialHosts.has(source.hostname))) {
      issues.push(`${concept.id} must link to an approved HTTPS government or official program source.`);
    }
    if (!concept.informationalOnly || concept.eligibilityDetermination) {
      issues.push(`${concept.id} must remain informational and may not determine eligibility.`);
    }
    if (concept.questionsToVerify.length < 2) {
      issues.push(`${concept.id} must include actionable official-source verification questions.`);
    }
  }

  const requiredIds: MilitaryEducationConceptId[] = [
    "asvab",
    "cool",
    "tuition_assistance",
    "gi_bill",
    "skillbridge",
  ];
  for (const id of requiredIds) {
    if (!ids.has(id)) issues.push(`Missing required military education concept: ${id}.`);
  }

  return issues;
}

export function buildMilitaryEducationPlan(input: MilitaryEducationPlanInput) {
  const requested = input.conceptIds?.length
    ? Array.from(new Set(input.conceptIds))
    : militaryEducationConcepts.map(({ id }) => id);
  const concepts = requested
    .map((id) => militaryEducationConcepts.find((concept) => concept.id === id))
    .filter((concept): concept is MilitaryEducationConcept => Boolean(concept));

  return {
    learnerGoal: input.learnerGoal.trim() || "Explore military education options",
    serviceContext: input.serviceContext?.trim() || null,
    concepts,
    nextSteps: [
      "Open each relevant official source and verify current requirements.",
      "Write down the questions that apply to your goal and service context.",
      "Confirm decisions with an authorized education counselor, benefits representative, or program office.",
    ],
    boundaries: militaryEducationBoundaries,
    ranked: false as const,
    eligibilityDetermined: false as const,
  };
}
