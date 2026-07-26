"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { validateBeastPassword } from "@/lib/auth/experience";
import { createClient } from "@/lib/supabase/client";

export default function AcceptInvitationForm({
  destination,
  passwordEnabled,
}: {
  destination: string;
  passwordEnabled: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const validation = useMemo(
    () => validateBeastPassword(password),
    [password]
  );

  async function completeInvitation() {
    const response = await fetch("/api/auth/invitation/complete", {
      method: "POST",
      credentials: "same-origin",
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
          ? payload.error
          : "BeastOS could not complete this invitation."
      );
    }

    router.replace(destination);
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (passwordEnabled) {
      if (!validation.valid) {
        setError("Choose a password that meets every requirement.");
        return;
      }
      if (password !== confirmation) {
        setError("The passwords do not match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (passwordEnabled) {
        const supabase = createClient();
        const { error: passwordError } = await supabase.auth.updateUser({
          password,
        });
        if (passwordError) {
          throw new Error(
            "BeastOS could not save this password. Request a new invitation if the link has expired."
          );
        }
      }

      await completeInvitation();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "BeastOS could not complete this invitation."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="beast-page flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <section className="beast-card w-full max-w-lg px-5 py-7 sm:px-10 sm:py-10">
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
              BeastOS invitation
            </p>
            <p className="mt-1 text-sm font-semibold text-[#9da9b9]">
              One account for the Beast ecosystem
            </p>
          </div>
        </div>

        <h1 className="mt-7 text-3xl font-black text-white">
          Welcome to Beast
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#b8c2d0]">
          Your invitation has been verified. Finish account setup to continue
          to BeastOS and the applications your owner enabled.
        </p>

        <form onSubmit={submit} className="mt-7 grid gap-5">
          {passwordEnabled ? (
            <>
              <label className="grid gap-2 text-sm font-bold text-white">
                Create password
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    className="beast-input pr-20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 px-4 text-xs font-black text-sky-200"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <label className="grid gap-2 text-sm font-bold text-white">
                Confirm password
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="new-password"
                  className="beast-input"
                  required
                />
              </label>
              <ul className="grid gap-1 text-xs leading-5 text-[#9da9b9]">
                {validation.requirements.map((requirement) => (
                  <li key={requirement.label}>
                    {requirement.met ? "✓" : "•"} {requirement.label}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="rounded-xl border border-sky-300/25 bg-sky-300/10 p-4 text-sm leading-6 text-sky-100">
              BeastOS currently uses secure email-link sign-in. No password is
              required for this account.
            </p>
          )}

          {error ? (
            <p role="alert" className="text-sm font-bold text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="beast-button min-h-[48px] w-full disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Completing invitation…" : "Continue to BeastOS"}
          </button>
        </form>
      </section>
    </main>
  );
}
