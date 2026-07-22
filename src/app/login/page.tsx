"use client";

import Image from "next/image";
import { useState } from "react";
import { APP_VERSION } from "@/lib/appVersion";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const mentorPromises = [
    "We start with a conversation, not a dashboard.",
    "You can tell your Mentor your goal in plain words.",
    "When it is time to learn, your Mentor brings in the Tutor.",
  ];

  async function sendMagicLink() {
    setMessage("");

    if (!email) {
      setMessage("Type your email first so I know where to send your private link.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard/onboarding`,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("I sent your private link. Open it from your email and I will meet you inside.");
  }

  return (
    <main className="beast-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <section className="beast-card flex flex-col justify-between">
          <div>
            <Image
              src="/beast-logo-square.png"
              alt="The Beast logo"
              width={96}
              height={96}
              className="mb-4 h-24 w-24 rounded-2xl object-cover"
            />
            <p className="beast-kicker">BeastEducation Guidance Counselor - The Beast {APP_VERSION}</p>
            <h1 className="beast-title">Meet Your BeastEducation Guidance Counselor</h1>
            <p className="beast-subtitle">
              Start with someone who learns where you want to go, helps choose
              the next step, and brings in the Tutor when you are ready to learn.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-indigo-300/35 bg-indigo-300/10 p-4">
            <p className="text-sm font-semibold leading-6 text-indigo-100">
              {"Hi. I'm your Mentor. Tell me what you want your future to look like, and I will help you build the path one step at a time."}
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {mentorPromises.map((promise) => (
              <div
                key={promise}
                className="rounded-xl border border-[#2a3242] bg-[#111827] px-4 py-3 text-sm font-semibold text-[#c7cfdb]"
              >
                {promise}
              </div>
            ))}
          </div>
        </section>

        <section className="beast-card flex flex-col justify-center">
          <p className="beast-kicker">Private Sign In</p>
          <h2 className="text-3xl font-black text-white">Send me my private link</h2>
          <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">
            Enter your email and I will send a private sign-in link. No password
            to remember.
          </p>

          <input
            type="email"
            aria-label="Email address"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="beast-input mt-6"
          />

          <button type="button" onClick={sendMagicLink} className="beast-button mt-4 w-full">
            Send my private link
          </button>

          {message && (
            <p className="mt-4 rounded-xl border border-[#2a3242] bg-[#111827] p-3 text-sm leading-5 text-[#c7cfdb]">
              {message}
            </p>
          )}

          <p className="mt-5 text-xs leading-5 text-[#7f8da3]">
            Your Mentor will meet you inside and help you decide what to do next.
          </p>
        </section>
      </div>
    </main>
  );
}
