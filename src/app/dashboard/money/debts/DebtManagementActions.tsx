"use client";

import { type ReactNode, useMemo, useRef, useState } from "react";
import { getDebtDueDetail, getDebtDueState, getDebtPaymentWarning, type DebtPaymentAction } from "../../../../lib/debtManagement";
import { createFinancialOperationId } from "../../../../lib/atomicFinancialCommands";
import { BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE } from "../../../../lib/beastMoneyPaymentWriteGate";

export type DebtManagementDebt = {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  statement_balance?: number | null;
  payment_behavior?: "fixed" | "revolving";
  nextDueDate: Date;
  nextDueDateDisplay?: string;
};

export type DebtPaymentHistoryRow = {
  id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
  cycle_due_date?: string | null;
  action_type?: DebtPaymentAction | null;
  notes?: string | null;
  is_outside_beast?: boolean | null;
  created_at?: string | null;
  reversed_at?: string | null;
};

export type DebtPaymentResult = { ok: boolean; message: string };

export type DebtManagementActionsProps = {
  debt: DebtManagementDebt;
  fundingSources: { id: string; name: string }[];
  history: DebtPaymentHistoryRow[];
  busy: boolean;
  onPayment: (input: { operationId: string; debt: DebtManagementDebt; amount: number; paymentDate: string; fundingSourceId: string | null; notes: string; actionType: DebtPaymentAction }) => Promise<DebtPaymentResult>;
  onResetDueDate: (debt: DebtManagementDebt, nextDueDate: string) => Promise<void>;
  paymentWritesAvailable: boolean;
  editAction?: ReactNode;
};

const today = () => new Date().toISOString().slice(0, 10);

