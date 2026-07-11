import Link from "next/link";
import {
  BEASTOS_UI_POLISH_NOTE,
  BEAST_LEARNING_VERSION,
  BEAST_MONEY_VERSION_LABEL,
} from "@/lib/appVersion";

const releaseNotes = [
  {
    version: BEAST_MONEY_VERSION_LABEL,
    date: "July 11, 2026",
    title: "Velocity Strategy Engine Hardening",
    items: [
      "New features: hardened Velocity minimum-payment modeling for fixed and revolving debts.",
      "Improvements: clarified monthly interest, source-cost, recovery-window, utilization, cash-buffer, and positive net-savings assumptions in engine evidence.",
      "Guardrails: missing APR and missing usable minimum-payment inputs now produce warnings instead of confident payoff assumptions.",
      "Personal Hub: BeastMoney references goals and documents as permissioned Personal Hub context only; no duplicate goal or document storage was added.",
      "Free / Pro: Velocity Planner and Beast Advisor remain gated by Pro entitlement logic before public claims.",
      "Breaking changes: none.",
      "Migration notes: no database migration required.",
    ],
  },
  {
    version: "BeastOS v2.1",
    date: "July 4, 2026",
    title: "BeastLearning v1.0 Private Beta Closeout",
    items: [
      "Finalized BeastLearning v1.0 Private Beta with guided initialization, progressive dashboard stages, mission-based onboarding, Learning intelligence, AI orchestration, AI integration boundary, prompt library, parent/learner model, student timeline, certificate generation, Founding Student program, and beta feedback platform.",
      "Closed out the Learning content foundation: knowledge graph, curriculum intelligence, Learning library, courses, lessons, flashcards, quizzes, practice exams, study guides, search, and collections.",
      `Restored BeastOS UI polish with ${BEASTOS_UI_POLISH_NOTE}, added reusable module sub-navigation, and fixed shared Calendar date alignment for local-time month grids.`,
    ],
  },
  {
    version: `BeastLearning ${BEAST_LEARNING_VERSION}`,
    date: "July 4, 2026",
    title: "Private Beta",
    items: [
      "Completed BeastLearning v1.0 Private Beta with guided initialization missions, progressive dashboard stages, Founding Student badges, student timeline, parent/learner relationship foundation, persisted feedback queue, and downloadable completion certificates.",
      "Connected the AI architecture to a server-side OpenAI adapter with centralized prompts, deterministic specialist routing, reusable context, conversation memory, and the homework-first coaching philosophy.",
      "Added Supabase persistence foundations for profiles, goals, plans, sessions, progress, mastery, achievements, certificates, study habits, feedback, learning history, and parent links while keeping local fallback behavior for unconfigured environments.",
    ],
  },
  {
    version: "BeastLearning v0.7 AI Orchestration Platform",
    date: "July 4, 2026",
    title: "AI Orchestration Platform",
    items: [
      "Added the mocked AI orchestration architecture with specialist registry, specialist contracts, deterministic router, context builder, intent detection, conversation memory, homework policy, and AI session manager.",
      "Exposed selected specialist, routing reason, available specialists, required context, conversation memory, homework philosophy, session state, and future AI status on the Learning dashboard.",
      "Kept v0.7 architecture-only with no OpenAI, prompts, streaming, API calls, Supabase persistence, database schema changes, OCR, embeddings, vector search, finance changes, Stripe changes, membership changes, or entitlement changes.",
    ],
  },
  {
    version: "BeastLearning v0.6 Knowledge & Curriculum Intelligence",
    date: "July 4, 2026",
    title: "Knowledge & Curriculum Intelligence",
    items: [
      "Added BeastLearning's educational knowledge layer with global subjects, curriculum hierarchy, concept library, visualization-ready skill trees, learning standards placeholders, career models, certification catalog, path generation, resource mapping, and mastery maps.",
      "Exposed Skill Tree, Current Curriculum, Career Progress, Certification Progress, Mastery Map, and Recommended Next Concept on the Learning dashboard.",
      "Kept v0.6 deterministic, typed, mocked where needed, and provider-independent with no OpenAI, OCR, embeddings, vector search, document parsing, Supabase persistence, database schema changes, external APIs, finance changes, Stripe changes, membership changes, or entitlement changes.",
    ],
  },
  {
    version: "BeastLearning v0.5 Learning Experience",
    date: "July 4, 2026",
    title: "Learning Experience",
    items: [
      "Added the BeastLearning LX layer with first-time onboarding, daily mission, focus mode, learning journeys, achievement polish, certificate experience, motivation, study habits, learner insights, gamification, accessibility placeholders, learner profile expansion, parent polish, and beta experience surfaces.",
      "Redesigned the top of the Learning dashboard around the next best learning action so learners can immediately answer what to do next.",
      "Kept v0.5 deterministic and client-side with no OpenAI, OCR, embeddings, vector search, document parsing, Supabase persistence, database schema changes, external APIs, finance changes, Stripe changes, membership changes, or entitlement changes.",
    ],
  },
  {
    version: "BeastLearning v0.4 Content & Study Intelligence",
    date: "July 4, 2026",
    title: "Content & Study Intelligence",
    items: [
      "Added typed Learning Library, subject organization, course builder, lesson model, flashcard engine, quiz engine, practice exam framework, study guide engine, spaced repetition schedule, notes, bookmarks, collections, search, and dashboard content aggregation.",
      "Extended the Learning dashboard with content intelligence surfaces for recent materials, continue studying, recommended resources, flashcards due, upcoming review, bookmarked items, study collections, and course progress.",
      "Kept v0.4 deterministic, mocked, modular, and AI-ready with no OpenAI, OCR, document parsing, embeddings, vector search, Supabase persistence, database schema changes, external APIs, finance changes, Stripe changes, membership changes, or entitlement changes.",
    ],
  },
  {
    version: "BeastLearning v0.3 Intelligence Foundation",
    date: "July 3, 2026",
    title: "BeastLearning Foundation Closeout",
    items: [
      "Completed the BeastLearning foundation with the Learning workspace, goal builder, plan generator stub, study session command card, progress signals, recommendations, templates, guidance counselor mode, and completion surfaces.",
      "Added the deterministic BeastLearning intelligence engine for knowledge modeling, mastery, dependency graph state, learning memory, weakness analysis, adaptive planning, study session generation, resource recommendations, and progress prediction.",
      `BeastOS UI: ${BEASTOS_UI_POLISH_NOTE}.`,
      "Kept the release presentation-only and rule-based: no AI calls, external APIs, database schema changes, uploads, finance changes, Stripe changes, membership changes, or entitlement changes.",
    ],
  },
  {
    version: "v2.0",
    date: "June 30, 2026",
    title: "Velocity v2 Completion",
    items: [
      "Completed the Velocity Planner with deterministic chunk recommendations, target debt selection, recovery timeline, and interest savings.",
      "Added Beast Advisor explanations for recommendation, rationale, expected result, risks, and alternatives without external AI calls.",
      "Integrated Velocity into Debt Strategy selection, payoff projections, and strategy comparison results.",
      "Modeled Velocity source cost, recovery repayment, utilization guardrails, cash buffer, bills due soon, and projected net savings.",
      "Expanded focused test coverage for the Velocity adapter, engine, advisor, and payoff-plan integration.",
    ],
  },
  {
    version: "v1.9.1 Beta",
    date: "June 21, 2026",
    title: "Due Date Visibility & Cash Flow Stability Update",
    items: [
      "New: Bills and debts now prioritize upcoming due dates.",
      "Improved: Cash Flow assignment validation reliability.",
      "Improved: Obligation visibility and planning workflow.",
      "Fixed: Active obligations retain valid assignment buckets even after the assigned income date passes.",
      "Fixed: Additional Cash Flow stability improvements identified during regression testing.",
    ],
  },

  {
    version: "v1.5.1 Beta",
    date: "May 19, 2026",
    title: "Operational Dashboard Refinement",
    items: [
      "Improved Cash Flow page stability and hook dependency handling.",
      "Added Bills Ahead operational visibility.",
      "Added upcoming bill totals and near-term obligation awareness.",
      "Added funding-source health visibility.",
      "Added operational alerts for cashflow pressure and assignment issues.",
      "Added Daily Command Summary for faster financial decision-making.",
      "Improved Cash Flow page layout hierarchy into command, execution, and reference zones.",
      "Improved dashboard scanability and operational clarity.",
      "Resolved Cash Flow page styling regression during development.",
      "Verified Cash Flow page build stability after AI-assisted development workflow transition.",
    ],
  },
  
  {
    version: "v1.5.0 Beta",
    date: "May 18, 2026",
    title: "Cash Flow, Funding, and Debt Engine Stabilization",
    items: [
      "Added Income Date Planning with generated income pots.",
      "Added Recommended Next Step guidance.",
      "Added Funding Sources foundation.",
      "Added funding-source assignment for bills and debts.",
      "Added archived bills and archived debts workflows.",
      "Improved partial bill payment tracking.",
      "Improved due-date forecasting and cash timeline reliability.",
      "Fixed payoff plan month sequencing so projections start correctly at Month 1.",
      "Added recovered minimum visibility in the payoff plan.",
      "Added monthly interest visibility.",
      "Added recommended minimum payment guidance.",
      "Added minimum-payment trap warnings for debts where the payment is too low.",
      "Added Auto-Save indicator.",
      "Added Mobile Beta warning.",
      "Added Release Notes foundation.",
      "Improved version and sprint communication.",
    ],
  },

  {
    version: "v1.4.6 Beta",
    date: "May 2026",
    title: "Cash Flow Expansion",
    items: [
      "Added Income Date Planning.",
      "Added Income Pots/Buckets generated from recurring income dates.",
      "Added Recommended Next Step Today guidance.",
      "Added Funding Sources system foundation.",
      "Added archived bills and archived debts.",
      "Added bill partial-payment tracking.",
      "Added debt minimum assignment workflow.",
      "Improved due-date forecasting and assignment overload warnings.",
    ],
  },
  {
    version: "v1.0 Beta",
    date: "Initial Beta",
    title: "Core Beast System",
    items: [
      "Added authenticated dashboard experience.",
      "Added debt tracking and payoff strategy foundation.",
      "Added cash-flow projection foundation.",
      "Added recurring income and recurring bill management.",
      "Added dark tactical fintech interface direction.",
    ],
  },
];

