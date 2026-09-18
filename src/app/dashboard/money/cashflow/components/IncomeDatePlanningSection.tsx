"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import { projectPaycheckDraft, type PaycheckMove } from "../../../../../lib/paycheckDraft";

type IncomeDatePlanningSectionProps = {
  incomeBucketPlans: any[];
  fundingSources?: { id: string; type: string }[];
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

function dueDateLabel(item: any) {
  if (item?.nextDueDateDisplay) return item.nextDueDateDisplay;
  if (item?.next_due_date_after_payment) {
    return new Date(`${item.next_due_date_after_payment}T12:00:00`).toLocaleDateString();
  }
  return item?.due_date ? `day ${item.due_date}` : "not scheduled";
}

export default function IncomeDatePlanningSection({
  incomeBucketPlans: savedBuckets,
  unassignedBills: savedUnassignedBills,
  unassignedDebts: savedUnassignedDebts,
  fundingSources = [],
  planningWindowDays,
  setPlanningWindowDays,
  recommendedTargetDebt,
  strategyLabel,
  updateBillIncomeDate,
  updateDebtIncomeDate,
}: IncomeDatePlanningSectionProps) {
  const [moves, setMoves] = useState<PaycheckMove[]>([]);
  const moveHistory = useRef<PaycheckMove[]>([]);
  const [draggingKey, setDraggingKey] = useState("");
  function replaceMoves(next: PaycheckMove[]) { moveHistory.current = next; setMoves(next); }
  const draft = projectPaycheckDraft(savedBuckets, savedUnassignedBills, savedUnassignedDebts, moves, fundingSources);
  const incomeBucketPlans = moves.length ? draft.buckets : savedBuckets;
  const unassignedBills = moves.length ? draft.unassignedBills : savedUnassignedBills;
  const unassignedDebts = moves.length ? draft.unassignedDebts : savedUnassignedDebts;
  const unassignedObligationsTotal = draft.unassignedTotal;
  useEffect(() => {
    if (!moves.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [moves.length]);
  const [showIncomeTimeline, setShowIncomeTimeline] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState("");
  const assignmentPending = useRef(false);
  const draggedItem = useRef<{ kind: "bill" | "debt"; id: string; date: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [assignmentFailed, setAssignmentFailed] = useState(false);
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

  function assignObligation(kind: "bill" | "debt", id: string, date: string) {
    if (assignmentPending.current) return;
    replaceMoves([...moveHistory.current, { kind, id, date }]);
    setAssignmentFailed(false);
    setAssignmentMessage("Draft updated. Save plan to keep your moves.");
  }
  function undo() {
    if (assignmentPending.current || !moveHistory.current.length) return;
    replaceMoves(moveHistory.current.slice(0, -1));
    setAssignmentMessage("Undid one move. Save plan to keep the remaining changes.");
  }
  async function savePlan() {
    if (assignmentPending.current || !moveHistory.current.length) return;
    assignmentPending.current = true; setSavingAssignment("plan");
    setAssignmentFailed(false); setAssignmentMessage("Saving your paycheck plan…");
    const pending = projectPaycheckDraft(savedBuckets, savedUnassignedBills, savedUnassignedDebts, moveHistory.current, fundingSources).changes;
    let savedCount = 0;
    try {
      for (const move of pending) {
        const result = move.kind === "bill" ? await updateBillIncomeDate(move.id, move.date) : await updateDebtIncomeDate(move.id, move.date);
        if (!result.ok) throw new Error(result.message);
        savedCount++;
        replaceMoves(moveHistory.current.filter(item => item.kind !== move.kind || item.id !== move.id));
      }
      setAssignmentMessage("Paycheck plan saved. No bank payments were made. Undo is available for new draft moves.");
    } catch {
      setAssignmentFailed(true);
      setAssignmentMessage(`${savedCount} assignment(s) confirmed saved. Remaining draft moves are still here. A save could not be confirmed; check your saved assignments before retrying.`);
    } finally { assignmentPending.current = false; setSavingAssignment(""); }
  }
  function planControls() {
    return <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="beast-button-secondary" disabled={!moves.length || Boolean(savingAssignment)} onClick={undo}>Undo last move</button><button type="button" className="beast-button-primary" disabled={!moves.length || Boolean(savingAssignment)} onClick={() => void savePlan()}>{savingAssignment ? "Saving…" : "Save plan"}</button></div>;
  }
  function dragRow(kind: "bill" | "debt", item: any) {
    return {
      draggable: !savingAssignment,
      title: `Drag ${item.name} to another paycheck, or use its selector`,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        if (assignmentPending.current || (event.target as HTMLElement).closest("select,button,input")) { event.preventDefault(); return; }
        draggedItem.current = { kind, id: item.id, date: item.assigned_income_date || "" };
        setDraggingKey(`${kind}:${item.id}`);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", `${kind}-${item.id}`);
      },
      onDragEnd: () => { draggedItem.current = null; setDraggingKey(""); setDropTarget(null); },
      style: draggingKey === `${kind}:${item.id}` ? { backgroundColor: "rgba(34,211,238,0.2)", outline: "2px solid #67e8f9" } : undefined,
    };
  }

  function dropZone(date: string) {
    return {
      onDragOver: (event: DragEvent<HTMLDivElement>) => {
        if (!draggedItem.current || assignmentPending.current) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(date);
      },
      onDragLeave: (event: DragEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
      },
      onDrop: (event: DragEvent<HTMLDivElement>) => {
        const item = draggedItem.current;
        if (!item || assignmentPending.current) return;
        event.preventDefault();
        draggedItem.current = null;
        setDraggingKey("");
        setDropTarget(null);
        if (item.date !== date) void assignObligation(item.kind, item.id, date);
      },
    };
  }

  function paycheckSelect(kind: "bill" | "debt", item: any) {
    const key = `${kind}-${item.id}`;
    return (
      <div className="w-full shrink-0 sm:w-56">
        <select
          className="beast-input py-2 text-xs"
          aria-label={`Paycheck covering ${item.name}`}
          value={item.assigned_income_date || ""}
          disabled={Boolean(savingAssignment)}
          onChange={(event) => void assignObligation(kind, item.id, event.target.value)}
        >
          <option value="">Unassigned</option>
          {planningBuckets.map((bucket) => (
            <option key={`${key}-${bucket.date}`} value={bucket.date}>
              {bucket.label} · {formatMoney(Number(bucket.availableToAssign || 0))} left
            </option>
          ))}
        </select>
      </div>
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
            covers, see what remains, and direct safe extra money to the suggested debt. Drag an entire row between paychecks, or use its selector. Moves stay in a draft until you save. Each Undo reverses one move; Save plan saves the whole draft across all pots.
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
          <p className="text-sm text-[#7f8da3]">This controls Paycheck Strategy only. Save or undo draft moves before changing the window.</p>
        </div>
        <label className="text-sm font-semibold text-[#c7cfdb]">
          Show upcoming
          <select
            className="beast-input ml-2 w-auto min-w-[130px]"
            aria-label="Paycheck strategy planning window"
            disabled={moves.length > 0 || Boolean(savingAssignment)}
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

        <p className="text-sm text-slate-300">{moves.length ? `${moves.length} unsaved move(s). Save before leaving this page.` : "No unsaved moves."}</p>
        {planControls()}
        {assignmentMessage ? (
          <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100" role={assignmentFailed ? "alert" : "status"}>
            {assignmentMessage}
          </div>
        ) : null}

        {showIncomeTimeline ? (
          <div {...dropZone("")} className={`rounded-xl border border-yellow-300/35 bg-yellow-300/5 p-4 ${dropTarget === "" ? "ring-2 ring-cyan-300" : ""}`}>
            <h3 className="font-black text-yellow-100">Assign these items</h3>
            <p className="mt-1 text-sm text-[#c7cfdb]">Choose the paycheck that should cover each obligation. Drop an item here to unassign it.</p>
            <div className="mt-4 grid gap-2">
              {unassignedBills.map((bill) => (
                <div {...dragRow("bill", bill)} key={`unassigned-bill-${bill.id}`} className="flex flex-col gap-2 rounded-lg bg-[#0f1419] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1"><div className="truncate font-bold text-white">{bill.name}</div><div className="text-xs text-[#7f8da3]">Bill · <span className="whitespace-nowrap">{formatMoney(Number(bill.remaining || bill.amount || 0))}</span> · Due {dueDateLabel(bill)}</div></div>

                  {paycheckSelect("bill", bill)}
                </div>
              ))}
              {unassignedDebts.map((debt) => (
                <div {...dragRow("debt", debt)} key={`unassigned-debt-${debt.id}`} className="flex flex-col gap-2 rounded-lg bg-[#0f1419] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1"><div className="truncate font-bold text-white">{debt.name}</div><div className="text-xs text-[#7f8da3]">Debt minimum · <span className="whitespace-nowrap">{formatMoney(Number(debt.minimum_payment || 0))}</span> · Due {dueDateLabel(debt)}</div></div>

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
                  {...dropZone(bucket.date)}
                  className={`money-income-bucket beast-panel overflow-hidden ${dropTarget === bucket.date ? "ring-2 ring-cyan-300" : ""} ${
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
                    {planControls()}
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
                            {...dragRow("bill", bill)}
                            key={`bill-${bucket.id}-${bill.id}`}
                            className="flex flex-col gap-2 rounded-lg bg-white/[0.03] p-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-baseline gap-2"><span className="truncate font-semibold text-white">{bill.name}</span><span className="shrink-0 whitespace-nowrap">{formatMoney(Number(bill.remaining || 0))}</span></div>
                              <div className="text-xs text-[#7f8da3]">Due {dueDateLabel(bill)}</div>
                            </div>

                  {paycheckSelect("bill", bill)}
                          </li>
                        ))}

                        {bucket.assignedDebts.map((debt: any) => (
                          <li
                            {...dragRow("debt", debt)}
                            key={`debt-${bucket.id}-${debt.id}`}
                            className="flex flex-col gap-2 rounded-lg bg-white/[0.03] p-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-baseline gap-2"><span className="truncate font-semibold text-white">{debt.name} minimum</span><span className="shrink-0 whitespace-nowrap">{formatMoney(Number(debt.minimum_payment || 0))}</span></div>
                              <div className="text-xs text-[#7f8da3]">Due {dueDateLabel(debt)}</div>
                            </div>

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
