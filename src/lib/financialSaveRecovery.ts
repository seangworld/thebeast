export type FinancialSaveAttemptStatus = "saved" | "failed";

export type FinancialSaveAttempt<TPayload = unknown> = {
  id: string;
  entityType: string;
  entityId?: string | null;
  attemptedAt: string;
  status: FinancialSaveAttemptStatus;
  payload: TPayload;
  errorMessage?: string | null;
};

export type FinancialSaveAudit<TPayload = unknown> = {
  attempts: FinancialSaveAttempt<TPayload>[];
  latestAttempt: FinancialSaveAttempt<TPayload> | null;
  latestSuccessfulAttempt: FinancialSaveAttempt<TPayload> | null;
  latestFailedAttempt: FinancialSaveAttempt<TPayload> | null;
  hasRecoverableDraft: boolean;
  recoverableDraft: TPayload | null;
  recoveryMessage: string | null;
};

function compareAttemptTime(
  left: FinancialSaveAttempt,
  right: FinancialSaveAttempt
) {
  return new Date(left.attemptedAt).getTime() - new Date(right.attemptedAt).getTime();
}

export function buildFinancialSaveAttempt<TPayload>({
  id,
  entityType,
  entityId = null,
  attemptedAt,
  payload,
  errorMessage = null,
}: {
  id: string;
  entityType: string;
  entityId?: string | null;
  attemptedAt: string;
  payload: TPayload;
  errorMessage?: string | null;
}): FinancialSaveAttempt<TPayload> {
  return {
    id,
    entityType,
    entityId,
    attemptedAt,
    status: errorMessage ? "failed" : "saved",
    payload,
    errorMessage,
  };
}

export function buildFinancialSaveAudit<TPayload>(
  attempts: FinancialSaveAttempt<TPayload>[]
): FinancialSaveAudit<TPayload> {
  const ordered = [...attempts].sort(compareAttemptTime);
  const latestAttempt = ordered[ordered.length - 1] || null;
  const latestSuccessfulAttempt =
    [...ordered].reverse().find((attempt) => attempt.status === "saved") || null;
  const latestFailedAttempt =
    [...ordered].reverse().find((attempt) => attempt.status === "failed") || null;
  const hasRecoverableDraft =
    Boolean(latestFailedAttempt) &&
    (!latestSuccessfulAttempt ||
      new Date(latestFailedAttempt!.attemptedAt).getTime() >
        new Date(latestSuccessfulAttempt.attemptedAt).getTime());

  return {
    attempts: ordered,
    latestAttempt,
    latestSuccessfulAttempt,
    latestFailedAttempt,
    hasRecoverableDraft,
    recoverableDraft: hasRecoverableDraft ? latestFailedAttempt!.payload : null,
    recoveryMessage: hasRecoverableDraft
      ? "Your latest change did not save. The unsaved values are available to retry."
      : null,
  };
}
