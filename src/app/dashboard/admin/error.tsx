"use client";

import Link from "next/link";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";

export default function BeastAdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="beast-page">
      <div className="beast-container">
        <DashboardCard accent="admin" className="max-w-3xl">
          <SectionHeader
            eyebrow="BeastAdmin · Recovery"
            title="This owner workspace could not be displayed"
            description="The workspace stopped safely. No missing data was estimated and no owner action was submitted."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={reset} className="min-h-11 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">
              Try again
            </button>
            <Link href="/dashboard/admin" className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 py-2 text-sm font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">
              Return to CEO Mode
            </Link>
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
