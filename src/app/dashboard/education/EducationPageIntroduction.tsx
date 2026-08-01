import Link from "next/link";

export function EducationPageIntroduction({
  title,
  introduction,
  why,
  how,
  next,
  action,
}: {
  title: string;
  introduction: string;
  why: string;
  how: string;
  next: string;
  action?: { label: string; href: string };
}) {
  return (
    <header className="rounded-2xl border border-indigo-300/20 bg-gradient-to-br from-indigo-300/[0.1] to-transparent p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-200">
        Education &amp; Career Planning
      </p>
      <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">
        {introduction}
      </p>
      <dl className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ["Why this helps", why],
          ["How Beast uses it", how],
          ["What to do next", next],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-xs font-black uppercase tracking-wide text-indigo-200">
              {label}
            </dt>
            <dd className="mt-2 text-sm leading-6 text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
      {action ? (
        <Link href={action.href} className="beast-button-primary mt-5 inline-flex w-full justify-center sm:w-fit">
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}
