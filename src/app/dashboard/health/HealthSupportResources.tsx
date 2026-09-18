"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getHealthAwareness } from "@/lib/health/awareness";

const linkStyle = "inline-flex min-h-[44px] items-center rounded-lg border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";

export function HealthSupportResources() {
  const pathname = usePathname();
  const veterans = pathname?.startsWith("/dashboard/health/veterans");
  const [awareness, setAwareness] = useState<ReturnType<typeof getHealthAwareness> | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function refresh() {
      clearTimeout(timer);
      const now = new Date();
      setAwareness(getHealthAwareness(now));
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 100);
    }
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  return (
    <div className="grid min-w-0 items-start gap-3 lg:grid-cols-2">
      {awareness ? <section aria-label="Health awareness spotlight" className="min-w-0 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-pink-300">{awareness.monthLabel} · {awareness.observance ? "Health awareness" : "Health spotlight"}</p>
        <h2 className="mt-1 font-bold text-slate-100">{awareness.spotlight.title}</h2>
        <p className="mt-1 text-sm text-slate-300">{awareness.spotlight.description}</p>
        <a className="inline-flex min-h-[44px] items-center text-sm text-sky-300 underline" href={awareness.spotlight.href} target="_blank" rel="noopener noreferrer">Explore awareness resources</a>
        {awareness.showFluReminder ? <div className="mt-2 border-t border-slate-700 pt-3">
          <h3 className="font-semibold text-slate-100">Got your flu shot?</h3>
          <p className="mt-1 text-sm text-slate-300">VA offers free flu shots for eligible veterans. Other providers may offer shots at no cost through insurance or local programs. Check eligibility, coverage, and availability before you go.</p>
          <div className="flex flex-wrap gap-x-5">
            <a className="inline-flex min-h-[44px] items-center text-sm text-sky-300 underline" href="https://www.prevention.va.gov/flu/" target="_blank" rel="noopener noreferrer">VA flu-shot options</a>
            <a className="inline-flex min-h-[44px] items-center text-sm text-sky-300 underline" href="https://www.vaccines.gov/" target="_blank" rel="noopener noreferrer">Find a pharmacy near you</a>
          </div>
        </div> : null}
      </section> : null}
      <section aria-label="Crisis support" className="min-w-0 rounded-xl border border-teal-800 bg-teal-950/30 p-4">
        <h2 className="font-bold text-teal-100">You don’t have to face this alone</h2>
        <p className="mt-1 text-sm text-slate-200">Free, confidential crisis support, 24/7 in the U.S.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className={linkStyle} href="tel:988">{veterans ? "Veterans: call 988, then press 1" : "Call 988"}</a>
          <a className={linkStyle} href={veterans ? "sms:838255" : "sms:988"}>{veterans ? "Veterans: text 838255" : "Text 988"}</a>
          <a className={linkStyle} href={veterans ? "https://www.veteranscrisisline.net/" : "https://chat.988lifeline.org/"} target="_blank" rel="noopener noreferrer">{veterans ? "Veterans Crisis Line / chat" : "Chat with 988 Lifeline"}</a>
        </div>
        {veterans ? <p className="mt-2 text-sm text-slate-300">For veterans, service members, and loved ones. VA enrollment is not required. Anyone can also call or text 988.</p> : <p className="mt-2 text-sm text-slate-300">Veterans and loved ones: call 988, then press 1, or <a className="underline text-teal-200" href="sms:838255">text 838255</a>. <a className="underline text-teal-200" href="https://www.veteranscrisisline.net/" target="_blank" rel="noopener noreferrer">Veterans Crisis Line</a></p>}
      </section>
    </div>
  );
}