export default function ReleasesPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="beast-kicker">The Beast Release Notes</p>
              <h1 className="beast-title">What Changed</h1>
              <p className="beast-subtitle">
                Sprint-based update history for The Beast. This page tracks
                major operational changes, stabilization work, and feature releases.
              </p>
            </div>

            <Link href="/dashboard" className="beast-button-secondary w-fit">
              Back to Dashboard
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4 text-sm text-[#c7cfdb]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-white">Development Rhythm</div>
              <p className="mt-1 text-[#7f8da3]">
                Build by sprint, test after each version, and document stable releases.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-green-300">
              <span className="h-2 w-2 rounded-full bg-green-300" />
              <span className="font-semibold">Active v2.1</span>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          {releaseNotes.map((release) => (
            <article key={release.version} className="beast-panel overflow-hidden">
              <div className="border-b border-[#2a3242] p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#38bdf8]">
                      {release.version}
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-white">
                      {release.title}
                    </h2>
                  </div>

                  <div className="text-sm text-[#7f8da3]">{release.date}</div>
                </div>
              </div>

              <div className="p-5">
                <ul className="space-y-2 text-sm text-[#c7cfdb]">
                  {release.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#38bdf8]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </section>

        <section className="beast-panel p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="beast-kicker">Roadmap</p>
              <h2 className="mt-1 text-xl font-bold text-white">
                BeastLearning Phase 2
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9aa7b8]">
                Next planned work after the v1.0 Private Beta closeout.
              </p>
            </div>
            <span className="rounded-full border border-indigo-300/40 bg-indigo-300/10 px-3 py-1 text-xs font-bold text-indigo-100">
              Planned
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              "AI refinement",
              "Classroom support",
              "Teacher portal",
              "Real document ingestion",
              "Advanced analytics",
              "Collaboration",
              "Mobile optimization",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-bold text-[#dbe3ef]"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
