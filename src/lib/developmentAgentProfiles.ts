import type { BeastAdminCanonicalReadModel } from "./beastAdminCanonicalProjection";
import {
  getDevelopmentAgentCapabilityAssessment,
  publicDevelopmentAgentCapabilityAssessment,
} from "./developmentAgentCapabilityFramework";

export type DevelopmentAgentProfile = {
  id: "orchestrator-3" | "observer-agent" | "proposal-agent" | "developer-agent" | "reviewer-agent" | "outcome-agent";
  name: string;
  title: string;
  role: string;
  purpose: string;
  portraitUrl: string;
  portraitAlt: string;
  responsibilities: readonly string[];
  limitations: readonly string[];
  relationships: readonly { label: string; detail: string }[];
  reviewDimensions: readonly string[];
  verdictModel: readonly string[];
  escalationConditions: readonly string[];
  authorityBoundary: string;
  foundationPackage: "BF-ORCH-004" | "BF-AGT-005" | "BF-AGT-006" | "BF-AGT-002" | "BF-AGT-003" | "BF-AGT-007";
};

export type DevelopmentAgentCanonicalState = {
  status: "available" | "source-unavailable";
  statusLabel: string;
  assignmentLabel: string;
  recentActivity: BeastAdminCanonicalReadModel["execution"];
  validationSummary: string;
  evidenceReference: string | null;
  verdictLabel: string | null;
  sourceDetail: string;
};

