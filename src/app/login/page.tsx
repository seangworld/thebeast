"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import {
  beastOSApplications,
  beastOSPlatformIdentity,
  beastOSSharedCapabilities,
} from "@/lib/platform/identity";
import { createClient } from "@/lib/supabase/client";

type AuthIntent = "login" | "create-account";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState<AuthIntent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!email) {
      setMessage("Enter your email to continue.");
      return;
    }

    if (!intent) return;

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard/today`,
        shouldCreateUser: intent === "create-account",
      },
    });
    setSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      intent === "create-account"
        ? "Check your email to finish creating your Beast account."
        : "Check your email for your Beast login link."
    );
  }

  return (
    <main className="beast-page flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <section
        aria-labelledby="beast-auth-title"
        className="beast-card w-full max-w-lg px-6 py-8 text-center sm:px-10 sm:py-12"
      >
        <div className="flex flex-col items-center">
          <Image
            src="/beast-logo-square.png"
            alt="BeastOS"
            width={104}
            height={104}
            priority
            className="h-24 w-24 rounded-2xl object-cover sm:h-28 sm:w-28"
          />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#38bdf8]">
            {beastOSPlatformIdentity.role}
          </p>
          <h1
            id="beast-auth-title"
            className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl"
          >
            BeastOS
          </h1>
          <p className="mt-3 text-base leading-7 text-[#c7cfdb] sm:text-lg">
            {beastOSPlatformIdentity.description}
          </p>
        </div>

        <div
          className="mt-7 rounded-2xl border border-[#2a3242] bg-[#0f1419] p-4 text-left"
          aria-label="Beast applications and shared platform services"
        >
          <div className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
            Beast applications
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {beastOSApplications.map((application) => (
              <span
                key={application.id}
                className="rounded-full border border-[#2a3242] bg-[#111827] px-2.5 py-1 text-xs font-bold text-[#dbe3ef]"
              >
                {application.name}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-[#7f8da3]">
            Shared by every application: {beastOSSharedCapabilities.join(" · ")}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="beast-button min-h-[48px] w-full"
            aria-pressed={intent === "login"}
            onClick={() => {
              setIntent("login");
              setMessage("");
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className="beast-button-secondary min-h-[48px] w-full"
            aria-pressed={intent === "create-account"}
            onClick={() => {
              setIntent("create-account");
              setMessage("");
            }}
          >
            Create Account
          </button>
        </div>

        {intent ? (
          <form
            className="mt-7 border-t border-[#2a3242] pt-7 text-left"
            onSubmit={sendMagicLink}
          >
            <label htmlFor="email" className="text-sm font-bold text-white">
              Email address
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="beast-input mt-2 min-h-[48px]"
              autoFocus
            />
            <button
              type="submit"
              disabled={submitting}
              className="beast-button mt-4 min-h-[48px] w-full disabled:cursor-wait disabled:opacity-60"
            >
              {submitting
                ? "Sending..."
                : intent === "create-account"
                  ? "Email Me a Sign-Up Link"
                  : "Email Me a Login Link"}
            </button>
          </form>
        ) : null}

        {message ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-5 rounded-xl border border-[#2a3242] bg-[#111827] p-3 text-left text-sm leading-5 text-[#c7cfdb]"
          >
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
