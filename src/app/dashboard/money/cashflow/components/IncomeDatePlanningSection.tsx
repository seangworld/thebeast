"use client";

import { useMemo, useState } from "react";

type IncomeDatePlanningSectionProps = {
  incomeBucketPlans: any[];
  unassignedBills: any[];
  unassignedDebts: any[];
  unassignedObligationsTotal: number;
  planningWindowDays: number;
  setPlanningWindowDays: (days: number) => void;
  recommendedTargetDebt: any;
  strategyLabel: string;
  updateBillIncomeDate: (id: string, date: string) => Promise<{ ok: boolean; message: string }>;
  updateDebtIncomeDate: (id: string, date: string) => Promise<{ ok: boolean; message: string }>;
};

function formatMoney(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function IncomeDatePlanningSection({
  incomeBucketPlans,
  unassignedBills,
  unassignedDebts,
  unassignedObligationsTotal,
  planningWindowDays,
  setPlanningWindowDays,
  recommendedTargetDebt,
  strategyLabel,
  updateBillIncomeDate,
  updateDebtIncomeDate,
}: IncomeDatePlanningSectionProps) {
  const [showIncomeTimeline, setShowIncomeTimeline] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");

  const planningBuckets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + planningWindowDays);
    return incomeBucketPlans.filter((bucket) => {
      const date = new Date(`${bucket.date}T12:00:00`);
      return Number.isFinite(date.getTime()) && date >= today && date <= windowEnd;
    });
  }, [incomeBucketPlans, planningWindowDays]);

  async function assignObligation(kind: "bill" | "debt", id: string, date: string) {
    const key = `${kind}-${id}`;
    setSavingAssignment(key);
    setAssignmentMessage("");
    const result = kind === "bill"
      ? await updateBillIncomeDate(id, date)
      : await updateDebtIncomeDate(id, date);
    setSavingAssignment("");
    setAssignmentMessage(result.message);
  }

  function paycheckSelect(kind: "bill" | "debt", item: any) {
    const key = `${kind}-${item.id}`;
    return (
      <select
        className="beast-input min-w-[190px] py-2 text-xs"
        aria-label={`Paycheck covering ${item.name}`}
        value={item.assigned_income_date || ""}
        disabled={savingAssignment === key}
        onChange={(event) => void assignObligation(kind, item.id, event.target.value)}
      >
        <option value="">Unassigned</option>
        {planningBuckets.map((bucket) => (
          <option key={`${key}-${bucket.date}`} value={bucket.date}>
            {bucket.label} · {formatMoney(Number(bucket.availableToAssign || 0))} left
          </option>
        ))}
      </select>
    );
  }

  const summary = useMemo(() => {
    const nextBucket = planningBuckets[0] || null;
    const unassignedCount = unassignedBills.length + unassignedDebts.length;
    const shortBucket = planningBuckets.find(
      (bucket) =>
        Number(bucket.safeAfterBuffer || 0) < 0 ||
        Number(bucket.availableToAssign || 0) < 0
    );
    const hasNoBuckets = planningBuckets.length === 0;

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
  }, [planningBuckets, unassignedBills.length, unassignedDebts.length]);

  return (
    <section
      className={`money-section-panel ${
        summary.shouldReview ? "border-yellow-300/40" : ""
      }`}
      id="paycheck-strategy"
      data-paycheck-strategy-planner="true"
    >
      <div className="money-section-header">
        <div>
          <h2 className="money-section-title">Paycheck Strategy</h2>
          <p className="money-section-description">
            Plan the next month paycheck by paycheck. Choose what each deposit
            covers, see what remains, and direct safe extra money to the suggested debt.
          </p>
        </div>

        <button
          type="button"
          className="beast-button-secondary"
          aria-expanded={showIncomeTimeline}
          aria-controls="income-date-planning-timeline"
          onClick={() => setShowIncomeTimeline((value) => !value)}
        >
          {showIncomeTimeline ? "Hide Paycheck Plan" : "Show Paycheck Plan"}
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-2 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-bold text-white">Planning window</div>
          <p className="text-sm text-[#7f8da3]">This controls Paycheck Strategy only. Your Cash Flow alert window stays unchanged.</p>
        </div>
        <label className="text-sm font-semibold text-[#c7cfdb]">
          Show upcoming
          <select
            className="beast-input ml-2 w-auto min-w-[130px]"
            aria-label="Paycheck strategy planning window"
            value={planningWindowDays}
            onChange={(event) => setPlanningWindowDays(Number(event.target.value))}
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
          </select>
        </label>
      </div>

      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="money-section-card">
            <div className="money-metric-label">Upcoming Income Buckets</div>
            <div className="money-metric-value">
              {planningBuckets.length}
            </div>
            <p className="money-muted-text mt-3">
              In the next {planningWindowDays} days.
            </p>
          </div>

          <div className="money-section-card">
            <div className="money-metric-label">Unassigned Items</div>
            <div className="money-metric-value">
              {unassignedBills.length + unassignedDebts.length}
            </div>
            <p className="money-muted-text mt-3">
              Assign them directly in the paycheck plan below.
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
              {planningWindowDays} Days
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
              {showIncomeTimeline ? "Hide Paycheck Plan" : summary.shouldReview ? "Expand and Review" : "Show Paycheck Plan"}
            </button>
          </div>
          <p className="mt-3 text-sm">
            {summary.message} Unassigned item count: {summary.unassignedCount}.
          </p>
        </div>

        {summary.shouldReview && !showIncomeTimeline ? (
          <div className="rounded-xl border border-yellow-300/35 bg-yellow-300/10 px-4 py-3 text-sm font-semibold text-yellow-100">
            This paycheck plan needs a quick review. Expand it to assign each
            bill or debt minimum to a deposit.
          </div>
        ) : null}

        {assignmentMessage ? (
          <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100" role="status">
            {assignmentMessage}
          </div>
        ) : null}

        {(unassignedBills.length > 0 || unassignedDebts.length > 0) && showIncomeTimeline ? (
          <div className="rounded-xl border border-yellow-300/35 bg-yellow-300/5 p-4">
            <h3 className="font-black text-yellow-100">Assign these items</h3>
            <p className="mt-1 text-sm text-[#c7cfdb]">Choose the paycheck that should cover each obligation.</p>
            <div className="mt-4 grid gap-2">
              {unassignedBills.map((bill) => (
                <div key={`unassigned-bill-${bill.id}`} className="flex flex-col gap-2 rounded-lg bg-[#0f1419] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><div className="font-bold text-white">{bill.name}</div><div className="text-xs text-[#7f8da3]">Bill · {formatMoney(Number(bill.remaining || bill.amount || 0))}</div></div>
                  {paycheckSelect("bill", bill)}
                </div>
              ))}
              {unassignedDebts.map((debt) => (
                <div key={`unassigned-debt-${debt.id}`} className="flex flex-col gap-2 rounded-lg bg-[#0f1419] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><div className="font-bold text-white">{debt.name}</div><div className="text-xs text-[#7f8da3]">Debt minimum · {formatMoney(Number(debt.minimum_payment || 0))}</div></div>
                  {paycheckSelect("debt", debt)}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {showIncomeTimeline ? (
          <div
            id="income-date-planning-timeline"
            className="grid gap-4 lg:grid-cols-2"
          >
            {planningBuckets.length === 0 ? (
              <div className="beast-panel p-4 text-sm text-[#c7cfdb]">
                No upcoming income buckets found. Add income events or update
                next pay dates.
              </div>
            ) : (
              planningBuckets.map((bucket, index) => (
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
                    <div className="mb-3 grid gap-2 sm:grid-cols-4">
                      <div>
                        <div className="text-[#7f8da3]">Paycheck</div>
                        <div className="font-bold">{formatMoney(Number(bucket.amount || 0))}</div>
                      </div>
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
                            className="flex flex-col gap-2 rounded-lg bg-white/[0.03] p-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span><span className="font-semibold text-white">{bill.name}</span><span className="ml-2">{formatMoney(Number(bill.remaining || 0))}</span></span>
                            {paycheckSelect("bill", bill)}
                          </li>
                        ))}

                        {bucket.assignedDebts.map((debt: any) => (
                          <li
                            key={`debt-${bucket.id}-${debt.id}`}
                            className="flex flex-col gap-2 rounded-lg bg-white/[0.03] p-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span><span className="font-semibold text-white">{debt.name} minimum</span><span className="ml-2">{formatMoney(Number(debt.minimum_payment || 0))}</span></span>
                            {paycheckSelect("debt", debt)}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-4 rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-cyan-200">Suggested extra-debt move</div>
                      {recommendedTargetDebt && Number(bucket.safeAfterBuffer || 0) > 0 ? (
                        <p className="mt-1 font-bold text-white">
                          Put {formatMoney(Number(bucket.safeAfterBuffer || 0))} toward {recommendedTargetDebt.name}
                          <span className="ml-2 text-xs font-normal text-[#c7cfdb]">({strategyLabel} strategy)</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-[#c7cfdb]">No safe extra payment is suggested from this paycheck.</p>
                      )}
                    </div>
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
