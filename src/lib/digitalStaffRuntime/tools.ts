import type { ProfessionalConfig } from "./config";

export type ValidatedToolCall = { name: string; arguments: Record<string, unknown>; requiresApproval: boolean };

export function validateToolCalls(config: ProfessionalConfig, calls: Array<{ name: string; arguments: Record<string, unknown> }>) {
  const accepted: ValidatedToolCall[] = [];
  const failures: string[] = [];
  for (const call of calls) {
    if (!config.allowedTools.includes(call.name)) {
      failures.push(`${config.id} is not permitted to use ${call.name}.`);
      continue;
    }
    if (!call.arguments || Array.isArray(call.arguments) || typeof call.arguments !== "object") {
      failures.push(`${call.name} has invalid arguments.`);
      continue;
    }
    accepted.push({ ...call, requiresApproval: config.approvalRequiredTools.includes(call.name) });
  }
  return { accepted, failures };
}

export function deidentifyResearchQuery(query: string) {
  return query
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[identifier removed]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[account number removed]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email removed]")
    .replace(/\b(?:my name is|i am)\s+[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,2}/gi, "the member")
    .trim();
}