export const developmentAgentProfiles: readonly DevelopmentAgentProfile[] = [
  {
    id: "orchestrator-3", name: "Orchestrator 3.0", title: "Governed strategy lifecycle coordinator", role: "Coordinates evidence from observation through owner proposal gates and post-release evaluation", purpose: "Connect the outer strategy loop to the existing Orchestrator 2.x development and release workflow without inheriting owner authority.",
    portraitUrl: "/digital-staff/orchestrator-3.webp", portraitAlt: "Portrait of Orchestrator 3.0, governed strategy lifecycle coordinator",
    responsibilities: ["Coordinate Observe through Recommend lifecycle stages", "Route evidence-backed proposals to the owner gate", "Hand approved proposals to existing Orchestrator 2.x validation", "Preserve lifecycle provenance and stop conditions"],
    limitations: ["Cannot self-authorize or execute generated proposals", "Cannot spend, contract, or change privacy or security policy", "Cannot bypass owner gates", "Cannot release without governed authority"],
    relationships: [{ label: "Owner", detail: "Receives proposals and retains all material authorization." }, { label: "Specialist agents", detail: "Coordinates Observer, Proposal, Developer, Reviewer, and Outcome roles without merging their independence." }, { label: "Orchestrator 2.x", detail: "Hands owner-approved proposals to the existing executable-package authorization layer." }],
    reviewDimensions: [], verdictModel: [], escalationConditions: ["Any proposal needs material work authorization", "Any spend, contract, policy, privacy, security, or Production decision", "Evidence or canonical state is incomplete"], authorityBoundary: "Orchestrator coordinates. It cannot self-authorize, bypass the owner, or release without governed authority.", foundationPackage: "BF-ORCH-004",
  },
  {
    id: "observer-agent", name: "Observer / Operations Agent", title: "Evidence-backed signal detector", role: "Detects meaningful changes in explicitly authorized operational sources", purpose: "Compare aggregate signals with recorded baselines, suppress noise and duplicates, and recommend bounded investigation when evidence warrants it.",
    portraitUrl: "/digital-staff/observer-agent.webp", portraitAlt: "Portrait of Observer / Operations Agent, evidence-backed signal detector",
    responsibilities: ["Read only authorized aggregate sources", "Record signal, baseline, magnitude, confidence, impact, and urgency", "Suppress normal noise and unchanged duplicates", "Recommend investigation or monitoring"],
    limitations: ["Cannot turn an observation into work authorization", "Cannot use private member records or credentials as evidence", "Cannot diagnose beyond available evidence", "Cannot mutate products or release"],
    relationships: [{ label: "Orchestrator 3.0", detail: "Returns durable observations for bounded investigation or monitoring." }, { label: "Owner", detail: "The owner retains authority over any resulting proposal." }],
    reviewDimensions: [], verdictModel: ["INVESTIGATE", "MONITOR", "IGNORE"], escalationConditions: ["Production, security, or privacy signal", "Material baseline change", "Source authorization or evidence quality is unclear"], authorityBoundary: "Observer detects and recommends investigation. An observation is never authorization to act.", foundationPackage: "BF-AGT-005",
  },
  {
    id: "proposal-agent", name: "Research + Planning / Proposal Agent", title: "Evidence-to-options specialist", role: "Turns bounded investigations into alternatives and non-executable recommendations", purpose: "Give the owner a traceable problem statement, evidence, assumptions, unknowns, options, tradeoffs, expected outcome, risk, cost, validation, and rollback.",
    portraitUrl: "/digital-staff/proposal-agent.webp", portraitAlt: "Portrait of Research + Planning / Proposal Agent, evidence-to-options specialist",
    responsibilities: ["Research only the bounded investigated question", "Present alternatives and tradeoffs", "Identify assumptions, unknowns, cost, risk, and dependencies", "Stop every proposal at owner approval"],
    limitations: ["Cannot approve or execute its own proposal", "Cannot hide uncertainty or invent evidence", "Cannot create a release candidate", "Cannot bypass Orchestrator 2.x intake after owner approval"],
    relationships: [{ label: "Observer Agent", detail: "Uses observation provenance and a bounded evidence-complete investigation." }, { label: "Orchestrator 3.0", detail: "Returns a non-executable proposal for owner review." }, { label: "Owner", detail: "The owner approves, rejects, or requests changes." }],
    reviewDimensions: [], verdictModel: ["AWAITING OWNER APPROVAL", "APPROVED FOR ORCHESTRATOR 2.x INTAKE", "CHANGES REQUESTED", "REJECTED"], escalationConditions: ["Material ambiguity or unresolved risk", "Spend, contract, policy, privacy, or security implications", "No defensible alternative or validation plan"], authorityBoundary: "Proposal Agent recommends. Every proposal remains non-executable until the owner acts and existing governance validates it.", foundationPackage: "BF-AGT-006",
  },
  {
    id: "developer-agent",
    name: "Developer Agent",
    title: "Bounded implementation specialist",
    role: "Builds owner-authorized work assigned by Orchestrator",
    purpose: "Inspect, implement, correct ordinary defects, validate, and return reviewer-ready evidence inside one governed assignment.",
    portraitUrl: "/digital-staff/developer-agent.webp",
    portraitAlt: "Portrait of Developer Agent, bounded implementation specialist",
    responsibilities: [
      "Build only the package and repository scope assigned by Orchestrator",
      "Protect pre-existing workspace changes and preserve exact candidate identity",
      "Run required validation and return structured implementation evidence",
      "Correct ordinary in-scope defects before returning the candidate",
    ],
    limitations: [
      "Cannot authorize itself or select roadmap work",
      "Cannot expand scope or bypass prerequisites",
      "Cannot independently review its own candidate",
      "Cannot merge, deploy, or release its own work",
    ],
    relationships: [
      { label: "Orchestrator", detail: "Receives the bounded objective, permitted scope, constraints, and validation contract." },
      { label: "Reviewer Agent", detail: "Returns an exact candidate and evidence for independent review." },
      { label: "Owner", detail: "The owner retains scope, acceptance, and release authority." },
    ],
    reviewDimensions: [],
    verdictModel: [],
    escalationConditions: [
      "Material scope or architectural change",
      "Missing authorization, prerequisites, repository access, or credentials",
      "Security, privacy, destructive-operation, paid-service, or Production decisions",
    ],
    authorityBoundary: "Developer Agent builds authorized work but cannot authorize itself, expand scope, or release its own work.",
    foundationPackage: "BF-AGT-002",
  },
  {
    id: "reviewer-agent",
    name: "Reviewer Agent",
    title: "Independent candidate quality gate",
    role: "Independently checks Developer Agent work for Orchestrator",
    purpose: "Bind review evidence to the exact Developer candidate and evaluate it against the authorized objective without trusting the completion claim by itself.",
    portraitUrl: "/digital-staff/reviewer-agent.webp",
    portraitAlt: "Portrait of Reviewer Agent, independent candidate quality gate",
    responsibilities: [
      "Inspect the exact candidate, changed files, tests, evidence, and unresolved risks",
      "Verify the authorized objective and acceptance criteria",
      "Return precise findings and a governed verdict to Orchestrator",
      "Re-review bounded remediation without becoming the implementer",
    ],
    limitations: [
      "Cannot implement or silently repair the candidate it reviews",
      "Cannot select, dispatch, approve, merge, deploy, or release work",
      "Cannot expand the authorized scope or waive material findings",
      "A PASS does not equal owner acceptance or release authorization",
    ],
    relationships: [
      { label: "Developer Agent", detail: "Independently checks the exact candidate and may return bounded findings for remediation." },
      { label: "Orchestrator", detail: "Receives the review assignment and returns the verdict, findings, and evidence." },
      { label: "Owner", detail: "The owner alone accepts material decisions and authorizes release." },
    ],
    reviewDimensions: ["Scope", "Correctness", "Tests", "Evidence", "Quality", "Security and privacy"],
    verdictModel: ["PASS", "PASS WITH NOTES", "RETURN TO DEVELOPER", "OWNER DECISION REQUIRED"],
    escalationConditions: [
      "Material product, requirements, policy, security, or privacy decision",
      "Candidate identity or evidence cannot be verified",
      "Bounded remediation limit is exhausted",
    ],
    authorityBoundary: "Reviewer Agent independently checks Developer Agent work, but a PASS does not equal owner release authorization.",
    foundationPackage: "BF-AGT-003",
  },
  {
    id: "outcome-agent", name: "Outcome / Post-Release Evaluation Agent", title: "Independent outcome evaluator", role: "Measures a verified exact release candidate against its recorded baseline", purpose: "Report success, mixed results, regression, or insufficient evidence without confusing correlation with causation.",
    portraitUrl: "/digital-staff/outcome-agent.webp", portraitAlt: "Portrait of Outcome / Post-Release Evaluation Agent, independent outcome evaluator",
    responsibilities: ["Bind evaluation to the verified exact candidate", "Compare the declared metric, baseline, and measurement window", "Record confidence and evidence limitations", "Recommend monitoring or owner review"],
    limitations: ["Cannot claim the release caused a metric change without causal evidence", "Cannot roll back or modify a release", "Cannot authorize remediation or successor work", "Cannot reinterpret incomplete evidence as success"],
    relationships: [{ label: "Orchestrator 3.0", detail: "Returns durable evaluation evidence and a bounded recommendation." }, { label: "Owner", detail: "The owner decides whether any follow-up proposal should proceed." }],
    reviewDimensions: ["Exact candidate provenance", "Baseline and measurement comparability", "Confidence and evidence completeness", "Causal-claim restraint"], verdictModel: ["SUCCESS", "MIXED", "REGRESSION", "INSUFFICIENT EVIDENCE"], escalationConditions: ["Material regression", "Metric or candidate mismatch", "Insufficient or conflicting evidence"], authorityBoundary: "Outcome Agent measures and recommends. It cannot roll back, remediate, or authorize successor work.", foundationPackage: "BF-AGT-007",
  },
];

