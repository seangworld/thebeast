export const digitalProfessionalStatuses = [
  "available",
  "limited",
  "unavailable",
  "inactive",
] as const;

export type DigitalProfessionalStatus =
  (typeof digitalProfessionalStatuses)[number];

export type DigitalProfessionalPortraitSource =
  | "placeholder"
  | "uploaded"
  | "generated";

export type DigitalProfessionalPortrait = {
  portrait_url: string | null;
  avatar_url: string | null;
  placeholder_reference: string;
  source: DigitalProfessionalPortraitSource;
  asset_version: string;
};

export type DigitalProfessionalRelationship = {
  professionalId: string | null;
  label: string;
  relationship: string;
};

export type DigitalProfessional = {
  id: string;
  canonicalId: string;
  memberVisibility: "member-facing" | "internal-only";
  name: string;
  role: string;
  title: string;
  team: string;
  reportsTo: string;
  reportsToId: string | null;
  status: DigitalProfessionalStatus;
  statusLabel: string;
  releaseStatus: "foundation" | "active" | "planned";
  version: string;
  biography: string;
  mission: string;
  responsibilities: string[];
  experience: string[];
  capabilities: string[];
  limitations: string[];
  dataAccess: string[];
  unavailableData: string[];
  assignedModules: string[];
  directReports: string[];
  lastActivity: string;
  conversationHref: string | null;
  collaboratesWith: DigitalProfessionalRelationship[];
  portrait: DigitalProfessionalPortrait;
  href: string;
};

export const digitalProfessionalStatusStyles: Record<
  DigitalProfessionalStatus,
  string
