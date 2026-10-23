export type CompetencyLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type CriterionResult = 'pass' | 'partial' | 'fail' | 'not tested' | 'not applicable';
export type Evidence = { title: string; url: string; kind: 'live answer' | 'local replay' | 'code review' | 'release' | 'source registry'; reviewer: string; date: string; version: string };
export type Assessment = { role: string; criteria: { criterion: string; result: CriterionResult; reason: string }[]; evidence: Evidence[]; summary: string };
export type StaffRecordKind = 'staff' | 'planned' | 'system' | 'external';
export type CompetencyReconciliation = {
 status: 'mapped' | 'not_evaluated' | 'insufficient';
 evidenceDate: string | null; scope: string; currentVerification: string; missingEvidence: string[];
 auditPriority: number; nextAudit: string;
 specializations?: {name:string;demonstrated:CompetencyLevel|null;target:CompetencyLevel|null;evidenceDate:string|null;scope:string;currentVerification:string}[];
};
export type Dossier = {
 competency?: CompetencyReconciliation;
 recordKind: StaffRecordKind;
 recentChanges: {date:string;summary:string}[];
 lastEvaluatedAt: string | null;
 latestAssessment: {title:string;date:string|null;reviewer:string;note:string;url:string} | null;
 targetRequirement: string;
 levelMapping: {reviewedAt:string;reviewer:string;rationale:string;scope:string;evidenceUrls:string[]} | null;
 id: string; name: string; aliases: string[]; role: string; departments: string[]; products: string[]; reportsTo: string;
 mission: string; duties: string[]; permissions: string[]; lifecycle: 'planned' | 'active' | 'limited' | 'paused' | 'retired'; assignment: string;
 availability: string; target: CompetencyLevel | null; demonstrated: CompetencyLevel | null; released: CompetencyLevel | null;
 assessments: Assessment[]; strengths: string[]; limitations: string[]; blockers: string[];
 releases: { date: string; version: string; summary: string; url: string }[];
 deferred: { title: string; priority: 'high' | 'normal' | 'low'; desiredLevel: CompetencyLevel | null; gap: string; requiredWork: string; success: string; cost: string; status: string }[];
 evidence: Evidence[]; history: { date: string; executor: string; why: string; version: string }[]; reviewedAt: string;
 costs: { confirmedChargesUsd: number | null; usageEstimateUsd: number | null; unresolvedReservationsUsd: number | null; note: string };
 autonomy?: string;
};
