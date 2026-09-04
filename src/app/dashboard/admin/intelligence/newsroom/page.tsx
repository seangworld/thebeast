import { BeastAdminShell } from "../../BeastAdminShell";

type NewsroomStatus = {
  version: string;
  mode: string;
  editorialPromise: string;
  staffCount: number;
  desks: string[];
  generatedAt: string;
};

async function loadNewsroomStatus(): Promise<NewsroomStatus | null> {
  try {
    const response = await fetch("https://news.seangworld.com/api/newsroom/status", {
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as NewsroomStatus;
  } catch {
    return null;
  }
}

export default async function BeastAdminNewsroomStatusPage() {
  const status = await loadNewsroomStatus();

  return (
    <BeastAdminShell
      title="SEANGWORLD Newsroom"
      purpose="Owner-only visibility into the deployed SEANGWORLD News AI newsroom contract without exposing credentials, story content, or gated editorial controls."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Contract</p>
          <p className="mt-2 text-2xl font-black text-white">{status?.version ?? "Unavailable"}</p>
          <p className="mt-2 text-sm text-slate-300">{status?.mode ?? "No live status returned"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Digital Staff</p>
          <p className="mt-2 text-2xl font-black text-white">{status?.staffCount ?? "—"}</p>
          <p className="mt-2 text-sm text-slate-300">Governed newsroom roles</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Desks</p>
          <p className="mt-2 text-2xl font-black text-white">{status?.desks?.length ?? "—"}</p>
          <p className="mt-2 text-sm text-slate-300">{status?.desks?.join(" · ") ?? "Status unavailable"}</p>
        </div>
      </section>

      <section className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
        <h2 className="text-lg font-black text-amber-100">Editorial contract</h2>
        <p className="mt-3 text-base font-black text-white">
          {status?.editorialPromise ?? "Live newsroom status is not currently available."}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This workspace is visibility-only. It does not activate sources, call AI providers, apply database migrations, publish Fact Briefs, or bypass owner approval gates.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          {status?.generatedAt ? `Status generated ${new Date(status.generatedAt).toLocaleString()}.` : "No verified generation timestamp was returned."}
        </p>
      </section>
    </BeastAdminShell>
  );
}
