import { BeastAdminShell } from "../../BeastAdminShell";

const creators = [
  { name: "Cole Mercer", focus: "Lifestyle · fitness · adventure" },
  { name: "Leila Bautista", focus: "Lifestyle · fashion · fitness" },
] as const;

const platforms = ["Instagram", "Facebook", "X"] as const;
const metrics = ["Followers", "30-day growth", "Reach", "Engagement", "Posts", "Revenue", "Operating cost"] as const;

export default function AgencyMetricsPage() {
  return (
    <BeastAdminShell
      title="Agency Metrics"
      purpose="Owner-only performance for Cole Mercer and Leila Bautista. Figures remain unavailable until verified social account connections and reporting are configured."
    >
      <section aria-label="Creator performance" className="grid gap-5 xl:grid-cols-2">
        {creators.map((creator) => (
          <article key={creator.name} className="rounded-2xl border border-white/10 bg-[#17202b] p-5 shadow-lg sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">{creator.name}</h2>
                <p className="mt-1 text-sm text-slate-300">{creator.focus}</p>
              </div>
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                No data yet
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {platforms.map((platform) => (
                <div key={platform} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <h3 className="text-sm font-semibold text-slate-100">{platform}</h3>
                  <p className="mt-2 text-xs text-slate-400">Not connected</p>
                </div>
              ))}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {metrics.map((label) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <dt className="text-xs text-slate-400">{label}</dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-200" aria-label={label + " unavailable"}>—</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-5 text-slate-400">
              Monetization eligibility: Not verified. No platform analytics or revenue source has been connected.
            </p>
          </article>
        ))}
      </section>
      <section aria-label="Agency comparison" className="rounded-2xl border border-white/10 bg-[#17202b] p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white">Agency comparison</h2>
        <p className="mt-2 text-sm text-slate-300">
          Once reporting is connected, compare verified follower growth, engagement, spending, revenue, and monetization progress. A leading creator will only be identified from actual results.
        </p>
        <p className="mt-3 text-xs text-slate-400">Status: Awaiting platform connections · No comparison data available</p>
      </section>
    </BeastAdminShell>
  );
}
