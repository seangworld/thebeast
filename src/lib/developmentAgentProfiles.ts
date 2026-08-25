import type { BeastAdminCanonicalReadModel } from "./beastAdminCanonicalProjection";

export type DevelopmentAgentProfile = {
  id: "developer-agent" | "reviewer-agent";
  name: string;
  title: string;
  role: string;
  purpose: string;
  responsibilities: readonly string[];
  limitations: readonly string[];
  relationships: readonly { label: string; detail: string }[];
  reviewDimensions: readonly string[];
  verdictModel: readonly string[];
  escalationConditions: readonly string[];
  foundationPackage: "BF-AGT-002" | "BF-AGT-003";
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
    id: "developer-agent",
    name: "Developer Agent",
    title: "Bounded implementation specialist",
    role: "Builds owner-authorized work assigned by Orchestrator",
    purpose: "Inspect, implement, correct ordinary defects, validate, and return reviewer-ready evidence inside one governed assignment.",
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
    foundationPackage: "BF-AGT-002",
  },
  {
    id: "reviewer-agent",
    name: "Reviewer Agent",
    title: "Independent candidate quality gate",
    role: "Independently checks Developer Agent work for Orchestrator",
    purpose: "Bind review evidence to the exact Developer candidate and evaluate it against the authorized objective without trusting the completion claim by itself.",
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
    foundationPackage: "BF-AGT-003",
  },
];

export function getDevelopmentAgentProfile(id: string) {
  return developmentAgentProfiles.find((profile) => profile.id === id);
}

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
      verdictLabel: profile.id === "reviewer-agent" ? "No verdict can be confirmed" : null,
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
    verdictLabel: profile.id === "reviewer-agent"
      ? "No active or recent review verdict is exposed by the current projection"
      : null,
    sourceDetail: `Derived from BeastFusion projection ${canonical.projection?.projectionId || canonical.provider.projectionId || "identity unavailable"}.`,
  };
}
