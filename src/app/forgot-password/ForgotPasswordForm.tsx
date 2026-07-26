"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  buildAuthLoginPath,
  buildPasswordRecoveryCallbackUrl,
  getBeastAuthOrigin,
} from "@/lib/auth/experience";
import { createClient } from "@/lib/supabase/client";

const REQUEST_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordForm({
  destination,
}: {
  destination: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "failed"
  >("idle");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setStatus("failed");
      setMessage("Enter your account email to continue.");
      return;
    }

    setStatus("sending");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: buildPasswordRecoveryCallbackUrl(
            getBeastAuthOrigin(
              window.location.origin,
              process.env.NEXT_PUBLIC_BEAST_SITE_URL
            ),
            destination
          ),
        }
      );

      if (error) {
        setStatus("failed");
        setMessage(
          error.code === "over_email_send_rate_limit" ||
            error.code === "over_request_rate_limit"
            ? "Too many reset requests were made. Wait a minute, then try again."
            : "BeastOS could not request a password reset right now. Please try again."
        );
        return;
      }

      setEmail(normalizedEmail);
      setStatus("sent");
      setCooldown(REQUEST_COOLDOWN_SECONDS);
    } catch {
      setStatus("failed");
      setMessage(
        "BeastOS could not request a password reset right now. Please try again."
      );
    }
  }

  return (
    <main className="beast-page flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
      <section
        aria-labelledby="forgot-password-title"
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
              One account across Beast
            </p>
          </div>
        </div>

        <h1
          id="forgot-password-title"
          className="mt-7 text-3xl font-black tracking-tight text-white"
        >
          Reset your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#b8c2d0]">
          Enter your account email. If it belongs to a Beast account, we’ll send
          secure reset instructions.
        </p>

        {status === "sent" ? (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-[#24516a] bg-[#0e1b24] p-4"
          >
            <p className="font-bold text-white">Check your email</p>
            <p className="mt-2 text-sm leading-6 text-[#b8c7d4]">
              If a Beast account uses that email, reset instructions are on the
              way. Check spam if you do not see them.
            </p>
          </div>
        ) : null}

        <form className="mt-6" onSubmit={requestReset}>
          <label htmlFor="recovery-email" className="text-sm font-bold text-white">
            Account email
          </label>
          <input
            id="recovery-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="beast-input mt-2 min-h-[48px]"
            autoFocus
          />

          {message ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-[#6b3440] bg-[#241319] p-3 text-sm leading-5 text-[#efc4cd]"
            >
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "sending" || cooldown > 0}
            className="beast-button mt-4 min-h-[48px] w-full disabled:cursor-wait disabled:opacity-60"
          >
            {status === "sending"
              ? "Sending reset email…"
              : cooldown > 0
                ? `Request another email in ${cooldown}s`
                : status === "sent"
                  ? "Request another reset email"
                  : "Send Reset Email"}
          </button>
        </form>

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
