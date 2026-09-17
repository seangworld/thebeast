export const claimTypes = { new: "New claim", increase: "Increase", secondary: "Secondary condition", supplemental: "Supplemental claim", review: "Decision review / appeal", unsure: "Not sure yet" } as const;
export const claimStages = { preparing: "Preparing", gathering: "Gathering evidence", submitted: "Submitted (you reported)", exam: "Exam scheduled / pending", decision: "Decision received", review: "Reviewing next steps", closed: "Closed / archived" } as const;
export const evidenceLabels = { service: "Service and separation records", medical: "Treatment and diagnosis records", impact: "Symptoms and daily-life examples", connection: "Evidence about a service or secondary connection", decision: "Decision letter and reasons", newEvidence: "New and relevant evidence" } as const;
export const evidenceStatuses = { needed: "To review", requested: "Requested", have: "Have it", notApplicable: "Not applicable" } as const;
export type EvidenceKey = keyof typeof evidenceLabels;
export type VeteranClaim = {
  id: string; title: string; claimType: keyof typeof claimTypes; stage: keyof typeof claimStages;
  nextActionDate: string; revision: number;
  details: { serviceContext: string; impactNotes: string; timeline: string; nextAction: string; statement: string; evidence: Record<EvidenceKey, { status: keyof typeof evidenceStatuses; reference: string }> };
};
export const vaResources = [
  { label: "VA.gov — benefits and health care", href: "https://www.va.gov/" },
  { label: "VA evidence guide", href: "https://www.va.gov/disability/how-to-file-claim/evidence-needed/" },
  { label: "Supplemental claims", href: "https://www.va.gov/decision-reviews/supplemental-claim/" },
  { label: "Decision review options", href: "https://www.va.gov/decision-reviews/" },
  { label: "C&P exam preparation", href: "https://www.va.gov/resources/va-claim-exam/" },
  { label: "Find accredited help", href: "https://www.va.gov/get-help-from-accredited-representative/" },
  { label: "Check official VA status", href: "https://www.va.gov/claim-or-appeal-status/" },
] as const;
export function emptyVeteranClaim(id: string): VeteranClaim {
  return { id, title: "", claimType: "unsure", stage: "preparing", nextActionDate: "", revision: 0,
    details: { serviceContext: "", impactNotes: "", timeline: "", nextAction: "", statement: "", evidence: Object.fromEntries(Object.keys(evidenceLabels).map(key => [key, { status: "needed", reference: "" }])) as VeteranClaim["details"]["evidence"] } };
}
export function validateVeteranClaim(claim: VeteranClaim): string | null {
  if (!claim.title.trim() || claim.title.length > 160) return "Enter a condition or issue name (up to 160 characters).";
  if (!Object.hasOwn(claimTypes, claim.claimType) || !Object.hasOwn(claimStages, claim.stage)) return "Choose a valid claim type and status.";
  if (claim.nextActionDate && (!/^\d{4}-\d{2}-\d{2}$/.test(claim.nextActionDate) || Number.isNaN(Date.parse(claim.nextActionDate)) || new Date(claim.nextActionDate).toISOString().slice(0, 10) !== claim.nextActionDate)) return "Enter a valid follow-up date.";
  for (const key of ["serviceContext", "impactNotes", "timeline", "nextAction", "statement"] as const) if (typeof claim.details[key] !== "string" || claim.details[key].length > 6000) return "Keep each notes field within 6,000 characters.";
  for (const key of Object.keys(evidenceLabels) as EvidenceKey[]) {
    const evidence = claim.details.evidence[key];
    if (!evidence || !Object.hasOwn(evidenceStatuses, evidence.status) || typeof evidence.reference !== "string" || evidence.reference.length > 800) return "Check evidence statuses and keep references within 800 characters.";
  }
  if (new TextEncoder().encode(JSON.stringify(claim.details)).length > 35000) return "This claim is too large. Shorten the notes before saving.";
  return null;
}
export function veteranClaimFromRow(row: Record<string, unknown>): VeteranClaim {
  const claim = emptyVeteranClaim(String(row.id));
  const details = row.details as Partial<VeteranClaim["details"]> | null;
  claim.title = String(row.title || "");
  if (Object.hasOwn(claimTypes, String(row.claim_type))) claim.claimType = row.claim_type as VeteranClaim["claimType"];
  if (Object.hasOwn(claimStages, String(row.stage))) claim.stage = row.stage as VeteranClaim["stage"];
  claim.nextActionDate = typeof row.next_action_date === "string" ? row.next_action_date : "";
  claim.revision = Number(row.revision || 1);
  for (const key of ["serviceContext", "impactNotes", "timeline", "nextAction", "statement"] as const) claim.details[key] = typeof details?.[key] === "string" ? details[key]! : "";
  for (const key of Object.keys(evidenceLabels) as EvidenceKey[]) {
    const value = details?.evidence?.[key];
    if (value && Object.hasOwn(evidenceStatuses, value.status)) claim.details.evidence[key] = { status: value.status, reference: typeof value.reference === "string" ? value.reference : "" };
  }
  return claim;
}
export function buildClaimGuidance(claim: VeteranClaim) {
  const lane = {
    new: "Organize records of the current condition, the service event or exposure, and information about their connection. Evidence requirements vary, including for presumptive conditions.",
    increase: "Gather recent records and concrete examples of how the already service-connected condition has worsened.",
    secondary: "Identify the existing service-connected condition and ask your clinician what evidence addresses the relationship to the additional condition.",
    supplemental: "Keep the prior decision and identify evidence VA did not previously consider that addresses an issue in the claim. Discuss what is new and relevant with accredited help.",
    review: "Review the decision notice with an accredited representative before choosing a review option. Options differ on evidence and deadlines.",
    unsure: "Start with the issue you want help with and any prior decision. An accredited representative can help identify the appropriate claim or review route.",
  }[claim.claimType];
  const keys: EvidenceKey[] = claim.claimType === "supplemental" ? ["decision", "newEvidence", "medical", "impact"] : claim.claimType === "review" ? ["decision"] : claim.claimType === "increase" ? ["medical", "impact"] : ["service", "medical", "impact", "connection"];
  return { lane, gaps: keys.filter(key => !["have", "notApplicable"].includes(claim.details.evidence[key].status)).map(key => evidenceLabels[key]), questions: [
    "Which records or dates are missing from my account?",
    "What does the available medical evidence establish, and what remains uncertain?",
    "Which deadline in my VA notice applies, and what action should I take before it?",
  ] };
}
export function draftClaimStatement(claim: VeteranClaim) {
  return [`Personal statement working draft — ${claim.title.trim()}`, "Review every detail before using this draft. It contains only your entered notes.",
    `Service / event context (my account):\n${claim.details.serviceContext.trim() || "[Add your factual account.]"}`,
    `Symptoms and impact (my account):\n${claim.details.impactNotes.trim() || "[Add specific examples and frequency.]"}`,
    `Dated history (my account):\n${claim.details.timeline.trim() || "[Add relevant dates and sources.]"}`].join("\n\n");
}
