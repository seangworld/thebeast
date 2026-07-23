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
      <div className="beast-container">
        <section role="alert" className="rounded-2xl border border-red-400/35 bg-red-400/10 p-5 sm:p-8">
          <p className="beast-kicker text-red-200">Learning workspace unavailable</p>
          <h1 className="mt-2 text-2xl font-black text-white">We could not load this workspace</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-red-50">
            {process.env.NODE_ENV === "development" ? error.message : "Your learning records are still safe. Try loading them again."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={reset} className="beast-button">Try again</button>
            <Link href="/dashboard/education" className="beast-button-secondary">Back to Learning Mission Control</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
