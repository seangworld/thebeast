"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FEATURE_ENTITLEMENTS, type EntitlementFeature } from "@/lib/entitlements";

type ProFeatureGateProps = {
  feature: EntitlementFeature;
  entitled: boolean;
  loading?: boolean;
  children: ReactNode;
  previewTitle?: string;
  previewDescription?: string;
  previewItems?: string[];
};

export default function ProFeatureGate({
  feature,
  entitled,
  loading = false,
  children,
  previewTitle,
  previewDescription,
  previewItems = [],
}: ProFeatureGateProps) {
  if (loading) {
    return (
      <section className="beast-card">
        <div className="text-sm text-[#7f8da3]">Checking membership...</div>
      </section>
    );
  }

  if (entitled) return <>{children}</>;

  const featureLabel = FEATURE_ENTITLEMENTS[feature].label;

  return (
    <section className="beast-card border-[#38bdf8]/40 bg-[#0f172a]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-semibold text-[#38bdf8]">Pro Preview</div>
          <h2 className="mt-2 text-2xl font-bold">
            {previewTitle || `${featureLabel} is a Pro feature`}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[#c7cfdb]">
            {previewDescription ||
              "Preview what this feature unlocks, then upgrade when you are ready."}
          </p>
        </div>
        <Link href="/dashboard/settings" className="beast-button-secondary w-fit">
          View Upgrade Options
        </Link>
      </div>

      {previewItems.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {previewItems.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-[#2a3242] bg-[#111827] p-3 text-sm text-[#c7cfdb]"
            >
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
