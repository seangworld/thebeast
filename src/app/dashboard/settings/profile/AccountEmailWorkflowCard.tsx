"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardCard } from "@/app/components/design/DashboardPrimitives";
import {
  BEAST_EMAIL_SEND_COOLDOWN_SECONDS,
  buildEmailVerificationCallbackUrl,
  getBeastAuthEmailStatus,
  getEmailWorkflowErrorMessage,
  normalizeRequestedAuthEmail,
  type BeastAuthEmailStatus,
} from "@/lib/auth/emailWorkflows";
import { createClient } from "@/lib/supabase/client";

const emptyStatus: BeastAuthEmailStatus = {
  currentEmail: null,
  verified: false,
  pendingEmail: null,
  emailChangeSentAt: null,
};

function formatSentAt(value: string | null) {
  if (!value) return "Delivery time unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AccountEmailWorkflowCard() {
  const [status, setStatus] = useState<BeastAuthEmailStatus>(emptyStatus);
  const [requestedEmail, setRequestedEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const normalizedRequest = useMemo(
    () => normalizeRequestedAuthEmail(requestedEmail, status.currentEmail),
    [requestedEmail, status.currentEmail]
  );

  const verificationRedirect = useCallback(
    () =>
      buildEmailVerificationCallbackUrl(
        window.location.origin,
        process.env.NEXT_PUBLIC_BEAST_SITE_URL
      ),
    []
  );

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Sign in again to manage your Beast account email.");
        setStatus(emptyStatus);
        return;
      }

      const nextStatus = getBeastAuthEmailStatus(user);
      setStatus(nextStatus);

      const returnState = new URLSearchParams(window.location.search).get(
        "email"
      );
      if (returnState === "verification-failed") {
        setError(
          "That verification link is invalid or expired. Request another email and try again."
        );
      } else if (returnState === "verification-returned") {
        setMessage(
          nextStatus.pendingEmail
            ? "One verification step was accepted. Check both addresses for any remaining confirmation."
            : "Your Beast sign-in email is verified and up to date."
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "BeastOS could not load your account email."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((current) => Math.max(0, current - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function requestEmailChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!normalizedRequest) {
      setError("Enter a different, valid email address.");
      return;
    }
    if (!confirmed) {
      setError("Confirm that you understand how the sign-in email changes.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase.auth.updateUser(
        { email: normalizedRequest },
        { emailRedirectTo: verificationRedirect() }
      );
      if (updateError) throw updateError;

      const nextStatus = getBeastAuthEmailStatus(data.user);
      setStatus(nextStatus);
      setRequestedEmail("");
      setConfirmed(false);
      setCooldown(BEAST_EMAIL_SEND_COOLDOWN_SECONDS);
      setMessage(
        nextStatus.pendingEmail
          ? "Verification sent. Your current email remains the sign-in email until Supabase finishes the required confirmations."
          : "Your Auth email changed. Refresh the account status to confirm verification."
      );
    } catch (updateError) {
      setError(
        getEmailWorkflowErrorMessage(
          updateError && typeof updateError === "object"
            ? (updateError as { code?: string; message?: string })
            : null
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    const destinationEmail = status.pendingEmail || status.currentEmail;
    if (!destinationEmail || cooldown > 0) return;

    setResending(true);
    setMessage("");
    setError("");
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: status.pendingEmail ? "email_change" : "signup",
        email: destinationEmail,
        options: { emailRedirectTo: verificationRedirect() },
      });
      if (resendError) throw resendError;

      setCooldown(BEAST_EMAIL_SEND_COOLDOWN_SECONDS);
      setMessage(
        status.pendingEmail
          ? "Email-change verification was sent again."
          : "Account verification was sent again."
      );
      await loadStatus();
    } catch (resendError) {
      setError(
        getEmailWorkflowErrorMessage(
          resendError && typeof resendError === "object"
            ? (resendError as { code?: string; message?: string })
            : null
        )
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <DashboardCard accent="documents">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="beast-kicker">Account email</p>
          <h2 className="mt-2 break-all text-xl font-black text-white">
            {loading ? "Loading account email…" : status.currentEmail || "Not provided"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">
            This Supabase Auth email is authoritative for Beast sign-in,
            verification, recovery, and account-security messages. BeastOS does
            not keep a hidden profile copy.
          </p>
        </div>
        {!loading && status.currentEmail ? (
          <span
            className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${
              status.verified
                ? "border-green-300/35 bg-green-300/10 text-green-100"
                : "border-amber-300/35 bg-amber-300/10 text-amber-100"
            }`}
          >
            {status.verified ? "Verified" : "Not verified"}
          </span>
        ) : null}
      </div>

      {status.pendingEmail ? (
        <div className="mt-5 rounded-xl border border-sky-300/30 bg-sky-300/10 p-4">
          <p className="text-sm font-black text-sky-100">
            Pending email change
          </p>
          <p className="mt-2 break-all font-bold text-white">
            {status.pendingEmail}
          </p>
          <p className="mt-2 text-xs leading-5 text-sky-100/80">
            Requested {formatSentAt(status.emailChangeSentAt)}. Your current
            email remains the login email until the required confirmations are
            complete.
          </p>
        </div>
      ) : null}

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-green-300/30 bg-green-300/10 p-3 text-sm font-bold leading-6 text-green-100"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm font-bold leading-6 text-red-100"
        >
          {error}
        </p>
      ) : null}

      {!loading && status.currentEmail && (!status.verified || status.pendingEmail) ? (
        <button
          type="button"
          onClick={resendVerification}
          disabled={resending || cooldown > 0}
          className="beast-button-secondary mt-4 min-h-11 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resending
            ? "Sending verification…"
            : cooldown > 0
              ? `Send again in ${cooldown}s`
              : status.pendingEmail
                ? "Resend email-change verification"
                : "Resend account verification"}
        </button>
      ) : null}

      {!loading && status.currentEmail ? (
        <form
          onSubmit={requestEmailChange}
          className="mt-6 border-t border-[#2a3242] pt-5"
        >
          <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
            New sign-in email
            <input
              type="email"
              autoComplete="email"
              value={requestedEmail}
              onChange={(event) => {
                setRequestedEmail(event.target.value);
                setConfirmed(false);
              }}
              className="beast-input"
              placeholder="new@email.com"
              disabled={submitting}
            />
          </label>
          {requestedEmail ? (
            <label className="mt-4 flex items-start gap-3 text-sm font-semibold leading-6 text-[#cbd5e1]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4"
                disabled={submitting}
              />
              I understand that Supabase will verify this change and that my
              current email remains the login email until confirmation is
              complete.
            </label>
          ) : null}
          <button
            type="submit"
            disabled={submitting || !normalizedRequest || !confirmed}
            className="beast-button mt-4 min-h-11 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Requesting change…" : "Request email change"}
          </button>
        </form>
      ) : null}
    </DashboardCard>
  );
}
