import type { DigitalStaffActivity, ProfessionalId, RuntimeMessage, RuntimeResult } from "./types";
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

export const digitalStaffActivityLabels: Record<DigitalStaffActivity, string> = {
  accepted: "Sending…",
  loading_context: "Checking your Beast information…",
  thinking: "Thinking…",
  researching: "Checking current sources…",
  validating_sources: "Comparing current sources…",
  preparing_answer: "Preparing your answer…",
  persisting: "Updating your conversation…",
  complete: "Answer ready",
};

export type DigitalStaffRequestObserver = {
  onSubmitted?: () => void;
  onAcknowledged?: (message: RuntimeMessage) => void;
  onActivity?: (activity: DigitalStaffActivity) => void;
  onResponseDelta?: (delta: string) => void;
};

export async function requestDigitalStaffResponse(input: { professionalId: ProfessionalId; conversationId: string; message: string; workspace: string }, observer: DigitalStaffRequestObserver = {}) {
  try {
    observer.onSubmitted?.();
    const response = await fetch("/api/digital-staff/runtime", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify(input) });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})) as { requestId?: string };
      throw new DigitalStaffClientError(failure.requestId);
    }
    if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
      const payload = await response.json() as DigitalStaffRuntimeResponse | { requestId?: string };
      if (!("result" in payload)) throw new DigitalStaffClientError("requestId" in payload ? payload.requestId : undefined);
      return payload;
    }
    if (!response.body) throw new DigitalStaffClientError();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed: DigitalStaffRuntimeResponse | null = null;
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line) continue;
        const event = JSON.parse(line) as
          | { type: "acknowledged"; message: RuntimeMessage }
          | { type: "activity"; activity: DigitalStaffActivity }
          | { type: "response_delta"; delta: string }
          | { type: "complete"; payload: DigitalStaffRuntimeResponse }
          | { type: "error"; requestId?: string };
        if (event.type === "acknowledged") observer.onAcknowledged?.(event.message);
        if (event.type === "activity") observer.onActivity?.(event.activity);
        if (event.type === "response_delta") observer.onResponseDelta?.(event.delta);
        if (event.type === "complete") completed = event.payload;
        if (event.type === "error") throw new DigitalStaffClientError(event.requestId);
      }
      if (done) break;
    }
    if (!completed) throw new DigitalStaffClientError();
    return completed;
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
