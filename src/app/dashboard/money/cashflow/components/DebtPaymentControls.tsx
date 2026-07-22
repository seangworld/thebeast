"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { DebtRow } from "./DebtsSection";

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
  const isApplying = applyingDebtPaymentId === debt.id;
  const [isResettingDueDate, setIsResettingDueDate] = useState(false);

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
      <button onClick={() => saveDebtEdit(debt.id)} className="beast-button">
        Save
      </button>

      <button onClick={cancelEditDebt} className="beast-button-secondary">
        Cancel
      </button>
    </div>
  ) : (
    <div className="grid gap-2">
      <div
        className="grid min-w-0 grid-cols-1 gap-2 min-[390px]:grid-cols-[1fr_auto_auto]"
        data-mobile-money-payment-form="debt"
      >
        <input
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
        />

        <button
          onClick={() =>
            applyDebtPayment(debt, Number(debtPayments[debt.id] || 0))
          }
          disabled={isApplying}
          className="beast-button-secondary"
        >
          {isApplying ? "..." : "Apply Payment"}
        </button>

        <button
          onClick={() =>
            applyDebtPayment(debt, Number(debt.minimum_payment || 0))
          }
          disabled={isApplying}
          className="beast-button"
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

      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4">
        <button onClick={() => startEditDebt(debt)} className="beast-button-secondary">
          Edit
        </button>

        <button
          type="button"
          onClick={handleResetDueDate}
          disabled={isResettingDueDate}
          className="beast-button-secondary"
        >
          {isResettingDueDate ? "Resetting..." : "Reset Due"}
        </button>

        <button
          onClick={() => { if (window.confirm(`Archive ${debt.name}?`)) void archiveDebt(debt.id); }}
          className="beast-button-secondary"
        >
          Archive
        </button>

        <button onClick={() => { if (window.confirm(`Delete ${debt.name}? This action cannot be undone.`)) void deleteDebt(debt.id); }} className="beast-button bg-red-700 hover:bg-red-600">
          Delete
        </button>
      </div>
    </div>
  );
}
