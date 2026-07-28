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

const portraitPlaceholder = (id: string): DigitalProfessionalPortrait => ({
  portrait_url: null,
  avatar_url: null,
  placeholder_reference: `digital-staff:${id}:initials`,
  source: "placeholder",
  asset_version: "1.0.0",
});

export const digitalProfessionals: readonly DigitalProfessional[] = [
  {
    id: "fusion-director",
    name: "Avery Stone",
    role: "Fusion Director",
    title: "Director of Digital Staff Operations",
    team: "Digital Staff",
    reportsTo: "Owner",
    reportsToId: null,
    status: "available",
    statusLabel: "Available — coordination foundation",
    releaseStatus: "foundation",
    version: "1.1.0",
    biography:
      "Avery is the Digital Staff coordination professional. The role receives permissioned requests, identifies the right product-owned professional, and keeps approvals, evidence, and follow-up visible without becoming a super-agent.",
    mission:
      "Coordinate the right professional response while preserving owner decisions, product authority, and explicit approval boundaries.",
    responsibilities: [
      "Receive and classify owner-approved requests",
      "Route work to the professional with the correct product authority",
      "Coordinate permissioned context and cross-professional follow-up",
      "Keep limitations, approvals, and execution evidence visible",
    ],
    experience: [
      "Cross-product request coordination",
      "Permission and approval routing",
      "Professional handoff and follow-up design",
      "Evidence-backed execution review",
    ],
    capabilities: [
      "Select an appropriate professional",
      "Report execution limitations",
      "Coordinate approved follow-up",
    ],
    limitations: [
      "Cannot bypass approval",
      "Cannot edit product-owned records",
      "Cannot claim external work occurred without evidence",
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
        professionalId: "health-advisor",
        label: "Health Advisor",
        relationship: "Planned health-information coordination",
      },
    ],
    portrait: portraitPlaceholder("fusion-director"),
    href: "/dashboard/digital-staff/fusion-director",
  },
  {
    id: "money-coach",
    name: "Morgan Reed",
    role: "Money Coach",
    title: "Personal Finance Planning Coach",
    team: "BeastMoney",
    reportsTo: "Fusion Director",
    reportsToId: "fusion-director",
    status: "available",
    statusLabel: "Available",
    releaseStatus: "active",
    version: "1.1.0",
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
    collaboratesWith: [
      {
        professionalId: "fusion-director",
        label: "Fusion Director",
        relationship: "Permissioned coordination and follow-up",
      },
      {
        professionalId: "guidance-counselor",
        label: "Guidance Counselor",
        relationship: "Education goals with financial implications",
      },
    ],
    portrait: portraitPlaceholder("money-coach"),
    href: "/dashboard/digital-staff/money-coach",
  },
  {
    id: "guidance-counselor",
    name: "Jordan Ellis",
    role: "Guidance Counselor",
    title: "Education and Career Guidance Counselor",
    team: "BeastEducation",
    reportsTo: "Fusion Director",
    reportsToId: "fusion-director",
    status: "available",
    statusLabel: "Available",
    releaseStatus: "active",
    version: "1.1.0",
    biography:
      "Jordan is the BeastEducation digital professional who connects a learner's goals, current progress, constraints, and interests to a grounded education or career direction.",
    mission:
      "Help learners understand what to pursue next, why it matters, and when direct instruction should move to an appropriate Tutor.",
    responsibilities: [
      "Build a clear learner briefing from authorized education context",
      "Identify the next meaningful learning or planning priority",
      "Maintain continuity across goals, progress, and changing circumstances",
      "Coordinate focused Tutor handoffs when instruction is needed",
    ],
    experience: [
      "Education and career pathway exploration",
      "Learning-goal and readiness review",
      "Progress interpretation and next-step planning",
      "Tutor handoff and learning continuity",
    ],
    capabilities: [
      "Interpret progress signals",
      "Recommend the next learning step",
      "Adjust the learning direction",
    ],
    limitations: [
      "Does not duplicate the Tutor",
      "Does not guarantee admission, credentials, or employment",
      "Does not replace official school or career authorities",
    ],
    dataAccess: ["Member-authorized BeastEducation records"],
    unavailableData: [
      "Other learners' records",
      "Unverified school or employer requirements",
    ],
    collaboratesWith: [
      {
        professionalId: "fusion-director",
        label: "Fusion Director",
        relationship: "Permissioned coordination and follow-up",
      },
      {
        professionalId: "money-coach",
        label: "Money Coach",
        relationship: "Financial context for education goals",
      },
      {
        professionalId: null,
        label: "Tutor",
        relationship: "Focused instruction after a documented handoff",
      },
    ],
    portrait: portraitPlaceholder("guidance-counselor"),
    href: "/dashboard/digital-staff/guidance-counselor",
  },
  {
    id: "health-advisor",
    name: "Taylor Brooks",
    role: "Health Advisor",
    title: "Health Information Advisor",
    team: "BeastHealth",
    reportsTo: "Fusion Director",
    reportsToId: "fusion-director",
    status: "inactive",
    statusLabel: "Planned — not released or operational",
    releaseStatus: "planned",
    version: "0.2.0",
    biography:
      "Taylor is the planned BeastHealth digital professional identity. The profile defines a future health-information support role without activating health access, medical guidance, or member-facing functionality.",
    mission:
      "Remain transparently inactive until BeastHealth, its authorization model, and its safety controls are separately approved and released.",
    responsibilities: [
      "Future health-record context explanation",
      "Future appointment and question preparation",
      "Future evidence and freshness review",
      "Future coordination within approved health boundaries",
    ],
    experience: [
      "Planned health-information explanation",
      "Planned care-preparation support",
      "Planned health-record context review",
      "Safety and escalation boundary design",
    ],
    capabilities: [],
    limitations: [
      "Not operational",
      "Cannot access health records",
      "Cannot diagnose, prescribe, or provide medical guidance",
      "Cannot replace emergency services or qualified clinicians",
    ],
    dataAccess: [],
    unavailableData: ["All member health data"],
    collaboratesWith: [
      {
        professionalId: "fusion-director",
        label: "Fusion Director",
        relationship: "Future permissioned coordination only",
      },
    ],
    portrait: portraitPlaceholder("health-advisor"),
    href: "/dashboard/digital-staff/health-advisor",
  },
];

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
