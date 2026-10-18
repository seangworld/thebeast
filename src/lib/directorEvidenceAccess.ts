import { AssignmentBlocked, verifySpecialistResult, type AssignmentAccess, type AssignmentStore } from "./directorAssignments";

export type DirectorEvidenceSelection = { taskId: string; recordIds: string[] };
export type DirectorSharedEvidence = { selections: DirectorEvidenceSelection[]; findings: Array<{
  taskId: string; capability: string; asOf: string; provenance: string; excerptsComplete: boolean;
  correctionComparison?: { earlierRecordedReview: { asOf: string; monthlyIncome: number | null; selectedIncome: Array<Record<string, unknown>> }; currentVerifiedAsOf: string; scope: string };
  findings: Record<string, unknown>; records: Array<Record<string, unknown>>;
}> };
export function directorEvidenceSelection(value: unknown): DirectorEvidenceSelection[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 2) throw new AssignmentBlocked("Select at most two verified reviews for AI evidence sharing.");
  const ids = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== "object" || Object.keys(item).some(key => !["taskId", "recordIds"].includes(key)) || typeof item.taskId !== "string" || item.taskId.length > 100 || ids.has(item.taskId) || !Array.isArray(item.recordIds) || item.recordIds.length > 8 || item.recordIds.some((id: unknown) => typeof id !== "string" || id.length > 100) || new Set(item.recordIds).size !== item.recordIds.length) throw new AssignmentBlocked("Invalid evidence selection.");
    ids.add(item.taskId); return { taskId: item.taskId, recordIds: [...item.recordIds] };
  });
}

/** Explicit owner selection, fresh permission, current same-owner/goal snapshot and independent verification.
 * No raw snapshots, document contents/URLs, medications, other goals or account identifiers are sent.
 * Text is untrusted evidence; selection never grants tool authority. */
export async function sharedDirectorEvidence(store: AssignmentStore, access: AssignmentAccess, ownerId: string, goalId: string, selected: unknown, now = new Date().toISOString(), previous?: DirectorSharedEvidence): Promise<DirectorSharedEvidence | undefined> {
  const selections = directorEvidenceSelection(selected);
  if (!selections.length) return undefined;
  const tasks = await store.list(ownerId, goalId);
  const findings: DirectorSharedEvidence["findings"] = [];
  for (const selection of selections) {
    const task = tasks.find(row => row.id === selection.taskId && row.owner_id === ownerId && row.goal_id === goalId);
    if (!task || task.status !== "verified" || !await access.authorize(ownerId, task.capability)) throw new AssignmentBlocked("Selected review is unavailable or no longer permitted.");
    const snapshot = await access.snapshot(ownerId, task.capability);
    if (snapshot.ownerId !== ownerId || verifySpecialistResult(task.result, snapshot, now)) throw new AssignmentBlocked("Selected evidence changed, expired or failed verification. Refresh the review.");
    let excerptsComplete = true;
    const text = (value: unknown) => {
      if (typeof value !== "string") return null;
      if (value.length > 1000) excerptsComplete = false;
      return value.slice(0, 1000);
    };
    const output = task.result!.output as Record<string, unknown>;
    let records: Array<Record<string, unknown>>;
    let summary: Record<string, unknown>;
    if (task.capability === "money.cash-review") {
      const rows = snapshot.money!.incomes.filter(row => selection.recordIds.includes(String(row.id)));
      records = rows.map(row => ({ recordId: row.id, name: text(row.name), amount: row.amount, frequency: text(row.frequency), nextDate: text(row.next_date), active: row.is_active !== false, archived: row.is_archived === true }));
      summary = Object.fromEntries(["monthlyIncome", "monthlyBills", "monthlyDebtMinimums", "monthlyAvailableCash", "incomeExpectedNext30Days", "activeIncomeCount", "calculation"].map(key => [key, output[key]]));
    } else {
      // Only appointment records; no automatic broad clinical-record or attachment sharing.
      const rows = snapshot.health!.filter(row => row.recordType === "appointment" && selection.recordIds.includes(row.id));
      records = rows.map(row => ({ recordId: row.id, title: text(row.title), status: text(row.status), date: text(row.occurredOn), notes: text(row.notes), context: text(row.details.context), updatedAt: text(row.updatedAt) }));
      const preparation = output.appointmentPreparation as { nextAppointment?: { id?: string } | null } | undefined;
      summary = { selectedNextAppointmentRecordId: selection.recordIds.includes(preparation?.nextAppointment?.id || "") ? preparation!.nextAppointment!.id : null, review: "Health Advisor appointment preparation; selected appointment excerpts only" };
    }
    if (records.length !== selection.recordIds.length) throw new AssignmentBlocked("Selected records are not available within this review's allowed evidence scope.");
    let correctionComparison: DirectorSharedEvidence["findings"][number]["correctionComparison"];
    if (task.capability === "money.cash-review" && Array.isArray(previous?.findings)) {
      const earlier = previous.findings.filter(item => item?.taskId === task.id && item.capability === task.capability && Number.isFinite(Date.parse(item.asOf)) && Date.parse(item.asOf) < Date.parse(task.result!.asOf) && Array.isArray(item.records)).sort((a,b) => Date.parse(b.asOf)-Date.parse(a.asOf)).find(item => item.records.some(old => records.some(current => current.recordId === old?.recordId && (current.amount !== old.amount || current.frequency !== old.frequency))));
      if (earlier) {
        const selectedIncome = earlier.records.filter(old => records.some(current => current.recordId === old?.recordId)).map(old => ({ recordId: old.recordId, amount: typeof old.amount === "number" ? old.amount : null, frequency: text(old.frequency) }));
        correctionComparison = { earlierRecordedReview: { asOf: earlier.asOf, monthlyIncome: typeof earlier.findings?.monthlyIncome === "number" ? earlier.findings.monthlyIncome : null, selectedIncome }, currentVerifiedAsOf: task.result!.asOf, scope: "Earlier recorded computation is superseded, untrusted historical evidence, not a current verified result or proof of recurring eligibility. Compare with selected current source records and current verified findings; neither establishes outside truth or completes the life goal." };
      }
    }
    findings.push({ ...(correctionComparison ? { correctionComparison } : {}), taskId: task.id, capability: task.capability, asOf: task.result!.asOf, provenance: "Current member-owned saved records; specialist output independently recomputed. Selected excerpts only, not external truth or a complete record set.", excerptsComplete, findings: summary, records });
  }
  return { selections, findings };
}
