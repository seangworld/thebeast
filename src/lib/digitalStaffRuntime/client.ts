import type { ProfessionalId, RuntimeResult } from "./types";

export type DigitalStaffRuntimeResponse = { assistantMessageId: string; result: RuntimeResult };

export async function requestDigitalStaffResponse(input: { professionalId: ProfessionalId; conversationId: string; message: string; workspace: string }) {
  const response = await fetch("/api/digital-staff/runtime", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const payload = (await response.json()) as DigitalStaffRuntimeResponse | { error?: string };
  if (!response.ok || !("result" in payload)) throw new Error(("error" in payload && payload.error) || "The Digital Staff runtime could not respond safely.");
  return payload;
}

export async function decideDigitalStaffProposal(input: { professionalId: ProfessionalId; conversationId: string; proposalId: string; decision: "approve" | "reject"; editedFields?: Record<string, string | number | boolean | null> }) {
  const response = await fetch("/api/digital-staff/runtime", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (!response.ok) throw new Error(payload.error || "The proposal decision could not be saved.");
  return payload;
}
