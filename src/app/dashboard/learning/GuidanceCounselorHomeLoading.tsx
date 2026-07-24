export default function GuidanceCounselorHomeLoading() {
  return (
    <main
      className="beast-page"
      aria-busy="true"
      aria-label="Loading your Guidance Counselor"
      data-guidance-home-loading="true"
    >
      <div className="beast-container space-y-6 sm:space-y-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-300/[0.08] via-[#111722] to-[#0e141e] p-5 sm:p-7">
          <div className="h-6 w-40 animate-pulse rounded-full bg-indigo-300/15" />
          <div className="mt-5 h-11 w-full max-w-2xl animate-pulse rounded-xl bg-white/10" />
          <div className="mt-4 h-5 w-full max-w-3xl animate-pulse rounded-lg bg-white/[0.07]" />
        </section>

        <section className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#111722] sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="border-b border-white/10 p-5 sm:border-b-0 sm:border-r sm:last:border-r-0">
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
              <div className="mt-4 h-6 w-4/5 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/[0.06]" />
            </div>
          ))}
        </section>

        <section className="grid gap-6 rounded-3xl border border-indigo-300/20 bg-gradient-to-b from-[#171c2a] to-[#121722] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-7">
          <div className="flex items-center gap-4 border-b border-white/10 pb-5">
            <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-indigo-300/15" />
            <div className="min-w-0 flex-1">
              <div className="h-7 w-52 max-w-full animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-white/[0.07]" />
            </div>
          </div>
          <div className="h-24 animate-pulse rounded-2xl bg-white/[0.06]" />
          <div className="h-40 animate-pulse rounded-2xl bg-black/15" />
          <div className="h-14 animate-pulse rounded-2xl bg-white/[0.08]" />
        </section>
        <span className="sr-only" role="status">
          Preparing your relationship, direction, and next step.
        </span>
      </div>
    </main>
  );
}
