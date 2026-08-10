"use client";

import { useMemo, useState } from "react";
import { getDebtDueDetail, getDebtDueState, getDebtPaymentWarning, type DebtPaymentAction } from "@/lib/debtManagement";

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

export type DebtManagementActionsProps = {
  debt: DebtManagementDebt;
  fundingSources: { id: string; name: string }[];
  history: DebtPaymentHistoryRow[];
  busy: boolean;
  onPayment: (input: { debt: DebtManagementDebt; amount: number; paymentDate: string; fundingSourceId: string | null; notes: string; actionType: DebtPaymentAction }) => Promise<void>;
  onResetDueDate: (debt: DebtManagementDebt, nextDueDate: string) => Promise<void>;
  onUndoLastPayment: (debt: DebtManagementDebt, payment: DebtPaymentHistoryRow) => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

export function DebtManagementActions({ debt, fundingSources, history, busy, onPayment, onResetDueDate, onUndoLastPayment }: DebtManagementActionsProps) {
  const [panel, setPanel] = useState<"minimum" | "custom" | "reset" | "history" | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [fundingSourceId, setFundingSourceId] = useState("");
  const [notes, setNotes] = useState("");
  const [customDueDate, setCustomDueDate] = useState("");
  const due = useMemo(() => getDebtDueState({ balance: debt.balance, dueDate: debt.nextDueDate }), [debt.balance, debt.nextDueDate]);
  const lastPayment = history.find((payment) => !payment.reversed_at) || null;
  const minimumAmount = Math.min(Math.max(Number(debt.balance || 0), 0), Math.max(Number(debt.minimum_payment || 0), 0));
  const customAmount = Math.min(Math.max(Number(amount || 0), 0), Math.max(Number(debt.balance || 0), 0));

  async function record(actionType: DebtPaymentAction, requestedAmount: number) {
    await onPayment({ debt, amount: requestedAmount, paymentDate, fundingSourceId: fundingSourceId || null, notes, actionType });
    setAmount(""); setNotes(""); setPanel(null);
  }

  return (
    <div className="grid min-w-0 gap-3" data-debt-management-workflow="true">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${due.badgeClassName}`}>{due.status}</span>
        <span className={due.isOverdue ? "text-sm font-bold text-red-200" : "text-sm text-[#9aa7b8]"}>{getDebtDueDetail(due)}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={busy || minimumAmount <= 0} onClick={() => setPanel("minimum")} className="beast-button">Pay Minimum</button>
        <button type="button" disabled={busy || Number(debt.balance || 0) <= 0} onClick={() => { if (window.confirm(`Pay the full ${debt.name} balance of $${Number(debt.balance || 0).toFixed(2)}?`)) void record("full_balance", Number(debt.balance || 0)); }} className="beast-button">Pay Full Balance</button>
        <button type="button" disabled={busy || Number(debt.balance || 0) <= 0} onClick={() => setPanel("custom")} className="beast-button-secondary">Custom Payment</button>
        <button type="button" disabled={busy} onClick={() => void record("skip", 0)} className="beast-button-secondary">Skip Payment</button>
        <button type="button" disabled={busy || minimumAmount <= 0} onClick={() => void record("paid_outside_beast", minimumAmount)} className="beast-button-secondary">Mark Paid Outside Beast</button>
        <button type="button" disabled={busy || !lastPayment} onClick={() => lastPayment && onUndoLastPayment(debt, lastPayment)} className="beast-button-secondary">Undo Last Payment</button>
        <button type="button" disabled={busy} onClick={() => setPanel("reset")} className="beast-button-secondary">Reset Due Date</button>
        <button type="button" onClick={() => setPanel("history")} className="beast-button-secondary">History</button>
      </div>

      {panel === "minimum" ? <div className="grid gap-3 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4" role="dialog" aria-label={`${debt.name} minimum payment confirmation`}>
        <h4 className="font-black text-white">Confirm minimum payment</h4>
        <p className="text-sm text-[#c7cfdb]">Beast will record the stored minimum of <strong>${minimumAmount.toFixed(2)}</strong> for {debt.name}.</p>
        <PaymentDetails paymentDate={paymentDate} setPaymentDate={setPaymentDate} fundingSourceId={fundingSourceId} setFundingSourceId={setFundingSourceId} fundingSources={fundingSources} notes={notes} setNotes={setNotes} />
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || minimumAmount <= 0} onClick={() => void record("minimum", minimumAmount)} className="beast-button">Confirm Payment</button><button type="button" onClick={() => setPanel(null)} className="beast-button-secondary">Cancel</button></div>
      </div> : null}

      {panel === "custom" ? <div className="grid gap-3 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4" role="dialog" aria-label={`${debt.name} custom payment`}>
        <h4 className="font-black text-white">Custom payment</h4>
        <p className="text-sm text-[#9aa7b8]">Enter the total amount actually paid. Minimum due: ${Number(debt.minimum_payment || 0).toFixed(2)}.</p>
        <label className="money-field-label">Total amount paid<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="beast-input mt-2" /></label>
        {getDebtPaymentWarning({ balance: debt.balance, minimumPayment: debt.minimum_payment, amount: customAmount }) ? <p role="status" className="rounded bg-amber-950/50 px-2 py-1 text-xs text-amber-200">{getDebtPaymentWarning({ balance: debt.balance, minimumPayment: debt.minimum_payment, amount: customAmount })}</p> : null}
        <PaymentDetails paymentDate={paymentDate} setPaymentDate={setPaymentDate} fundingSourceId={fundingSourceId} setFundingSourceId={setFundingSourceId} fundingSources={fundingSources} notes={notes} setNotes={setNotes} />
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || customAmount <= 0} onClick={() => void record("custom", customAmount)} className="beast-button">Record Payment</button><button type="button" onClick={() => setPanel(null)} className="beast-button-secondary">Cancel</button></div>
      </div> : null}

      {panel === "reset" ? <div className="grid gap-3 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4" role="dialog" aria-label={`${debt.name} reset due date`}><p className="text-sm text-[#c7cfdb]">Payment history is preserved; this only changes the next due date.</p><button type="button" disabled={busy} onClick={() => void onResetDueDate(debt, "next-cycle")} className="beast-button">Move to next recurring cycle</button><label className="money-field-label">Select custom next due date<input type="date" value={customDueDate} onChange={(event) => setCustomDueDate(event.target.value)} className="beast-input mt-2" /></label><div className="flex gap-2"><button type="button" disabled={busy || !customDueDate} onClick={() => void onResetDueDate(debt, customDueDate)} className="beast-button-secondary">Save Custom Date</button><button type="button" onClick={() => setPanel(null)} className="beast-button-secondary">Cancel</button></div></div> : null}

      {panel === "history" ? <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4"><div className="flex items-center justify-between"><h4 className="font-black text-white">History</h4><button type="button" onClick={() => setPanel(null)} className="text-sm text-cyan-200">Close</button></div>{history.length ? <ul className="mt-3 grid gap-2">{history.map((payment) => <li key={payment.id} className="rounded-lg border border-[#2a3242] p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-bold capitalize">{String(payment.action_type || "custom").replaceAll("_", " ")}{payment.reversed_at ? " · Reversed" : ""}</span><span>${Number(payment.amount || 0).toFixed(2)}</span></div><div className="mt-1 text-xs text-[#9aa7b8]">{payment.payment_date}{payment.is_outside_beast ? " · Recorded outside Beast" : ""}</div>{payment.notes ? <p className="mt-2 text-[#c7cfdb]">{payment.notes}</p> : null}</li>)}</ul> : <p className="mt-3 text-sm text-[#9aa7b8]">No payment history yet.</p>}</div> : null}
    </div>
  );
}

function PaymentDetails({ paymentDate, setPaymentDate, fundingSourceId, setFundingSourceId, fundingSources, notes, setNotes }: { paymentDate: string; setPaymentDate: (value: string) => void; fundingSourceId: string; setFundingSourceId: (value: string) => void; fundingSources: { id: string; name: string }[]; notes: string; setNotes: (value: string) => void }) {
  return <div className="grid gap-3"><label className="money-field-label">Payment Date<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="beast-input mt-2" /></label><label className="money-field-label">Funding Source<select value={fundingSourceId} onChange={(event) => setFundingSourceId(event.target.value)} className="beast-input mt-2"><option value="">Use configured source</option>{fundingSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label><label className="money-field-label">Optional Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="beast-input mt-2 min-h-20" /></label></div>;
}
