import Link from "next/link";
import { MarketingSectionNav } from "./MarketingSectionNav";

export function MarketingFoundationPage({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <>
      <MarketingSectionNav />
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">BeastMarketing foundation</p>
        <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {bullets.map((item) => (
            <li key={item} className="rounded-xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-200">{item}</li>
          ))}
        </ul>
        <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4 text-sm text-amber-100">
          This workspace is reserved intentionally. No provider connection, external publishing, new credential, or spend authority is activated by its presence in navigation.
        </div>
        <Link href="/dashboard/admin/marketing" className="mt-5 inline-flex text-sm font-black text-amber-100 underline underline-offset-4">Return to BeastMarketing overview</Link>
      </section>
    </>
  );
}
