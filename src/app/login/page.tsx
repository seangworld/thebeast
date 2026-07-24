"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
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
            alt="Beast"
            width={104}
            height={104}
            priority
            className="h-24 w-24 rounded-2xl object-cover sm:h-28 sm:w-28"
          />
          <h1
            id="beast-auth-title"
            className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl"
          >
            Beast
          </h1>
          <p className="mt-3 text-base leading-7 text-[#c7cfdb] sm:text-lg">
            AI that helps you improve your life.
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
