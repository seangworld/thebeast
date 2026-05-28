"use client";

import Link from "next/link";

export default function ReleaseNotesPage() {
  return (
    <div className="min-h-screen bg-[#1a1f2e] text-[#c7cfdb]">
      <header className="border-b border-[#2a3242] bg-[#151b28] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#7f8da3] hover:text-[#c7cfdb] transition"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-3xl font-bold">Release Notes</h1>
          <p className="mt-2 text-sm text-[#7f8da3]">
            The Beast: Your Velocity Strategy Engine
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* v1.5.0 Beta */}
        <div className="mb-12 rounded-lg border border-[#2a3242] bg-[#0f1419] p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">v1.5.0 Beta</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">May 28, 2026</p>
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-[#c7cfdb]">
              Velocity Funding Intelligence Update
            </h3>
            <ul className="space-y-2 pl-4">
              <li className="text-[#a5b4c7]">
                <span className="text-blue-400">✓</span> Added Payment Source
                Coverage inside Funding Sources to visualize bill funding by
                account type
              </li>
              <li className="text-[#a5b4c7]">
                <span className="text-blue-400">✓</span> Added Funding
                Intelligence insights that warn about unassigned payments,
                credit reliance, and high utilization
              </li>
              <li className="text-[#a5b4c7]">
                <span className="text-blue-400">✓</span> Added Funding
                Recommendations for cash, credit, unassigned bills, and Velocity
                readiness based on current funding patterns
              </li>
              <li className="text-[#a5b4c7]">
                <span className="text-blue-400">✓</span> Improved
                funding-source visibility for mobile users with responsive card
                layouts
              </li>
              <li className="text-[#a5b4c7]">
                <span className="text-blue-400">✓</span> Continued Velocity
                Strategy Engine Phase 2 work with payment source tracking
                infrastructure
              </li>
            </ul>
          </div>
        </div>

        {/* Earlier Versions */}
        <div className="space-y-8 text-sm">
          <h2 className="text-lg font-semibold">Earlier Versions</h2>

          <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold">v1.4.0</h3>
              <p className="mt-1 text-[#7f8da3]">May 26, 2026</p>
            </div>
            <p className="text-[#a5b4c7]">
              Added dynamic minimum payment calculations for revolving debts,
              helper text for Funding Sources and Debts sections, and fixed
              credit utilization calculations.
            </p>
          </div>

          <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold">v1.3.0</h3>
              <p className="mt-1 text-[#7f8da3]">May 20, 2026</p>
            </div>
            <p className="text-[#a5b4c7]">
              Added clarification helper text to Cash Flow page, improved
              funding source visibility, and enhanced Velocity Strategy Engine
              Phase 1.
            </p>
          </div>

          <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold">v1.2.0</h3>
              <p className="mt-1 text-[#7f8da3]">May 15, 2026</p>
            </div>
            <p className="text-[#a5b4c7]">
              Initial Velocity Strategy Engine implementation with payoff
              strategy visualization and cash flow timeline.
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-[#2a3242] pt-8">
          <p className="text-xs text-[#7f8da3]">
            The Beast is in active development. Features, calculations, and
            recommendations are continuously improved based on real-world usage
            and user feedback.
          </p>
        </div>
      </main>
    </div>
  );
}