export function DebtManagementActions({ debt, fundingSources, history, busy, onPayment, onResetDueDate, paymentWritesAvailable, editAction }: DebtManagementActionsProps) {
  const [panel, setPanel] = useState<"minimum" | "custom" | "reset" | "history" | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [fundingSourceId, setFundingSourceId] = useState("");
  const [notes, setNotes] = useState("");
  const [customDueDate, setCustomDueDate] = useState("");
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const pendingPayment = useRef<{ fingerprint: string; operationId: string } | null>(null);
  const due = useMemo(() => getDebtDueState({ balance: debt.balance, dueDate: debt.nextDueDate }), [debt.balance, debt.nextDueDate]);
  const minimumAmount = Math.min(Math.max(Number(debt.balance || 0), 0), Math.max(Number(debt.minimum_payment || 0), 0));
  const customAmount = Math.min(Math.max(Number(amount || 0), 0), Math.max(Number(debt.balance || 0), 0));
  const actionClass = "w-full whitespace-nowrap px-4 text-sm";

  async function record(actionType: DebtPaymentAction, requestedAmount: number) {
    setActionStatus(null);
    const fingerprint = JSON.stringify({ debtId: debt.id, actionType, requestedAmount, paymentDate, fundingSourceId: fundingSourceId || null, notes });
    const operationId = pendingPayment.current?.fingerprint === fingerprint
      ? pendingPayment.current.operationId
      : createFinancialOperationId();
    pendingPayment.current = { fingerprint, operationId };
    const result = await onPayment({ operationId, debt, amount: requestedAmount, paymentDate, fundingSourceId: fundingSourceId || null, notes, actionType });
    setActionStatus({ type: result.ok ? "success" : "error", message: result.message });
    if (!result.ok) return;
    pendingPayment.current = null;
    setAmount(""); setNotes(""); setPanel(null);
  }

  const paymentDetails = <PaymentDetails paymentDate={paymentDate} setPaymentDate={setPaymentDate} fundingSourceId={fundingSourceId} setFundingSourceId={setFundingSourceId} fundingSources={fundingSources} notes={notes} setNotes={setNotes} />;

  if (panel === "minimum") {
    return <div className="grid min-w-0 grid-cols-1 gap-3" data-debt-management-workflow="true" data-debt-management-layout="compact" role="dialog" aria-label={`${debt.name} minimum payment confirmation`}>
      <h4 className="font-black text-white">Confirm minimum payment</h4>
      <p className="text-sm text-[#c7cfdb]">Beast will record the stored minimum of <strong>${minimumAmount.toFixed(2)}</strong> against {debt.name}.</p>
      {paymentDetails}
      {actionStatus?.type === "error" ? <p role="alert" className="rounded bg-red-950/60 px-3 py-2 text-sm text-red-200">{actionStatus.message}</p> : null}
      {!paymentWritesAvailable ? <p role="status" className="rounded bg-amber-950/50 px-3 py-2 text-sm text-amber-100">{BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE}</p> : null}
      <div className="grid grid-cols-1 gap-2"><button type="button" disabled={busy || minimumAmount <= 0 || !paymentWritesAvailable} onClick={() => void record("minimum", minimumAmount)} className={`beast-button ${actionClass}`}>Confirm Payment</button><button type="button" disabled={busy} onClick={() => { setActionStatus(null); setPanel(null); }} className={`beast-button-secondary ${actionClass}`}>Cancel</button></div>
    </div>;
  }

  if (panel === "custom") {
    return <div className="grid min-w-0 grid-cols-1 gap-3" data-debt-management-workflow="true" data-debt-management-layout="compact" role="dialog" aria-label={`${debt.name} custom payment`}>
      <h4 className="font-black text-white">Custom payment</h4>
      <p className="text-sm text-[#9aa7b8]">Enter the total amount actually paid. Minimum due: ${Number(debt.minimum_payment || 0).toFixed(2)}.</p>
      <label className="money-field-label">Total amount paid<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="beast-input mt-2" /></label>
      {getDebtPaymentWarning({ balance: debt.balance, minimumPayment: debt.minimum_payment, amount: customAmount }) ? <p role="status" className="rounded bg-amber-950/50 px-2 py-1 text-xs text-amber-200">{getDebtPaymentWarning({ balance: debt.balance, minimumPayment: debt.minimum_payment, amount: customAmount })}</p> : null}
      {paymentDetails}
      {actionStatus?.type === "error" ? <p role="alert" className="rounded bg-red-950/60 px-3 py-2 text-sm text-red-200">{actionStatus.message}</p> : null}
      {!paymentWritesAvailable ? <p role="status" className="rounded bg-amber-950/50 px-3 py-2 text-sm text-amber-100">{BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE}</p> : null}
      <div className="grid grid-cols-1 gap-2"><button type="button" disabled={busy || customAmount <= 0 || !paymentWritesAvailable} onClick={() => void record("custom", customAmount)} className={`beast-button ${actionClass}`}>Confirm Payment</button><button type="button" disabled={busy} onClick={() => { setActionStatus(null); setPanel(null); }} className={`beast-button-secondary ${actionClass}`}>Cancel</button></div>
    </div>;
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 text-sm" data-debt-management-workflow="true" data-debt-management-layout="compact">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${due.badgeClassName}`}>{due.status}</span>
        <span className={due.isOverdue ? "text-sm font-bold text-red-200" : "text-sm text-[#9aa7b8]"}>{getDebtDueDetail(due)}</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button type="button" disabled={busy || minimumAmount <= 0 || !paymentWritesAvailable} onClick={() => setPanel("minimum")} className={`beast-button ${actionClass}`}>Pay Minimum</button>
        <button type="button" disabled={busy || Number(debt.balance || 0) <= 0 || !paymentWritesAvailable} onClick={() => setPanel("custom")} className={`beast-button-secondary ${actionClass}`}>Custom Payment</button>
        <button type="button" onClick={() => setPanel("history")} className={`beast-button-secondary ${actionClass}`}>History</button>
        {editAction}
        <button type="button" disabled={busy} onClick={() => setPanel("reset")} className={`beast-button-secondary ${actionClass}`}>Reset Due Date</button>
      </div>

      {!paymentWritesAvailable ? <p role="status" className="rounded bg-amber-950/50 px-3 py-2 text-sm text-amber-100">{BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE}</p> : null}

      {actionStatus?.type === "success" ? <p role="status" className="rounded bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{actionStatus.message}</p> : null}

      {panel === "reset" ? <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#2a3242] bg-[#0f1419] p-3" role="dialog" aria-label={`${debt.name} reset due date`}><p className="text-sm text-[#c7cfdb]">Payment history is preserved; this only changes the next due date.</p><button type="button" disabled={busy} onClick={() => void onResetDueDate(debt, "next-cycle")} className={`beast-button ${actionClass}`}>Move to next recurring cycle</button><label className="money-field-label">Select custom next due date<input type="date" value={customDueDate} onChange={(event) => setCustomDueDate(event.target.value)} className="beast-input mt-2" /></label><div className="grid grid-cols-1 gap-2"><button type="button" disabled={busy || !customDueDate} onClick={() => void onResetDueDate(debt, customDueDate)} className={`beast-button-secondary ${actionClass}`}>Save Custom Date</button><button type="button" onClick={() => setPanel(null)} className={`beast-button-secondary ${actionClass}`}>Cancel</button></div></div> : null}

      {panel === "history" ? <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4"><div className="flex items-center justify-between"><h4 className="font-black text-white">History</h4><button type="button" onClick={() => setPanel(null)} className="text-sm text-cyan-200">Close</button></div>{history.length ? <ul className="mt-3 grid gap-2">{history.map((payment) => <li key={payment.id} className="rounded-lg border border-[#2a3242] p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-bold capitalize">{String(payment.action_type || "custom").replaceAll("_", " ")}{payment.reversed_at ? " · Reversed" : ""}</span><span>${Number(payment.amount || 0).toFixed(2)}</span></div><div className="mt-1 text-xs text-[#9aa7b8]">{payment.payment_date}{payment.is_outside_beast ? " · Recorded outside Beast" : ""}</div>{payment.notes ? <p className="mt-2 text-[#c7cfdb]">{payment.notes}</p> : null}</li>)}</ul> : <p className="mt-3 text-sm text-[#9aa7b8]">No payment history yet.</p>}</div> : null}
    </div>
  );
}

function PaymentDetails({ paymentDate, setPaymentDate, fundingSourceId, setFundingSourceId, fundingSources, notes, setNotes }: { paymentDate: string; setPaymentDate: (value: string) => void; fundingSourceId: string; setFundingSourceId: (value: string) => void; fundingSources: { id: string; name: string }[]; notes: string; setNotes: (value: string) => void }) {
  return <div className="grid gap-3"><label className="money-field-label">Payment Date<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="beast-input mt-2" /></label><label className="money-field-label">Funding Source<select value={fundingSourceId} onChange={(event) => setFundingSourceId(event.target.value)} className="beast-input mt-2"><option value="">Use configured source</option>{fundingSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label><label className="money-field-label">Optional Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="beast-input mt-2 min-h-20" /></label></div>;
}
