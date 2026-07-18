export type FinancialInstitutionEvaluationCriterionId =
  | "security_privacy"
  | "consumer_data_rights"
  | "authorization_scope"
  | "data_minimization"
  | "data_accuracy"
  | "reliability_recovery"
  | "accessibility_support"
  | "cost_contract_transparency"
  | "portability_exit"
  | "compliance_incident_response";

export type FinancialInstitutionEvaluationCriterion = {
  id: FinancialInstitutionEvaluationCriterionId;
  area: string;
  question: string;
  requiredEvidence: string[];
  releaseBlocking: boolean;
};

export type FinancialInstitutionFrameworkBoundary = {
  namedInstitutionCount?: number;
  hasInstitutionEvaluation?: boolean;
  hasRecommendation?: boolean;
  hasRanking?: boolean;
  hasMonetization?: boolean;
  hasCredentialCollection?: boolean;
  hasLiveIntegration?: boolean;
};

export type FinancialInstitutionFrameworkBoundaryReview = {
  frameworkOnlyCompliant: boolean;
  status: "framework_only" | "blocked";
  violations: string[];
};

export const financialInstitutionEvaluationFramework = {
  id: "beastmoney-financial-institution-evaluation-framework",
  package: "BM-28",
  status: "framework_only",
  purpose:
    "Define provider-neutral evidence and approval requirements for a future owner-approved financial institution evaluation package.",
  currentAuthority: {
    evaluateSpecificInstitution: false,
    recommendInstitution: false,
    rankInstitutions: false,
    monetizeInstitutionRelationship: false,
    collectInstitutionCredentials: false,
    connectToInstitution: false,
  },
  criteria: [
    {
      id: "security_privacy",
      area: "Security and privacy",
      question: "What independently reviewable controls protect financial and identity data?",
      requiredEvidence: ["security architecture", "privacy policy", "control review evidence"],
      releaseBlocking: true,
    },
    {
      id: "consumer_data_rights",
      area: "Consumer data rights",
      question: "How can a member access, correct, revoke, export, and delete shared data?",
      requiredEvidence: ["consent model", "revocation behavior", "deletion and export behavior"],
      releaseBlocking: true,
    },
    {
      id: "authorization_scope",
      area: "Authorization scope",
      question: "Are requested permissions explicit, purpose-limited, revocable, and least-privileged?",
      requiredEvidence: ["permission scopes", "authorization lifecycle", "revocation controls"],
      releaseBlocking: true,
    },
    {
      id: "data_minimization",
      area: "Data minimization",
      question: "Is collection limited to the minimum data required for an approved member workflow?",
      requiredEvidence: ["data inventory", "purpose mapping", "retention boundaries"],
      releaseBlocking: true,
    },
    {
      id: "data_accuracy",
      area: "Data accuracy",
      question: "How are stale, duplicated, missing, delayed, and corrected financial records represented?",
      requiredEvidence: ["data freshness contract", "error model", "reconciliation behavior"],
      releaseBlocking: true,
    },
    {
      id: "reliability_recovery",
      area: "Reliability and recovery",
      question: "How are outages, partial failures, retries, recovery, and rollback handled?",
      requiredEvidence: ["availability evidence", "failure behavior", "recovery and rollback plan"],
      releaseBlocking: true,
    },
    {
      id: "accessibility_support",
      area: "Accessibility and support",
      question: "Can members understand, access, and resolve problems with the service?",
      requiredEvidence: ["accessibility evidence", "support model", "member-facing disclosures"],
      releaseBlocking: false,
    },
    {
      id: "cost_contract_transparency",
      area: "Cost and contract transparency",
      question: "Are all costs, limitations, renewal terms, and commercial conflicts disclosed?",
      requiredEvidence: ["complete cost schedule", "contract terms", "conflict disclosures"],
      releaseBlocking: true,
    },
    {
      id: "portability_exit",
      area: "Portability and exit",
      question: "Can BeastMoney disconnect safely without trapping member data or breaking local records?",
      requiredEvidence: ["disconnect behavior", "data portability", "exit and migration plan"],
      releaseBlocking: true,
    },
    {
      id: "compliance_incident_response",
      area: "Compliance and incident response",
      question: "What review, notification, audit, and incident-response obligations apply?",
      requiredEvidence: ["compliance review", "audit capability", "incident response plan"],
      releaseBlocking: true,
    },
  ] satisfies FinancialInstitutionEvaluationCriterion[],
  futureApprovalGates: [
    "An owner-approved future roadmap package names the exact evaluation scope.",
    "Security, privacy, legal, and data-ownership reviews are complete.",
    "Consent, revocation, deletion, retention, recovery, and rollback behavior are documented.",
    "Credential, authorization, secret, and environment boundaries are approved.",
    "Provider-specific testing and release validation are defined and pass.",
    "Any recommendation, ranking, commercial relationship, or monetization has separate explicit owner approval.",
    "Production connection and release approval are separately granted.",
  ],
} as const;

export function validateFinancialInstitutionFrameworkBoundary({
  namedInstitutionCount = 0,
  hasInstitutionEvaluation = false,
  hasRecommendation = false,
  hasRanking = false,
  hasMonetization = false,
  hasCredentialCollection = false,
  hasLiveIntegration = false,
}: FinancialInstitutionFrameworkBoundary = {}): FinancialInstitutionFrameworkBoundaryReview {
  const violations: string[] = [];

  if (namedInstitutionCount > 0) {
    violations.push("BM-28 cannot contain named financial institution records.");
  }
  if (hasInstitutionEvaluation) {
    violations.push("A future owner-approved roadmap package is required before evaluating an institution.");
  }
  if (hasRecommendation) {
    violations.push("A future owner-approved roadmap package is required before recommending an institution.");
  }
  if (hasRanking) {
    violations.push("A future owner-approved roadmap package is required before ranking institutions.");
  }
  if (hasMonetization) {
    violations.push("A future owner-approved roadmap package is required before institution-related monetization.");
  }
  if (hasCredentialCollection) {
    violations.push("BM-28 cannot collect financial institution credentials or secrets.");
  }
  if (hasLiveIntegration) {
    violations.push("A future owner-approved roadmap package and release approval are required before any live integration.");
  }

  return {
    frameworkOnlyCompliant: violations.length === 0,
    status: violations.length === 0 ? "framework_only" : "blocked",
    violations,
  };
}
