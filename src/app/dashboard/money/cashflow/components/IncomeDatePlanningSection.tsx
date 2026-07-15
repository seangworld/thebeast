"use client";

import { useMemo, useState } from "react";

type IncomeDatePlanningSectionProps = {
  incomeBucketPlans: any[];
  unassignedBills: any[];
  unassignedDebts: any[];
  unassignedObligationsTotal: number;
  lookaheadDays: number;
};

function formatMoney(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function IncomeDatePlanningSection({
  incomeBucketPlans,
  unassignedBills,
  unassignedDebts,
  unassignedObligationsTotal,
  lookaheadDays,
}: IncomeDatePlanningSectionProps) {
  const [showIncomeTimeline, setShowIncomeTimeline] = useState(false);

  const summary = useMemo(() => {
    const nextBucket = incomeBucketPlans[0] || null;
    const unassignedCount = unassignedBills.length + unassignedDebts.length;
    const shortBucket = incomeBucketPlans.find(
      (bucket) =>
        Number(bucket.safeAfterBuffer || 0) < 0 ||
        Number(bucket.availableToAssign || 0) < 0
    );
    const hasNoBuckets = incomeBucketPlans.length === 0;

    if (shortBucket || unassignedCount > 0) {
      return {
        nextBucket,
        unassignedCount,
        status: "Action Required",
        statusClass: "border-red-400/45 bg-red-400/10 text-red-200",
        shouldReview: true,
        message: shortBucket
          ? `${shortBucket.label} needs review before the buffer is safe.`
          : `${unassignedCount} obligation${
              unassignedCount === 1 ? "" : "s"
            } still need income dates.`,
      };
    }

    if (hasNoBuckets) {
      return {
        nextBucket,
        unassignedCount,
        status: "Review",
        statusClass: "border-yellow-300/45 bg-yellow-300/10 text-yellow-100",
        shouldReview: true,
        message: "Add income events or update next pay dates to build the plan.",
      };
    }

    return {
      nextBucket,
      unassignedCount,
      status: "Healthy",
      statusClass: "border-green-400/40 bg-green-400/10 text-green-200",
      shouldReview: false,
      message: "Everything in the current income window is assigned and above buffer.",
    };
  }, [incomeBucketPlans, unassignedBills.length, unassignedDebts.length]);

  return (
    <section
      className={`money-section-panel ${
        summary.shouldReview ? "border-yellow-300/40" : ""
      }`}
    >
      <div className="money-section-header">
        <div>
          <h2 className="money-section-title">Income Date Planning</h2>
          <p className="money-section-description">
            Assign bills and debt minimums to the real income date that should
            cover them.
          </p>
        </div>

        <button
          type="button"
          className="beast-button-secondary"
          aria-expanded={showIncomeTimeline}
          aria-controls="income-date-planning-timeline"
          onClick={() => setShowIncomeTimeline((value) => !value)}
        >
          {showIncomeTimeline ? "Hide Income Timeline" : "Show Income Timeline"}
        </button>
      </div>

      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="money-section-card">
            <div className="money-metric-label">Upcoming Income Buckets</div>
            <div className="money-metric-value">
              {incomeBucketPlans.length}
            </div>
            <p className="money-muted-text mt-3">
              Generated from your income schedule.
            </p>
          </div>

          <div className="money-section-card">
            <div className="money-metric-label">Unassigned Items</div>
            <div className="money-metric-value">
              {unassignedBills.length + unassignedDebts.length}
            </div>
            <p className="money-muted-text mt-3">
              Assign these in the Bills and Debt Minimums tables below.
            </p>
          </div>

          <div className="money-section-card">
            <div className="money-metric-label">Unassigned Obligations</div>
            <div
              className={`money-metric-value ${
                unassignedObligationsTotal > 0
                  ? "text-yellow-300"
                  : "text-green-300"
              }`}
            >
              {formatMoney(unassignedObligationsTotal)}
            </div>
            <p className="money-muted-text mt-3">
              Money not assigned to an income pot yet.
            </p>
          </div>

          <div className="money-section-card">
            <div className="money-metric-label">Planning Window</div>
            <div className="money-metric-value">
              {Number(lookaheadDays || 30)} Days
            </div>
            <p className="money-muted-text mt-3">
              Income buckets are generated from today forward.
            </p>
          </div>
        </div>

        <div
          className={`rounded-xl border px-4 py-4 ${summary.statusClass}`}
          aria-live="polite"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <div className="money-metric-label">Next Income</div>
                <div className="mt-1 font-bold text-white">
                  {summary.nextBucket?.label || "No upcoming income"}
                </div>
              </div>
              <div>
                <div className="money-metric-label">Amount</div>
                <div className="mt-1 font-bold text-white">
                  {formatMoney(Number(summary.nextBucket?.amount || 0))}
                </div>
              </div>
              <div>
                <div className="money-metric-label">Assigned Obligations</div>
                <div className="mt-1 font-bold text-white">
                  {formatMoney(Number(summary.nextBucket?.assignedTotal || 0))}
                </div>
              </div>
              <div>
                <div className="money-metric-label">Safe Remaining</div>
                <div
                  className={`mt-1 font-bold ${
                    Number(summary.nextBucket?.safeAfterBuffer || 0) < 0
                      ? "text-red-200"
                      : "text-white"
                  }`}
                >
                  {formatMoney(Number(summary.nextBucket?.safeAfterBuffer || 0))}
                </div>
              </div>
              <div>
                <div className="money-metric-label">Status</div>
                <div className="mt-1 font-bold text-white">
                  {summary.status}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="beast-button-secondary shrink-0"
              aria-expanded={showIncomeTimeline}
              aria-controls="income-date-planning-timeline"
              onClick={() => setShowIncomeTimeline((value) => !value)}
            >
              {summary.shouldReview ? "Expand and Review" : "Show Income Timeline"}
            </button>
          </div>
          <p className="mt-3 text-sm">
            {summary.message} Unassigned item count: {summary.unassignedCount}.
          </p>
        </div>

        {summary.shouldReview && !showIncomeTimeline ? (
          <div className="rounded-xl border border-yellow-300/35 bg-yellow-300/10 px-4 py-3 text-sm font-semibold text-yellow-100">
            This section needs a quick review. Expand the income timeline to
            see the affected income date and assignments.
          </div>
        ) : null}

        {showIncomeTimeline ? (
          <div
            id="income-date-planning-timeline"
            className="grid gap-4 lg:grid-cols-2"
          >
            {incomeBucketPlans.length === 0 ? (
              <div className="beast-panel p-4 text-sm text-[#c7cfdb]">
                No upcoming income buckets found. Add income events or update
                next pay dates.
              </div>
            ) : (
              incomeBucketPlans.slice(0, 8).map((bucket, index) => (
                <div
                  key={bucket.id}
                  className={`money-income-bucket beast-panel overflow-hidden ${
                    index % 2 === 0
                      ? "money-income-bucket-even"
                      : "money-income-bucket-odd"
                  }`}
                >
                  <div className="border-b border-[#2a3242] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-bold">{bucket.label}</h3>
                        <p className="text-sm text-[#7f8da3]">
                          Income pot: {formatMoney(Number(bucket.amount || 0))}
                        </p>
                      </div>

                      <div
                        className={`text-sm font-semibold ${
                          bucket.safeAfterBuffer < 0
                            ? "text-red-300"
                            : "text-green-300"
                        }`}
                      >
                        {bucket.safeAfterBuffer < 0
                          ? `${formatMoney(
                              Math.abs(bucket.safeAfterBuffer)
                            )} short after buffer`
                          : `${formatMoney(
                              bucket.safeAfterBuffer
                            )} safe after buffer`}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 text-sm text-[#c7cfdb]">
                    <div className="mb-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <div className="text-[#7f8da3]">Assigned</div>
                        <div className="font-bold">
                          {formatMoney(bucket.assignedTotal)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7f8da3]">Available</div>
                        <div className="font-bold">
                          {formatMoney(bucket.availableToAssign)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7f8da3]">Debt Minimums</div>
                        <div className="font-bold">
                          {formatMoney(bucket.debtMinimumsTotal)}
                        </div>
                      </div>
                    </div>

                    {bucket.assignedBills.length === 0 &&
                    bucket.assignedDebts.length === 0 ? (
                      <p>No obligations assigned yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {bucket.assignedBills.map((bill: any) => (
                          <li
                            key={`bill-${bucket.id}-${bill.id}`}
                            className="flex justify-between gap-4"
                          >
                            <span>{bill.name}</span>
                            <span className="text-right">
                              {formatMoney(Number(bill.remaining || 0))}
                            </span>
                          </li>
                        ))}

                        {bucket.assignedDebts.map((debt: any) => (
                          <li
                            key={`debt-${bucket.id}-${debt.id}`}
                            className="flex justify-between gap-4"
                          >
                            <span>{debt.name} minimum</span>
                            <span className="text-right">
                              {formatMoney(Number(debt.minimum_payment || 0))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="money-muted-text">
            Detailed income buckets are collapsed to keep Cash Flow easy to
            scan. Expand when you need to inspect each income date.
          </p>
        )}
      </div>
    </section>
  );
}
