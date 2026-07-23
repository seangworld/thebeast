"use client";

import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import type { LearningReportsBundle } from "@/lib/learning/learningReports";

function exportReports(bundle: LearningReportsBundle) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `beastlearning-reports-${bundle.generatedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(href);
}

export function LearningReports({ bundle }: { bundle: LearningReportsBundle }) {
  return (
    <section aria-label="Learning Reports">
      <SectionHeader
        eyebrow="Reports"
        title="Professional learning reports"
        description="Printable, exportable summaries generated only from your authenticated BeastEducation records."
        action={
          <div className="flex w-full flex-col gap-2 print:hidden sm:w-auto sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="beast-button-secondary w-full justify-center sm:w-auto"
              onClick={() => window.print()}
              aria-label="Print Learning Reports"
            >
              Print Reports
            </button>
            <button
              type="button"
              className="beast-button w-full justify-center sm:w-auto"
              onClick={() => exportReports(bundle)}
              aria-label="Export Learning Reports"
            >
              Export Reports
            </button>
          </div>
        }
      />

      <p className="mt-4 text-xs leading-5 text-[#8f9cad]">
        Generated{" "}
        <time dateTime={bundle.generatedAt}>
          {new Date(bundle.generatedAt).toLocaleString("en-US")}
        </time>
      </p>

      <div className="mt-6 grid gap-5 xl:grid-cols-2 print:block">
        {bundle.reports.map((report) => (
          <DashboardCard
            key={report.id}
            accent="learning"
            className="min-w-0 transition duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_18px_48px_rgba(0,0,0,0.2)] motion-reduce:transition-none print:mb-5 print:break-inside-avoid"
          >
            <article aria-labelledby={`${report.id}-title`}>
              <p className="beast-kicker">{report.period}</p>
              <h2 id={`${report.id}-title`} className="mt-2 text-2xl font-black text-white">
                {report.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">{report.subtitle}</p>
              <div className="mt-5 space-y-5">
                {report.sections.map((section) => (
                  <section key={`${report.id}-${section.title}`}>
                    <h3 className="text-sm font-black text-white">{section.title}</h3>
                    <dl className="mt-2 divide-y divide-white/[0.07] rounded-xl border border-white/[0.08]">
                      {section.rows.map((row, index) => (
                        <div
                          key={`${report.id}-${section.title}-${row.label}-${index}`}
                          className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,auto)] sm:items-center sm:gap-4"
                        >
                          <dt className="break-words text-sm text-[#9aa7b8]">{row.label}</dt>
                          <dd className="break-words text-sm font-bold text-white sm:text-right">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            </article>
          </DashboardCard>
        ))}
      </div>

      <p className="mt-5 max-w-4xl text-xs leading-5 text-[#8f9cad]">
        {bundle.disclosure}
      </p>
    </section>
  );
}
