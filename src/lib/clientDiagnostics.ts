export type ClientDiagnosticModule = "beasteducation" | "beastmoney";

export type ClientDiagnosticOperation =
  | "bill_due_date_save"
  | "bill_payment_apply"
  | "cash_settings_autosave"
  | "cash_settings_save"
  | "debt_payment_apply"
  | "debt_payment_reverse"
  | "debt_settings_save"
  | "funding_source_add"
  | "funding_source_delete"
  | "funding_source_save"
  | "onboarding_completion_save"
  | "starting_balance_save"
  | "suggested_attack_apply";

export type ClientDiagnosticErrorCategory =
  | "authentication_error"
  | "authorization_error"
  | "conflict_error"
  | "database_error"
  | "maintenance_error"
  | "network_error"
  | "validation_error"
  | "unknown_error";

function readErrorField(error: unknown, field: string) {
  if (!error || typeof error !== "object") return "";

  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" || typeof value === "number"
    ? String(value).toLowerCase()
    : "";
}

export function classifyClientDiagnosticError(
  error: unknown
): ClientDiagnosticErrorCategory {
  const status = readErrorField(error, "status");
  const code = readErrorField(error, "code");
  const name = readErrorField(error, "name");
  const message = readErrorField(error, "message");
  const description = `${name} ${message}`;

  if (
    description.includes(
      "beastmoney_payment_writes_temporarily_unavailable"
    ) || description.includes("payment_write_control_unavailable")
  ) {
    return "maintenance_error";
  }

  if (
    status === "401" ||
    code === "401" ||
    description.includes("not authenticated") ||
    description.includes("unauthenticated")
  ) {
    return "authentication_error";
  }

  if (
    status === "403" ||
    code === "403" ||
    code === "42501" ||
    description.includes("permission denied") ||
    description.includes("row-level security")
  ) {
    return "authorization_error";
  }

  if (status === "409" || code === "409" || code.startsWith("23")) {
    return "conflict_error";
  }

  if (
    name === "typeerror" ||
    description.includes("failed to fetch") ||
    description.includes("network")
  ) {
    return "network_error";
  }

  if (
    status === "400" ||
    code === "400" ||
    description.includes("invalid") ||
    description.includes("required") ||
    description.includes("missing")
  ) {
    return "validation_error";
  }

  if (code.startsWith("pgrst") || code.length === 5) {
    return "database_error";
  }

  return "unknown_error";
}

export function reportClientOperationFailure(input: {
  module: ClientDiagnosticModule;
  operation: ClientDiagnosticOperation;
  error?: unknown;
  category?: ClientDiagnosticErrorCategory;
}) {
  console.error("Client operation failed.", {
    module: input.module,
    operation: input.operation,
    errorCategory:
      input.category ?? classifyClientDiagnosticError(input.error),
  });
}
