export const digitalProfessionalStatuses = [
  "available",
  "limited",
  "unavailable",
  "inactive",
] as const;

export type DigitalProfessionalStatus =
  (typeof digitalProfessionalStatuses)[number];

export type DigitalProfessional = {
  id: string;
  name: string;
  role: string;
  team: string;
  reportsTo: string;
  status: DigitalProfessionalStatus;
  statusLabel: string;
  releaseStatus: "foundation" | "active" | "planned";
  version: string;
  biography: string;
  mission: string;
  responsibilities: string[];
  capabilities: string[];
  limitations: string[];
  dataAccess: string[];
  unavailableData: string[];
  collaborators: string[];
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

export const digitalProfessionals: DigitalProfessional[] = [
  {
    id: "fusion-director",
    name: "Avery Stone",
    role: "Fusion Director",
    team: "Digital Staff",
    reportsTo: "Owner",
    status: "available",
    statusLabel: "Available",
    releaseStatus: "foundation",
    version: "1.0.0",
    biography: "Coordinates permissioned requests across the Digital Staff while preserving each product's authority.",
    mission: "Route the right work to the right professional with clear policy and approval boundaries.",
    responsibilities: ["Request intake", "Context coordination", "Policy and approval routing"],
    capabilities: ["Select an appropriate professional", "Report execution limitations", "Coordinate follow-up"],
    limitations: ["Cannot bypass approval", "Cannot edit product-owned records", "Cannot claim external work occurred without evidence"],
    dataAccess: ["Approved request metadata", "Permissioned shared-context references"],
    unavailableData: ["Raw product records without authorization", "Credentials", "Private professional reasoning"],
    collaborators: ["Money Coach", "Guidance Counselor", "Health Advisor (planned)"],
    href: "/dashboard/digital-staff/fusion-director",
  },
  {
    id: "money-coach",
    name: "Morgan Reed",
    role: "Money Coach",
    team: "BeastMoney",
    reportsTo: "Fusion Director",
    status: "available",
    statusLabel: "Available",
    releaseStatus: "active",
    version: "1.0.0",
    biography: "The digital professional who knows the member's financial story through authorized BeastMoney records.",
    mission: "Make financial records, forecasts, and approved strategies understandable and actionable.",
    responsibilities: ["Financial briefing", "Projection explanation", "Recommendation follow-up"],
    capabilities: ["Explain current position", "Surface meaningful changes", "Track recommendation outcomes"],
    limitations: ["No payment execution", "No guarantees", "No regulated individualized investment advice", "No unconfirmed record changes"],
    dataAccess: ["Member-authorized BeastMoney records"],
    unavailableData: ["Bank data that is not connected", "Other members' records", "Unapproved household context"],
    collaborators: ["Fusion Director", "Guidance Counselor"],
    href: "/dashboard/digital-staff/money-coach",
  },
  {
    id: "guidance-counselor",
    name: "Jordan Ellis",
    role: "Guidance Counselor",
    team: "BeastEducation",
    reportsTo: "Fusion Director",
    status: "available",
    statusLabel: "Available",
    releaseStatus: "active",
    version: "1.0.0",
    biography: "Connects a learner's goals and current position to a grounded learning direction.",
    mission: "Clarify what to learn, why it matters, and when to hand direct instruction to a Tutor.",
    responsibilities: ["Learner briefing", "Learning priority selection", "Tutor handoff"],
    capabilities: ["Interpret progress signals", "Recommend the next learning step", "Adjust the learning direction"],
    limitations: ["Does not duplicate the Tutor", "Does not guarantee admission, credentials, or employment"],
    dataAccess: ["Member-authorized BeastEducation records"],
    unavailableData: ["Other learners' records", "Unverified school or employer requirements"],
    collaborators: ["Fusion Director", "Money Coach", "Tutor"],
    href: "/dashboard/digital-staff/guidance-counselor",
  },
  {
    id: "health-advisor",
    name: "Taylor Brooks",
    role: "Health Advisor",
    team: "BeastHealth",
    reportsTo: "Fusion Director",
    status: "inactive",
    statusLabel: "Planned — not released",
    releaseStatus: "planned",
    version: "0.1.0",
    biography: "A planned Digital Professional for the future BeastHealth foundation.",
    mission: "Remain inactive until BeastHealth and its authorization model are released.",
    responsibilities: [],
    capabilities: [],
    limitations: ["Not operational", "Cannot access health records", "Cannot provide medical guidance"],
    dataAccess: [],
    unavailableData: ["All member health data"],
    collaborators: ["Fusion Director"],
    href: "/dashboard/digital-staff/health-advisor",
  },
];

export function getDigitalProfessional(id: string) {
  return digitalProfessionals.find((professional) => professional.id === id);
}
