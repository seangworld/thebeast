type PlatformPlaceholderPageProps = {
  title: string;
  description: string;
  examples: string[];
};

export function PlatformPlaceholderPage({
  title,
  description,
  examples,
}: PlatformPlaceholderPageProps) {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div>
            <p className="beast-kicker">BeastOS Shell</p>
            <h1 className="beast-title">{title}</h1>
            <p className="beast-subtitle">{description}</p>
          </div>
        </section>

        <section className="beast-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Coming Soon</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#c7cfdb]">
                This workspace is part of the BeastOS platform shell. Engines,
                persistence, and automation will be added in a future sprint.
              </p>
            </div>
            <div className="w-fit rounded border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-3 py-1 text-sm font-semibold text-[#38bdf8]">
              Shell Ready
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {examples.map((example) => (
              <div
                key={example}
                className="rounded-lg border border-[#2a3242] bg-[#111827] p-3 text-sm text-[#c7cfdb]"
              >
                {example}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
