"use client";

import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { EducationPlanningReportsBundle } from "@/lib/education/planningReports";

function exportReports(bundle: EducationPlanningReportsBundle) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `beasteducation-planning-reports-${bundle.generatedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(href);
}

export default function EducationPlanningReports({
  bundle,
}: {
  bundle: EducationPlanningReportsBundle;
}) {
  return (
    <section aria-label="BeastEducation planning reports">
      <SectionHeader
        eyebrow="Reports"
        title="Education and career planning reports"
        description="Printable, exportable summaries generated only from authenticated planning records."
        action={
          <div className="flex w-full flex-col gap-2 print:hidden sm:w-auto sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="beast-button-secondary w-full justify-center sm:w-auto"
              onClick={() => window.print()}
            >
              Print reports
            </button>
            <button
              type="button"
              className="beast-button w-full justify-center sm:w-auto"
              onClick={() => exportReports(bundle)}
            >
              Export reports
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
            className="min-w-0 print:mb-5 print:break-inside-avoid"
          >
            <article aria-labelledby={`${report.id}-planning-report-title`}>
              <h2
                id={`${report.id}-planning-report-title`}
                className="text-2xl font-black text-white"
              >
                {report.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">
                {report.description}
              </p>
              <dl className="mt-5 divide-y divide-white/[0.07] rounded-xl border border-white/[0.08]">
                {report.rows.map((row) => (
                  <div
                    key={`${report.id}-${row.label}`}
                    className="grid gap-1 px-3 py-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-start sm:gap-4"
                  >
                    <dt className="break-words text-sm text-[#9aa7b8]">
                      {row.label}
                    </dt>
                    <dd className="break-words text-sm font-bold text-white sm:text-right">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
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
