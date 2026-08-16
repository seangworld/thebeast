"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { DebtRow } from "./DebtsSection";
import { calculateDebtPaymentAmount, getDebtPaymentWarning, type DebtPaymentMode } from "@/lib/debtManagement";

type DebtPaymentStatus = Record<
  string,
  { type: "error" | "success" | null; message: string }
>;

type DebtPaymentControlsProps = {
  debt: DebtRow;
  editingDebtId: string | null;
  debtPayments: Record<string, string>;
  setDebtPayments: Dispatch<SetStateAction<Record<string, string>>>;
  applyDebtPayment: (debt: DebtRow, amount: number) => Promise<void>;
  applyingDebtPaymentId: string | null;
  debtPaymentStatus: DebtPaymentStatus;
  startEditDebt: (debt: DebtRow) => void;
  saveDebtEdit: (id: string) => Promise<void>;
  cancelEditDebt: () => void;
  archiveDebt: (id: string) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  resetDebtDueDate: (id: string) => Promise<void>;
};

export default function DebtPaymentControls({
  debt,
  editingDebtId,
  debtPayments,
  setDebtPayments,
  applyDebtPayment,
  applyingDebtPaymentId,
  debtPaymentStatus,
  startEditDebt,
  saveDebtEdit,
  cancelEditDebt,
  archiveDebt,
  deleteDebt,
  resetDebtDueDate,
}: DebtPaymentControlsProps) {
  const actionClass = "w-full whitespace-nowrap px-4 text-sm";
  const isApplying = applyingDebtPaymentId === debt.id;
  const [isResettingDueDate, setIsResettingDueDate] = useState(false);
  const [paymentMode, setPaymentMode] = useState<DebtPaymentMode>("custom");
  const [extraPayment, setExtraPayment] = useState("");
  const enteredAmount = Number(debtPayments[debt.id] || 0);
  const paymentAmount = calculateDebtPaymentAmount({
    balance: debt.balance,
    minimumPayment: debt.minimum_payment,
    mode: paymentMode,
    extraPayment: Number(extraPayment || 0),
    customAmount: enteredAmount,
  });
  const paymentWarning = getDebtPaymentWarning({ balance: debt.balance, minimumPayment: debt.minimum_payment, amount: paymentAmount });

  async function handleResetDueDate() {
    setIsResettingDueDate(true);
    try {
      await resetDebtDueDate(debt.id);
    } finally {
      setIsResettingDueDate(false);
    }
  }

  return editingDebtId === debt.id ? (
    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={() => saveDebtEdit(debt.id)} className="beast-button">
        Save
      </button>

      <button type="button" onClick={cancelEditDebt} className="beast-button-secondary">
        Cancel
      </button>
    </div>
  ) : (
    <div className="grid min-w-0 gap-2 text-sm" data-action-menu-list="debt">
      <div
        className="grid min-w-0 grid-cols-1 gap-2"
        data-mobile-money-payment-form="debt"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label={`${debt.name} payment amount mode`}>
          {(["minimum", "minimum_plus_extra", "custom"] as const).map((mode) => (
            <button key={mode} type="button" className={paymentMode === mode ? "beast-button" : "beast-button-secondary"} onClick={() => setPaymentMode(mode)}>
              {mode === "minimum" ? "Minimum" : mode === "minimum_plus_extra" ? "Minimum + Extra" : "Custom Total"}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#9aa7b8]">Balance ${Number(debt.balance || 0).toFixed(2)} · Minimum ${Number(debt.minimum_payment || 0).toFixed(2)}</p>
        {paymentMode === "minimum_plus_extra" ? <input type="number" min="0" step="0.01" value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)} placeholder="Extra payment" aria-label={`${debt.name} extra payment`} className="beast-input h-9 px-2 text-sm" disabled={isApplying} /> : null}
        {paymentMode === "custom" ? <input
          type="number"
          value={debtPayments[debt.id] || ""}
          onChange={(e) =>
            setDebtPayments((prev) => ({
              ...prev,
              [debt.id]: e.target.value,
            }))
          }
          placeholder="Payment"
          className="beast-input h-9 px-2 text-sm"
          disabled={isApplying}
        /> : null}

        {paymentWarning ? <p role="status" className="rounded bg-amber-950/50 px-2 py-1 text-xs text-amber-200">{paymentWarning}</p> : null}

        <button
          type="button"
          onClick={() =>
            applyDebtPayment(debt, paymentAmount)
          }
          disabled={isApplying || paymentAmount <= 0}
          className={`beast-button-secondary ${actionClass}`}
        >
          {isApplying ? "..." : "Make Payment"}
        </button>

        <button
          type="button"
          onClick={() =>
            applyDebtPayment(debt, calculateDebtPaymentAmount({ balance: debt.balance, minimumPayment: debt.minimum_payment, mode: "minimum" }))
          }
          disabled={isApplying}
          className={`beast-button ${actionClass}`}
        >
          {isApplying ? "..." : "Pay Minimum"}
        </button>
      </div>

      {debtPaymentStatus[debt.id]?.type && (
        <div
          className={`rounded px-2 py-1 text-xs ${
            debtPaymentStatus[debt.id]?.type === "error"
              ? "bg-red-900 text-red-100"
              : "bg-green-900 text-green-100"
          }`}
        >
          {debtPaymentStatus[debt.id]?.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        <button type="button" onClick={() => startEditDebt(debt)} className={`beast-button-secondary ${actionClass}`}>
          Edit
        </button>

        <button
          type="button"
          onClick={handleResetDueDate}
          disabled={isResettingDueDate}
          className={`beast-button-secondary ${actionClass}`}
        >
          {isResettingDueDate ? "Resetting..." : "Reset Due"}
        </button>

        <button
          type="button"
          onClick={() => { if (window.confirm(`Archive ${debt.name}?`)) void archiveDebt(debt.id); }}
          className={`beast-button-secondary ${actionClass}`}
        >
          Archive
        </button>

        <button type="button" onClick={() => { if (window.confirm(`Delete ${debt.name}? This action cannot be undone.`)) void deleteDebt(debt.id); }} className={`beast-button bg-red-700 hover:bg-red-600 ${actionClass}`}>
          Delete
        </button>
      </div>
    </div>
  );
}
