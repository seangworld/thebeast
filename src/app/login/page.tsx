"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function sendMagicLink() {
    setMessage("");

    if (!email) {
      setMessage("Enter your email to access your free account.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Check your email for the login link.");
  }

  return (
    <main className="beast-page flex min-h-screen items-center justify-center">
      <div className="beast-card w-full max-w-md">
      <img
  src="/beast-logo-square.png"
  alt="The Beast logo"
  className="mx-auto mb-4 h-24 w-24 rounded-2xl object-cover"
/>
        <p className="beast-kicker">The Beast Beta</p>
        <h1 className="beast-title">Login / Signup</h1>
        <p className="beast-subtitle">
          Enter your email to receive a free magic login link.
        </p>

        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="beast-input mt-6"
        />

        <button onClick={sendMagicLink} className="beast-button mt-4 w-full">
          Send Login Link
        </button>

        {message && (
          <p className="mt-4 text-sm text-[#c7cfdb]">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}