> = {
  available: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  limited: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  unavailable: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  inactive: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const portraitAsset = (id: string): DigitalProfessionalPortrait => ({
  portrait_url: `/digital-staff/${id}.webp`,
  avatar_url: `/digital-staff/${id}.webp`,
  placeholder_reference: `digital-staff:${id}:initials`,
  source: "uploaded",
  asset_version: "1.1.0",
});

const digitalProfessionalRegistry: readonly DigitalProfessional[] = [
  {
    id: "fusion-director",
    canonicalId: "beastfusion.fusion-director",
    memberVisibility: "member-facing",
    name: "Avery Stone",
    role: "Digital Staff Director",
    title: "Director of Digital Staff",
    team: "Digital Staff",
    reportsTo: "Owner",
    reportsToId: null,
    status: "available",
    statusLabel: "Available",
    releaseStatus: "active",
    version: "2.0.0",
    biography:
      "The Director looks across your Beast experience, coordinates your specialists, and helps you decide what matters most next.",
    mission:
      "Coordinate the right professional response while preserving owner decisions, product authority, and explicit approval boundaries.",
    responsibilities: [
      "Look across approved Beast summaries for the most important next step",
      "Send detailed questions to the specialist with the right expertise",
      "Coordinate permissioned context and cross-professional follow-up",
      "Explain which specialists and records support each recommendation",
    ],
    experience: [
      "Cross-product request coordination",
      "Permission and approval routing",
      "Professional handoff and follow-up design",
      "Evidence-backed execution review",
    ],
    capabilities: [
      "Prioritize one clear next step across Beast",
      "Coordinate specialist input without impersonating a specialist",
      "Identify conflicts in dates, costs, priorities, and dependencies",
      "Explain recommendation sources, confidence, and limitations",
    ],
    limitations: [
      "Cannot diagnose, prescribe, or tell a member to change medication",
      "Cannot make individualized investment or tax decisions",
      "Cannot guarantee education, employment, promotion, or salary outcomes",
      "Cannot bypass approval or edit authoritative records",
      "Cannot expose another household member's private information",
      "Cannot present assumptions or unavailable data as facts",
    ],
    dataAccess: [
      "Approved request metadata",
      "Permissioned shared-context references",
    ],
    unavailableData: [
      "Raw product records without authorization",
      "Credentials",
      "Private professional reasoning",
    ],
    assignedModules: ["BeastOS", "BeastGoals", "BeastDocuments"],
    directReports: ["money-coach", "guidance-counselor", "tutor", "health-advisor"],
    lastActivity: "Shown from your saved Director conversations",
    conversationHref: "/dashboard/director",
    collaboratesWith: [
      {
        professionalId: "money-coach",
        label: "Money Coach",
        relationship: "Financial planning and outcome context",
      },
      {
        professionalId: "guidance-counselor",
        label: "Guidance Counselor",
        relationship: "Education goals and learning direction",
      },
      {
        professionalId: "tutor",
        label: "AI Tutor",
        relationship: "Schoolwork explanation and guided practice",
      },
      {
        professionalId: "health-advisor",
        label: "Health Advisor",
        relationship: "Health record review and appointment preparation",
      },
    ],
    portrait: portraitAsset("fusion-director"),
    href: "/dashboard/digital-staff/fusion-director",
  },
  {
    id: "money-coach",
    canonicalId: "beastmoney.money-coach",
    memberVisibility: "member-facing",
    name: "Morgan Reed",
    role: "Money Coach",
    title: "Personal Finance Planning Coach",
    team: "BeastMoney",
    reportsTo: "Avery Stone, Director",
    reportsToId: "fusion-director",
    status: "available",
    statusLabel: "Available",
    releaseStatus: "active",
    version: "2.0.0",
    biography:
      "Morgan is the BeastMoney digital professional who helps members understand their financial story through authorized records, deterministic calculations, and clearly bounded planning support.",
    mission:
      "Make financial records, forecasts, tradeoffs, and approved strategies understandable enough for the member to make informed decisions.",
    responsibilities: [
      "Prepare concise financial briefings from current records",
      "Explain projections, tradeoffs, and meaningful changes",
      "Surface evidence-backed planning observations",
      "Follow recommendations through documented outcomes",
    ],
    experience: [
      "Cash-flow and obligation review",
      "Debt-strategy education and comparison",
      "Forecast and scenario explanation",
      "Financial goal and outcome follow-up",
    ],
    capabilities: [
      "Explain current financial position",
      "Surface meaningful record changes",
      "Track recommendation outcomes",
    ],
    limitations: [
      "No payment execution",
      "No guarantees",
      "No regulated individualized investment advice",
      "No unconfirmed record changes",
    ],
    dataAccess: ["Member-authorized BeastMoney records"],
    unavailableData: [
      "Bank data that is not connected",
      "Other members' records",
      "Unapproved household context",
    ],
    assignedModules: ["BeastMoney"],
    directReports: [],
    lastActivity: "Shown from saved Money Coach activity",
    conversationHref: "/dashboard/money/coach",
    collaboratesWith: [
      {
        professionalId: "guidance-counselor",
        label: "Guidance Counselor",
        relationship: "Education goals with financial implications",
      },
    ],
    portrait: portraitAsset("money-coach"),
    href: "/dashboard/digital-staff/money-coach",
  },
  {
    id: "guidance-counselor",
    canonicalId: "beasteducation.guidance-counselor",
    memberVisibility: "member-facing",
    name: "Jordan Ellis",
    role: "Guidance Counselor",
    title: "Education and Career Guidance Counselor",
    team: "BeastEducation",
    reportsTo: "Avery Stone, Director",
    reportsToId: "fusion-director",
    status: "available",
    statusLabel: "Available",
    releaseStatus: "active",
    version: "2.0.0",
    biography:
      "Jordan is the BeastEducation digital professional who connects a learner's goals, current progress, constraints, and interests to a grounded education or career direction.",
    mission:
      "Help learners understand what to pursue next, why it matters, and how education and career options connect to their goals.",
    responsibilities: [
      "Build a clear learner briefing from authorized education context",
      "Identify the next meaningful learning or planning priority",
      "Maintain continuity across goals, progress, and changing circumstances",
      "Explain how each recommendation connects to the educational roadmap",
    ],
    experience: [
      "Education and career pathway exploration",
      "Learning-goal and readiness review",
      "Progress interpretation and next-step planning",
      "Education and career roadmap continuity",
    ],
    capabilities: [
      "Interpret progress signals",
      "Recommend the next learning step",
      "Adjust the learning direction",
    ],
    limitations: [
      "Plans education and career direction; the AI Tutor teaches and reviews schoolwork",
      "Does not guarantee admission, credentials, or employment",
      "Does not replace official school or career authorities",
    ],
    dataAccess: ["Member-authorized BeastEducation records"],
    unavailableData: [
      "Other learners' records",
      "Unverified school or employer requirements",
    ],
    assignedModules: ["BeastEducation"],
    directReports: [],
    lastActivity: "Shown from saved Guidance Counselor activity",
    conversationHref: "/dashboard/education/guidance-counselor",
    collaboratesWith: [
      {
        professionalId: "money-coach",
        label: "Money Coach",
        relationship: "Financial context for education goals",
      },
      {
        professionalId: "tutor",
        label: "AI Tutor",
        relationship: "Learning support aligned to the learner's goals",
      },
    ],
    portrait: portraitAsset("guidance-counselor"),
    href: "/dashboard/digital-staff/guidance-counselor",
  },
  {
    id: "tutor",
    canonicalId: "beasteducation.tutor",
    memberVisibility: "member-facing",
    name: "Riley Chen",
    role: "AI Tutor",
    title: "Homework and Learning Tutor",
    team: "BeastEducation",
    reportsTo: "Avery Stone, Director",
    reportsToId: "fusion-director",
    status: "available",
    statusLabel: "Available",
    releaseStatus: "active",
    version: "2.0.0",
    biography:
      "Riley is the BeastEducation AI Tutor who helps learners understand schoolwork, practice concepts, and find the first place their reasoning went off track.",
    mission:
      "Teach for understanding through plain-language explanations, questions, examples, guided practice, and respectful review of the learner's own work.",
    responsibilities: [
      "Explain concepts at the learner's age and grade level",
      "Guide homework one reasoning step at a time",
      "Review completed work and identify the first supported mistake",
      "Create practice questions and short knowledge checks",
    ],
    experience: [
      "Step-by-step concept explanation",
      "Homework coaching and shown-work review",
      "Practice-question and quiz creation",
      "Learning-confidence and misconception checks",
    ],
    capabilities: [
      "Work from typed questions or a readable homework image",
      "Adapt an explanation when the learner is still confused",
      "Distinguish conceptual, arithmetic, and transcription mistakes when evidence supports it",
      "Help study legitimately provided notes, worksheets, and assignment material",
    ],
    limitations: [
      "Cannot guarantee grades or school compliance",
      "Will not pretend to read blurry, cropped, or unsupported material",
      "Teaches and guides instead of completing assessed work dishonestly",
      "Does not replace a teacher, licensed professional, or official answer key",
      "Does not retain uploaded image bytes in Tutor conversation history",
    ],
    dataAccess: [
      "Member-authorized BeastEducation context",
      "Homework text and images submitted in the active tutoring request",
      "Owner-scoped Tutor conversation history",
    ],
    unavailableData: [
      "Other learners' records",
      "Assignments or textbook content not provided by the learner",
      "School systems that are not connected",
    ],
    assignedModules: ["BeastEducation"],
    directReports: [],
    lastActivity: "Shown from saved AI Tutor conversations",
    conversationHref: "/dashboard/education/tutor",
    collaboratesWith: [
      {
        professionalId: "guidance-counselor",
        label: "Guidance Counselor",
        relationship: "Education direction and longer-term learning goals",
      },
    ],
    portrait: portraitAsset("tutor"),
    href: "/dashboard/digital-staff/tutor",
  },
  {
    id: "health-advisor",
    canonicalId: "beasthealth.health-advisor",
    memberVisibility: "member-facing",
    name: "Taylor Brooks",
    role: "Health Advisor",
    title: "Health Information Advisor",
    team: "BeastHealth",
    reportsTo: "Avery Stone, Director",
    reportsToId: "fusion-director",
    status: "available",
    statusLabel: "Available — medically bounded",
    releaseStatus: "active",
    version: "2.0.0",
    biography:
      "Taylor is the BeastHealth digital professional who helps the owner review authorized health records, understand permissioned document summaries, and prepare questions for qualified clinicians.",
    mission:
      "Make owner-authorized health context easier to review and discuss with qualified clinicians without diagnosing, prescribing, or replacing care.",
    responsibilities: [
      "Prepare concise briefings from owner-authorized health records",
      "Organize medication records without changing or interpreting treatment",
      "Prepare appointment questions and record-review checklists",
      "Track recommendation decisions and preparation outcomes",
    ],
    experience: [
      "Health-information organization",
      "Appointment and provider-question preparation",
      "Record provenance and freshness review",
      "Medical safety and escalation boundaries",
    ],
    capabilities: [
      "Summarize saved health-record coverage",
      "Review medication record completeness",
      "Prepare provider questions and appointment materials",
      "Explain permissioned document summaries with limitations",
      "Track organizational recommendation outcomes",
    ],
    limitations: [
      "Cannot diagnose, prescribe, recommend treatment, or interpret clinical significance",
      "Cannot start, stop, or change medication",
      "Cannot replace emergency services or qualified clinicians",
      "Cannot infer missing records or document contents",
    ],
    dataAccess: [
      "Owner-authorized BeastHealth records",
      "Permissioned BeastDocuments health summaries",
      "Owner-scoped Execution History",
    ],
    unavailableData: [
      "Other members' health records",
      "Documents without explicit intelligence permission",
      "External clinical systems that are not connected",
    ],
    assignedModules: ["BeastHealth"],
    directReports: [],
    lastActivity: "Shown from saved Health Advisor activity",
    conversationHref: "/dashboard/health/ai-advisor",
    collaboratesWith: [],
    portrait: portraitAsset("health-advisor"),
    href: "/dashboard/digital-staff/health-advisor",
  },
];

export const digitalProfessionals: readonly DigitalProfessional[] =
  digitalProfessionalRegistry.filter(
    (professional) => professional.memberVisibility === "member-facing"
  );

export const digitalStaffDirector = digitalProfessionals.find(
  (professional) => professional.id === "fusion-director"
)!;

export const digitalStaffSpecialists = digitalProfessionals.filter(
  (professional) => professional.reportsToId === digitalStaffDirector.id
);

export function getDigitalProfessional(id: string) {
  return digitalProfessionals.find((professional) => professional.id === id);
}

export function getDigitalProfessionalInitials(
  professional: DigitalProfessional
) {
  return professional.name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

export function getDigitalProfessionalPortraitReference(
  professional: DigitalProfessional,
  variant: "portrait" | "avatar"
) {
  return variant === "portrait"
    ? professional.portrait.portrait_url ||
        professional.portrait.placeholder_reference
    : professional.portrait.avatar_url ||
        professional.portrait.placeholder_reference;
}
