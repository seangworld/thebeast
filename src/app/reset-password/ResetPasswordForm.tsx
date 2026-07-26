"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  buildAuthLoginPath,
  buildForgotPasswordPath,
  getAuthErrorMessage,
  validateBeastPassword,
} from "@/lib/auth/experience";
import { createClient } from "@/lib/supabase/client";

type RecoveryFailureState =
  | "invalid_or_expired_link"
  | "authentication_error"
  | null;

export default function ResetPasswordForm({
  destination,
  recoveryAuthorized,
  failureState,
}: {
  destination: string;
  recoveryAuthorized: boolean;
  failureState: RecoveryFailureState;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [localFailure, setLocalFailure] =
    useState<RecoveryFailureState>(failureState);
  const [message, setMessage] = useState("");
  const validation = useMemo(
    () => validateBeastPassword(password),
    [password]
  );

  useEffect(() => {
    if (!recoveryAuthorized || failureState) return;

    let active = true;

    async function verifyRecoverySession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (error || !user) {
          setLocalFailure("invalid_or_expired_link");
          return;
        }

        setSessionReady(true);
      } catch {
        if (active) setLocalFailure("authentication_error");
      }
    }

    void verifyRecoverySession();
    return () => {
      active = false;
    };
  }, [failureState, recoveryAuthorized]);

  async function finishSecuringAccount() {
    setSubmitting(true);
    setMessage("");

    try {
      const supabase = createClient();
      const completionResponse = await fetch(
        "/api/auth/password-recovery/complete",
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      if (!completionResponse.ok) {
        throw new Error("Unable to close the recovery window.");
      }

      const { error } = await supabase.auth.signOut({ scope: "global" });

      if (error) {
        setMessage(
          "Your password changed, but BeastOS could not close every existing session. Try finishing account security again."
        );
        return;
      }

      router.replace(
        buildAuthLoginPath(destination, "password_reset_success")
      );
      router.refresh();
    } catch {
      setMessage(
        "Your password changed, but BeastOS could not close every existing session. Try finishing account security again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!validation.valid) {
      setMessage("Choose a password that meets every requirement below.");
      return;
    }

    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        if (
          error.code === "session_not_found" ||
          error.code === "session_expired" ||
          error.code === "refresh_token_not_found"
        ) {
          setLocalFailure("invalid_or_expired_link");
          return;
        }

        setMessage(getAuthErrorMessage(error));
        return;
      }

      setPasswordUpdated(true);
      setPassword("");
      setConfirmation("");
      await finishSecuringAccount();
    } catch {
      setMessage("BeastOS could not update your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const failure = localFailure || (!recoveryAuthorized ? "invalid_or_expired_link" : null);

  return (
    <main className="beast-page flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
      <section
        aria-labelledby="reset-password-title"
        className="beast-card w-full max-w-lg px-5 py-7 text-left sm:px-10 sm:py-10"
      >
        <div className="flex items-center gap-4">
          <Image
            src="/beast-logo-square.png"
            alt="BeastOS"
            width={64}
            height={64}
            priority
            className="h-14 w-14 rounded-xl object-cover sm:h-16 sm:w-16"
          />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#38bdf8]">
              BeastOS authentication
            </p>
            <p className="mt-1 text-sm font-semibold text-[#9da9b9]">
              Secure password recovery
            </p>
          </div>
        </div>

        {failure ? (
          <div
            role="alert"
            className="mt-7 rounded-2xl border border-[#6b3440] bg-[#241319] p-5"
          >
            <h1
              id="reset-password-title"
              className="text-2xl font-black text-white"
            >
              {failure === "invalid_or_expired_link"
                ? "This reset link no longer works"
                : "Password recovery was interrupted"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#d7bdc3]">
              {failure === "invalid_or_expired_link"
                ? "The link may be expired, already used, or malformed. Request a new reset email to continue."
                : "BeastOS could not verify this recovery session. Request a new reset email and try again."}
            </p>
            <Link
              href={buildForgotPasswordPath(destination)}
              className="beast-button mt-5 flex min-h-[48px] w-full items-center justify-center"
            >
              Request a new reset email
            </Link>
          </div>
        ) : !sessionReady ? (
          <div role="status" className="mt-7 text-center">
            <div
              className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#334155] border-t-[#38bdf8]"
              aria-hidden="true"
            />
            <h1
              id="reset-password-title"
              className="mt-4 text-xl font-black text-white"
            >
              Verifying your secure link…
            </h1>
            <p className="mt-2 text-sm text-[#9da9b9]">
              BeastOS is confirming this recovery session.
            </p>
          </div>
        ) : passwordUpdated ? (
          <div className="mt-7">
            <h1
              id="reset-password-title"
              className="text-2xl font-black text-white"
            >
              Finish securing your account
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#b8c2d0]">
              Your password changed. BeastOS still needs to close every existing
              session before you sign in again.
            </p>
            {message ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#6b3440] bg-[#241319] p-3 text-sm leading-5 text-[#efc4cd]"
              >
                {message}
              </p>
            ) : null}
            <button
              type="button"
              disabled={submitting}
              className="beast-button mt-5 min-h-[48px] w-full disabled:cursor-wait disabled:opacity-60"
              onClick={() => void finishSecuringAccount()}
            >
              {submitting ? "Securing account…" : "Finish Account Security"}
            </button>
          </div>
        ) : (
          <>
            <h1
              id="reset-password-title"
              className="mt-7 text-3xl font-black tracking-tight text-white"
            >
              Create a new password
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#b8c2d0]">
              After your password changes, BeastOS will close every existing
              session and ask you to sign in again.
            </p>

            <form className="mt-6" onSubmit={updatePassword}>
              <label htmlFor="new-password" className="text-sm font-bold text-white">
                New password
              </label>
              <div className="relative mt-2">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="beast-input min-h-[48px] pr-20"
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 min-w-[64px] px-3 text-sm font-bold text-[#7dd3fc] hover:text-white"
                  aria-label={showPassword ? "Hide new password" : "Show new password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <label
                htmlFor="confirm-password"
                className="mt-4 block text-sm font-bold text-white"
              >
                Confirm new password
              </label>
              <div className="relative mt-2">
                <input
                  id="confirm-password"
                  type={showConfirmation ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="beast-input min-h-[48px] pr-20"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 min-w-[64px] px-3 text-sm font-bold text-[#7dd3fc] hover:text-white"
                  aria-label={
                    showConfirmation
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                  onClick={() => setShowConfirmation((current) => !current)}
                >
                  {showConfirmation ? "Hide" : "Show"}
                </button>
              </div>

              <div
                className="mt-4 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4"
                aria-label="Password requirements"
              >
                <p className="text-xs font-black uppercase tracking-wide text-[#8d99aa]">
                  Password requirements
                </p>
                <ul className="mt-3 space-y-2">
                  {validation.requirements.map((requirement) => (
                    <li
                      key={requirement.id}
                      className={`flex items-center gap-2 text-sm ${
                        requirement.met ? "text-[#86efac]" : "text-[#aab4c2]"
                      }`}
                    >
                      <span aria-hidden="true">
                        {requirement.met ? "✓" : "○"}
                      </span>
                      {requirement.label}
                    </li>
                  ))}
                </ul>
              </div>

              {message ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-[#6b3440] bg-[#241319] p-3 text-sm leading-5 text-[#efc4cd]"
                >
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="beast-button mt-5 min-h-[48px] w-full disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? "Updating password…" : "Update Password"}
              </button>
            </form>
          </>
        )}

        <Link
          href={buildAuthLoginPath(destination)}
          className="mt-5 block min-h-[44px] py-3 text-center text-sm font-bold text-[#7dd3fc] transition hover:text-white"
        >
          Back to BeastOS sign in
        </Link>
      </section>
    </main>
  );
}
