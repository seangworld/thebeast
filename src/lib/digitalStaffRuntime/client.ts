import type { ProfessionalId, RuntimeResult } from "./types";
import type { HistoricalKnowledgeProposal, HistoricalReconciliationState } from "./reconciliation";
import { digitalStaffUnavailableMessage } from "./security";

export type DigitalStaffRuntimeResponse = { assistantMessageId: string; result: RuntimeResult };

export class DigitalStaffClientError extends Error {
  readonly requestId: string | null;

  constructor(requestId?: string) {
    super(digitalStaffUnavailableMessage);
    this.name = "DigitalStaffClientError";
    this.requestId = requestId || null;
  }
}

export async function requestDigitalStaffResponse(input: { professionalId: ProfessionalId; conversationId: string; message: string; workspace: string }) {
  try {
    const response = await fetch("/api/digital-staff/runtime", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const payload = (await response.json()) as DigitalStaffRuntimeResponse | { requestId?: string };
    if (!response.ok || !("result" in payload)) throw new DigitalStaffClientError("requestId" in payload ? payload.requestId : undefined);
    return payload;
  } catch (error) {
    if (error instanceof DigitalStaffClientError) throw error;
    throw new DigitalStaffClientError();
  }
}

export async function decideDigitalStaffProposal(input: { professionalId: ProfessionalId; conversationId: string; proposalId: string; decision: "approve" | "reject"; editedFields?: Record<string, string | number | boolean | null> }) {
  const response = await fetch("/api/digital-staff/runtime", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (!response.ok) throw new Error(payload.error || "The proposal decision could not be saved.");
  return payload;
}

export type HistoricalReconciliationProfessional = {
  professionalId: ProfessionalId;
  conversationId: string;
  state: HistoricalReconciliationState | null;
  telemetry: Record<string, unknown> | null;
  proposals: HistoricalKnowledgeProposal[];
};

export async function loadHistoricalReconciliation() {
  const response = await fetch("/api/digital-staff/reconciliation", { credentials: "same-origin", cache: "no-store" });
  const payload = await response.json() as { professionals?: HistoricalReconciliationProfessional[]; error?: string };
  if (!response.ok || !payload.professionals) throw new Error(payload.error || "Historical reconciliation is unavailable.");
  return payload.professionals;
}

export async function updateHistoricalReconciliation(input: { professionalId: ProfessionalId; action: "start" | "process" | "pause" | "skip" | "decide"; proposalId?: string; decision?: "approve" | "reject" | "merge" | "bulk_approve"; editedFields?: Record<string, string | number | boolean | null> }) {
  const response = await fetch("/api/digital-staff/reconciliation", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const payload = await response.json() as { professionals?: HistoricalReconciliationProfessional[]; error?: string };
  if (!response.ok || !payload.professionals) throw new Error(payload.error || "Historical reconciliation could not be updated.");
  return payload.professionals;
}
