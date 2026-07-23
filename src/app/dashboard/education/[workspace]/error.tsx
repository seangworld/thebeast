"use client";

import Link from "next/link";

export default function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="beast-page">
      <div className="beast-container flex min-h-[55vh] items-center justify-center">
        <section role="alert" className="w-full max-w-3xl overflow-hidden rounded-3xl border border-red-400/30 bg-gradient-to-br from-red-400/[0.09] to-[#111722] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-300/30 bg-red-300/10 text-xl font-black text-red-100" aria-hidden="true">!</div>
          <p className="beast-kicker mt-6 text-red-200">Learning workspace unavailable</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">We could not load this workspace</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-red-50 sm:text-base sm:leading-7">
            {process.env.NODE_ENV === "development" ? error.message : "Your learning records are still safe. Try loading them again."}
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={reset} className="beast-button justify-center">Try again</button>
            <Link href="/dashboard/education" className="beast-button-secondary justify-center">Back to Learning Mission Control</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
