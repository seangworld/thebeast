import Link from "next/link";
import type { MorningFinancialBriefing } from "@/lib/moneyMorningBriefing";

export function MorningFinancialBriefingPanel({
  briefing,
  defaultOpen = false,
}: {
  briefing: MorningFinancialBriefing;
  defaultOpen?: boolean;
}) {
  const conversationHref = (prompt: string) =>
    `/dashboard/money?starter=${encodeURIComponent(prompt)}`;

  return (
    <details
      open={defaultOpen}
      className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4 sm:p-5"
      data-money-morning-briefing="true"
    >
      <summary className="cursor-pointer list-none rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              Since your last review
            </p>
            <h2 className="mt-2 text-lg font-black text-white">
              Daily Briefing
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              {briefing.summary}
            </p>
          </div>
          <span
            className="mt-1 shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase text-slate-400"
            aria-hidden="true"
          >
            Expand
          </span>
        </div>
      </summary>

      <div className="mt-5 border-t border-white/10 pt-4">
        {briefing.items.length ? (
          <ul className="grid gap-3">
            {briefing.items.map((item) => (
              <li key={item.id}>
                <Link
                  className="block min-h-11 rounded-xl px-3 py-2 text-sm leading-6 text-slate-300 transition hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                  href={conversationHref(item.conversationPrompt)}
                >
                  <span className="font-bold text-white">{item.title}.</span>{" "}
                  {item.detail}
                  <span className="ml-2 font-bold text-cyan-200">
                    Discuss <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">
            Nothing material changed in the current review window.
          </p>
        )}

        <div className="mt-5 rounded-xl bg-black/20 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">
            Recommended focus
          </p>
          <p className="mt-2 font-bold text-white">
            {briefing.recommendedFocus.title}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {briefing.recommendedFocus.detail}
          </p>
          <Link
            href={conversationHref(briefing.recommendedFocus.conversationPrompt)}
            className="mt-3 inline-flex min-h-11 items-center font-bold text-cyan-200"
          >
            Discuss with Money Coach <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Data freshness: {briefing.freshness.label}.{" "}
          {briefing.freshness.confidenceNote}
        </p>
      </div>
    </details>
  );
}
