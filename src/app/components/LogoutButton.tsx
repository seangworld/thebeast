"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!confirming) return;

    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !signingOut) {
        setConfirming(false);
        setError("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirming, signingOut]);

  async function logout() {
    setSigningOut(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError("BeastOS could not sign you out. Please try again.");
        return;
      }

      router.replace("/login?state=signed_out");
      router.refresh();
    } catch {
      setError("BeastOS could not sign you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfirming(true);
          setError("");
        }}
        className="beast-button-secondary"
      >
        Log Out
      </button>

      {confirming ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-8"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !signingOut) {
              setConfirming(false);
              setError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-out-title"
            aria-describedby="sign-out-description"
            className="beast-card w-full max-w-md p-5 text-left shadow-2xl sm:p-6"
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#38bdf8]">
              BeastOS account
            </p>
            <h2 id="sign-out-title" className="mt-2 text-xl font-black text-white">
              Log out of Beast?
            </h2>
            <p
              id="sign-out-description"
              className="mt-2 text-sm leading-6 text-[#b8c2d0]"
            >
              You’ll be signed out of every Beast application on this device.
            </p>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#6b3440] bg-[#241319] p-3 text-sm text-[#efc4cd]"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                ref={cancelButtonRef}
                type="button"
                disabled={signingOut}
                className="beast-button-secondary min-h-[48px] disabled:opacity-60"
                onClick={() => {
                  setConfirming(false);
                  setError("");
                }}
              >
                Stay signed in
              </button>
              <button
                type="button"
                disabled={signingOut}
                className="beast-button min-h-[48px] disabled:cursor-wait disabled:opacity-60"
                onClick={() => void logout()}
              >
                {signingOut ? "Logging out…" : "Log Out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
