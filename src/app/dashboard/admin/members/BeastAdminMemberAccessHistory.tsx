"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  normalizeBeastAdminAccountAccessResponse,
  type BeastAdminAccountAccessAction,
  type BeastAdminAccountAccessSnapshot,
} from "@/lib/beastAdminAccountAccess";

type Props = {
  memberId: string;
  memberName: string;
  canManage: boolean;
};

function formatAccessDate(value: string | null) {
  if (!value) return "Not available.";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function eventTone(source: "supabase_auth" | "beast_admin") {
  return source === "supabase_auth"
    ? "border-sky-300/25 bg-sky-300/10 text-sky-100"
    : "border-amber-300/25 bg-amber-300/10 text-amber-100";
}

export function BeastAdminMemberAccessHistory({
  memberId,
  memberName,
  canManage,
}: Props) {
  const [snapshot, setSnapshot] =
    useState<BeastAdminAccountAccessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] =
    useState<BeastAdminAccountAccessAction | null>(null);
  const [passwordResetPending, setPasswordResetPending] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/members/${encodeURIComponent(memberId)}/access-history`,
        { cache: "no-store" }
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "BeastAdmin could not load authentication history."
        );
      }

      const nextSnapshot =
        normalizeBeastAdminAccountAccessResponse(payload);
      if (!nextSnapshot) {
        throw new Error(
          "BeastAdmin received invalid authentication history."
        );
      }
      setSnapshot(nextSnapshot);
    } catch (historyError) {
      setSnapshot(null);
      setError(
        historyError instanceof Error
          ? historyError.message
          : "BeastAdmin could not load authentication history."
      );
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    setSnapshot(null);
    setReason("");
    setSuccess("");
    void loadHistory();
  }, [loadHistory]);

  async function performAction(action: BeastAdminAccountAccessAction) {
    if (!canManage || actionPending || passwordResetPending) return;

    const confirmationMessages: Partial<
      Record<BeastAdminAccountAccessAction, string>
    > = {
      revoke_sessions: `Require every current BeastOS session for ${memberName} to sign in again? Supabase global sign-out will complete when a current session next reaches BeastOS.`,
      require_fresh_sign_in: `Require ${memberName} to sign in again before continuing in BeastOS?`,
      clear_suspicious: `Clear the suspicious-activity review flag for ${memberName}?`,
    };
    const confirmation = confirmationMessages[action];
    if (confirmation && !window.confirm(confirmation)) return;

    setActionPending(action);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        `/api/admin/members/${encodeURIComponent(memberId)}/access-history`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            reason: action === "flag_suspicious" ? reason : null,
          }),
        }
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !payload ||
        typeof payload !== "object" ||
        !("message" in payload) ||
        typeof payload.message !== "string"
      ) {
        throw new Error(
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "BeastAdmin could not complete the authentication action."
        );
      }

      setSuccess(payload.message);
      if (action === "flag_suspicious") setReason("");
      await loadHistory();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "BeastAdmin could not complete the authentication action."
      );
    } finally {
      setActionPending(null);
    }
  }

  async function triggerPasswordReset() {
    if (!canManage || actionPending || passwordResetPending) return;
    if (
      !window.confirm(
        `Send a password-reset email to ${memberName}'s authoritative Supabase Auth email? The reset link and token will never be stored in BeastAdmin.`
      )
    ) {
      return;
    }

    setPasswordResetPending(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        `/api/admin/members/${encodeURIComponent(memberId)}/password-reset`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: null }),
        }
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !payload ||
        typeof payload !== "object" ||
        !("message" in payload) ||
        typeof payload.message !== "string"
      ) {
        throw new Error(
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "BeastAdmin could not request the password-reset email."
        );
      }

      setSuccess(payload.message);
      await loadHistory();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "BeastAdmin could not request the password-reset email."
      );
    } finally {
      setPasswordResetPending(false);
    }
  }

  return (
    <DashboardCard accent="admin">
      <SectionHeader
        eyebrow="Authentication access"
        title="Account access history and session controls"
        description={`Owner-only authentication evidence for ${memberName}. BeastAdmin never returns raw user agents, IP addresses, or inferred locations to this view.`}
      />

      {loading ? (
        <div className="mt-5 grid gap-3" aria-busy="true">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold leading-6 text-red-100"
        >
          <p>{error}</p>
          {!snapshot ? (
            <button
              type="button"
              className="beast-button-secondary mt-3 min-h-11"
              onClick={() => void loadHistory()}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {success ? (
        <p
          role="status"
          className="mt-5 rounded-xl border border-green-300/30 bg-green-300/10 p-4 text-sm font-bold leading-6 text-green-100"
        >
          {success}
        </p>
      ) : null}

      {!loading && snapshot ? (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <dt className="text-xs font-black uppercase tracking-[0.14em] text-[#7f8da3]">
                Last successful sign-in
              </dt>
              <dd className="mt-2 text-sm font-black text-white">
                {formatAccessDate(snapshot.lastSuccessfulSignInAt)}
              </dd>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <dt className="text-xs font-black uppercase tracking-[0.14em] text-[#7f8da3]">
                Failed sign-ins
              </dt>
              <dd className="mt-2 text-sm font-black text-white">
                Not available.
              </dd>
              <p className="mt-1 text-xs leading-5 text-[#9aa7b8]">
                No standardized failed-attempt evidence is exposed by the
                configured Auth audit source.
              </p>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <dt className="text-xs font-black uppercase tracking-[0.14em] text-[#7f8da3]">
                Approximate location
              </dt>
              <dd className="mt-2 text-sm font-black text-white">
                Not collected.
              </dd>
              <p className="mt-1 text-xs leading-5 text-[#9aa7b8]">
                IP addresses and inferred regions are intentionally omitted.
              </p>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <dt className="text-xs font-black uppercase tracking-[0.14em] text-[#7f8da3]">
                Retention
              </dt>
              <dd className="mt-2 text-sm font-black text-white">
                {snapshot.retentionDays} days
              </dd>
              <p className="mt-1 text-xs leading-5 text-[#9aa7b8]">
                Applies to this access view and BeastAdmin security events.
              </p>
            </div>
          </dl>

          <section className="mt-6 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="font-black text-white">Session controls</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#9aa7b8]">
                  Supabase does not provide an owner-by-user sign-out API.
                  BeastOS
                  therefore blocks every current session and uses Supabase’s
                  supported global sign-out when each session next reaches a
                  protected request. Access tokens expire on the provider’s
                  normal schedule.
                </p>
              </div>
              {snapshot.suspiciousActivityFlagged ? (
                <span className="rounded-full border border-red-300/30 bg-red-300/10 px-3 py-1.5 text-xs font-black text-red-100">
                  Flagged for review
                </span>
              ) : (
                <span className="rounded-full border border-green-300/30 bg-green-300/10 px-3 py-1.5 text-xs font-black text-green-100">
                  No review flag
                </span>
              )}
            </div>

            {snapshot.freshSignInRequiredAfter ? (
              <p className="mt-3 text-xs font-bold leading-5 text-amber-100">
                Fresh sign-in required after{" "}
                {formatAccessDate(snapshot.freshSignInRequiredAfter)}.
              </p>
            ) : null}
            {snapshot.suspiciousActivityReason ? (
              <p className="mt-3 rounded-lg border border-red-300/20 bg-red-300/10 p-3 text-sm leading-6 text-red-100">
                Review note: {snapshot.suspiciousActivityReason}
              </p>
            ) : null}

            {canManage ? (
              <>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="beast-button-secondary min-h-11"
                    disabled={Boolean(actionPending) || passwordResetPending}
                    onClick={() => void performAction("revoke_sessions")}
                  >
                    {actionPending === "revoke_sessions"
                      ? "Revoking sessions…"
                      : "Revoke all sessions"}
                  </button>
                  <button
                    type="button"
                    className="beast-button-secondary min-h-11"
                    disabled={Boolean(actionPending) || passwordResetPending}
                    onClick={() =>
                      void performAction("require_fresh_sign_in")
                    }
                  >
                    {actionPending === "require_fresh_sign_in"
                      ? "Requiring sign-in…"
                      : "Require fresh sign-in"}
                  </button>
                  <button
                    type="button"
                    className="beast-button-secondary min-h-11"
                    disabled={Boolean(actionPending) || passwordResetPending}
                    onClick={() => void triggerPasswordReset()}
                  >
                    {passwordResetPending
                      ? "Requesting reset…"
                      : "Send password-reset email"}
                  </button>
                  {snapshot.suspiciousActivityFlagged ? (
                    <button
                      type="button"
                      className="beast-button-secondary min-h-11"
                      disabled={Boolean(actionPending) || passwordResetPending}
                      onClick={() =>
                        void performAction("clear_suspicious")
                      }
                    >
                      {actionPending === "clear_suspicious"
                        ? "Clearing review…"
                        : "Clear review flag"}
                    </button>
                  ) : null}
                </div>

                {!snapshot.suspiciousActivityFlagged ? (
                  <div className="mt-4 grid gap-2">
                    <label
                      htmlFor={`suspicious-reason-${memberId}`}
                      className="text-sm font-black text-white"
                    >
                      Suspicious activity review note
                    </label>
                    <textarea
                      id={`suspicious-reason-${memberId}`}
                      value={reason}
                      maxLength={500}
                      rows={3}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Describe the real activity that needs owner review."
                      className="w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-[#7f8da3]">
                        {reason.length}/500 characters
                      </p>
                      <button
                        type="button"
                        className="beast-button min-h-11"
                        disabled={
                          Boolean(actionPending) ||
                          passwordResetPending ||
                          !reason.trim()
                        }
                        onClick={() =>
                          void performAction("flag_suspicious")
                        }
                      >
                        {actionPending === "flag_suspicious"
                          ? "Flagging activity…"
                          : "Flag for review"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-sm font-bold text-amber-100">
                Session controls are unavailable for protected, demo,
                unmanaged, or deleted accounts.
              </p>
            )}
          </section>

          <section className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-black text-white">
                  Recent authentication activity
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#9aa7b8]">
                  {snapshot.providerAuditAvailable
                    ? "Supabase Auth evidence and BeastAdmin security actions, newest first."
                    : "Supabase Auth database audit evidence is unavailable in this environment."}
                </p>
              </div>
              <button
                type="button"
                className="beast-button-secondary min-h-11"
                onClick={() => void loadHistory()}
              >
                Refresh history
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {snapshot.events.map((event) => (
                <article
                  key={event.id}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-black text-white">{event.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-[#9aa7b8]">
                        {event.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${eventTone(
                        event.source
                      )}`}
                    >
                      {event.source === "supabase_auth"
                        ? "Supabase Auth"
                        : "BeastAdmin"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-bold text-[#7f8da3]">
                    {formatAccessDate(event.occurredAt)}
                  </p>
                  {event.deviceCategory ||
                  event.platform ||
                  event.browser ? (
                    <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">
                      {[
                        event.deviceCategory,
                        event.platform,
                        event.browser,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs leading-5 text-[#68768b]">
                      Device and browser evidence was not available for this
                      event.
                    </p>
                  )}
                </article>
              ))}
              {!snapshot.events.length ? (
                <p className="rounded-xl border border-dashed border-[#344052] p-5 text-center text-sm leading-6 text-[#9aa7b8]">
                  No meaningful authentication events are available within the
                  retained window. BeastAdmin does not create placeholder
                  activity.
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </DashboardCard>
  );
}
