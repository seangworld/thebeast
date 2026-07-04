"use client";

import Link from "next/link";
import {
  BEASTOS_UI_POLISH_NOTE,
  BEAST_LEARNING_VERSION,
} from "@/lib/appVersion";

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
        {/* BeastLearning v0.5 */}
        <div className="mb-12 rounded-lg border border-[#2a3242] bg-[#0f1419] p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">
              BeastLearning {BEAST_LEARNING_VERSION}
            </h2>
            <p className="mt-1 text-sm text-[#7f8da3]">July 4, 2026</p>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-[#c7cfdb]">
                Learning Experience
              </h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added onboarding,
                  daily mission, focus mode, journey roadmap, achievement
                  polish, certificate experience, motivation, habits, insights,
                  gamification, learner profile, parent polish, accessibility
                  placeholders, and beta badges.
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Refocused the
                  Learning dashboard around the next best action for daily
                  study.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* BeastLearning v0.4 */}
        <div className="mb-12 rounded-lg border border-[#2a3242] bg-[#0f1419] p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">
              BeastLearning v0.4 Content & Study Intelligence
            </h2>
            <p className="mt-1 text-sm text-[#7f8da3]">July 4, 2026</p>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-[#c7cfdb]">
                Content & Study Intelligence
              </h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added typed
                  foundations for the Learning Library, subjects, course
                  builder, lessons, flashcards, quizzes, practice exams, study
                  guides, spaced repetition, notes, bookmarks, collections, and
                  Learning Search.
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Extended the Learning
                  dashboard with recent materials, continue studying,
                  recommended resources, flashcards due, upcoming review,
                  bookmarked items, study collections, and course progress.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* BeastLearning v0.3 */}
        <div className="mb-12 rounded-lg border border-[#2a3242] bg-[#0f1419] p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">
              BeastLearning v0.3 Intelligence Foundation
            </h2>
            <p className="mt-1 text-sm text-[#7f8da3]">July 3, 2026</p>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-[#c7cfdb]">
                Learning Foundation
              </h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Completed the
                  BeastLearning workspace, goal builder, starter plan stub,
                  study session command card, progress signals, recommendations,
                  templates, guidance counselor mode, and completion surfaces.
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added deterministic
                  learning intelligence for knowledge modeling, mastery,
                  dependency state, memory, weakness analysis, adaptive
                  planning, study sessions, resources, and prediction.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#c7cfdb]">BeastOS UI</h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span>{" "}
                  {BEASTOS_UI_POLISH_NOTE}.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* v2.0 */}
        <div className="mb-12 rounded-lg border border-[#2a3242] bg-[#0f1419] p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">v2.0</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">June 30, 2026</p>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-[#c7cfdb]">Velocity v2</h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Completed the
                  Velocity Planner recommendation engine for target debt,
                  recommended chunk, recovery timeline, and interest savings.
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added deterministic
                  Beast Advisor sections for recommendation, rationale, expected
                  result, risks, and alternatives.
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Integrated Velocity
                  into Debt Strategy selection, payoff projections, and strategy
                  comparison results.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#c7cfdb]">Improved</h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Modeled source APR,
                  source balance, recovery repayment, utilization guardrails,
                  bills due soon, and projected net savings.
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Expanded focused
                  tests for the Velocity adapter, engine, advisor, and payoff
                  plan integration.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* v1.9.1 Beta */}
        <div className="mb-12 rounded-lg border border-[#2a3242] bg-[#0f1419] p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">v1.9.1 Beta</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">June 21, 2026</p>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-[#c7cfdb]">New</h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Bills and debts now
                  prioritize upcoming due dates.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#c7cfdb]">Improved</h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Cash Flow assignment
                  validation reliability.
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Obligation
                  visibility and planning workflow.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#c7cfdb]">Fixed</h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Active obligations
                  retain valid assignment buckets even after the assigned income
                  date passes.
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Additional Cash Flow
                  stability improvements identified during regression testing.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* v1.9.0 Beta */}
        <div className="mb-12 rounded-lg border border-[#2a3242] bg-[#0f1419] p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">v1.9.0 Beta</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">May 31, 2026</p>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-[#c7cfdb]">New / Added</h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added Payment
                  Source Coverage for current-cycle bill funding
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added Funding
                  Intelligence insights
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added Funding
                  Recommendations for cash, credit, unassigned bills, and
                  Velocity readiness
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added payment source
                  tracking support for bill and debt payments
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added 7-day and
                  14-day planning windows
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added reset utility
                  for bill/debt test due-date overrides
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Added helper text
                  explaining how Funding Sources and Debts can overlap
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#c7cfdb]">Improved</h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Improved Funding
                  Source utilization accuracy by preferring current balance over
                  available credit
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Improved Settings
                  persistence after reload
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Synchronized
                  Strategy settings between Settings and Debt Strategy
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Improved local/dev
                  Supabase environment awareness with warnings when using
                  production defaults
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Improved Cash Flow
                  reliability after payments
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#c7cfdb]">Fixed</h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Fixed debt payment
                  workflow targeting and payment feedback
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Fixed debt due-date
                  advancement after minimum payments
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Fixed bill due-date
                  advancement after payments
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Fixed bill/debt income
                  pot reset behavior after payments
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Fixed revolving debt
                  payoff-to-zero behavior
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Fixed Settings page
                  loading fallback/default values instead of persisted values
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#c7cfdb]">
                Internal / Architecture
              </h3>
              <ul className="space-y-2 pl-4">
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Extracted Funding
                  Source summary cards into components
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Extracted Payment
                  Source Coverage into a component
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Extracted Funding
                  Intelligence into a component
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Extracted Funding
                  Recommendations into a component
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Extracted Bills
                  section and Bill Payment Controls into components
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Extracted Debts
                  section and Debt Payment Controls into components
                </li>
                <li className="text-[#a5b4c7]">
                  <span className="text-blue-400">✓</span> Reduced Cash Flow
                  page complexity while preserving behavior
                </li>
              </ul>
            </div>
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
            The Beast continues to improve. Features, calculations, and
            recommendations are continuously improved based on real-world usage
            and user feedback.
          </p>
        </div>
      </main>
    </div>
  );
}