export function getDevelopmentAgentProfile(id: string) {
  return developmentAgentProfiles.find((profile) => profile.id === id);
}

export function getDevelopmentAgentProfileWithCapability(id: string) {
  const profile = getDevelopmentAgentProfile(id);
  const capabilityAssessment = getDevelopmentAgentCapabilityAssessment(id);
  return profile && capabilityAssessment ? { ...profile, capabilityAssessment } : null;
}

export function getPublicDevelopmentAgentProfile(id: string) {
  const profile = getDevelopmentAgentProfile(id);
  const capabilityAssessment = publicDevelopmentAgentCapabilityAssessment(id);
  if (!profile || !capabilityAssessment) return null;
  return {
    id: profile.id,
    name: profile.name,
    title: profile.title,
    role: profile.role,
    purpose: profile.purpose,
    portraitUrl: profile.portraitUrl,
    portraitAlt: profile.portraitAlt,
    demonstratedCapabilities: profile.responsibilities,
    limitations: profile.limitations,
    authorityBoundary: profile.authorityBoundary,
    capabilityAssessment,
  };
}

export const publicDevelopmentAgentProfiles = developmentAgentProfiles.map(({ id }) =>
  getPublicDevelopmentAgentProfile(id)
).filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));

export function deriveDevelopmentAgentCanonicalState(
  profile: DevelopmentAgentProfile,
  canonical: BeastAdminCanonicalReadModel | null
): DevelopmentAgentCanonicalState {
  if (!canonical) {
    return {
      status: "source-unavailable",
      statusLabel: "Canonical status unavailable",
      assignmentLabel: "No assignment can be confirmed",
      recentActivity: [],
      validationSummary: "Validation evidence is unavailable until the canonical BeastFusion projection can be loaded.",
      evidenceReference: null,
      verdictLabel: profile.verdictModel.length ? "No verdict can be confirmed" : null,
      sourceDetail: "No legacy or inferred activity is substituted for unavailable canonical governance.",
    };
  }

  const packageRecord = canonical.roadmap.find((item) => item.id === profile.foundationPackage);
  const recentActivity = canonical.execution
    .filter((event) => event.package === profile.foundationPackage)
    .sort((left, right) => (right.occurredAt || "").localeCompare(left.occurredAt || ""))
    .slice(0, 5);
  const validation = canonical.validation;

  return {
    status: "available",
    statusLabel: "Available for an authorized assignment · none active",
    assignmentLabel: packageRecord
      ? `${profile.foundationPackage} · ${packageRecord.title} · ${packageRecord.status}`
      : `${profile.foundationPackage} · completed foundation`,
    recentActivity,
    validationSummary: validation
      ? `${validation.canonicalConsistency}; ${validation.testCount ?? "unreported"} tests in the accepted projection.`
      : "The accepted projection does not include a validation summary.",
    evidenceReference: packageRecord?.evidenceReferences?.[0] || packageRecord?.sourceReference || null,
    verdictLabel: profile.verdictModel.length
      ? "No active or recent review verdict is exposed by the current projection"
      : null,
    sourceDetail: `Derived from BeastFusion projection ${canonical.projection?.projectionId || canonical.provider.projectionId || "identity unavailable"}.`,
  };
}
