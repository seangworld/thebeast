"use client";

import { Dispatch, SetStateAction, useRef, useState } from "react";
import type { BillRow } from "./BillsSection";
import { createFinancialOperationId } from "../../../../../lib/atomicFinancialCommands";

export type BillPaymentResult = { ok: boolean; message: string };

type BillPaymentControlsProps = {
  bill: BillRow;
  editingBillId: string | null;
  partialPayments: Record<string, string>;
  setPartialPayments: Dispatch<SetStateAction<Record<string, string>>>;
  addBillPayment: (bill: BillRow, amount: number, operationId: string) => Promise<BillPaymentResult>;
  markBillPaid: (bill: BillRow, operationId: string) => Promise<BillPaymentResult>;
  startEditBill: (bill: BillRow) => void;
  saveBillEdit: (id: string) => Promise<void>;
  cancelEditBill: () => void;
  archiveBill: (id: string) => Promise<void>;
  resetBillDueDate: (id: string) => Promise<void>;
};

export default function BillPaymentControls({
  bill,
  editingBillId,
  partialPayments,
  setPartialPayments,
  addBillPayment,
  markBillPaid,
  startEditBill,
  saveBillEdit,
  cancelEditBill,
  archiveBill,
  resetBillDueDate,
}: BillPaymentControlsProps) {
  const actionClass = "w-full whitespace-nowrap px-4 text-sm";
  const [isResettingDueDate, setIsResettingDueDate] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const pendingPayment = useRef<{ fingerprint: string; operationId: string } | null>(null);

  async function submitPayment(mode: "partial" | "full", amount: number) {
    const fingerprint = JSON.stringify({ billId: bill.id, mode, amount });
    const operationId = pendingPayment.current?.fingerprint === fingerprint
      ? pendingPayment.current.operationId
      : createFinancialOperationId();
    pendingPayment.current = { fingerprint, operationId };
    setPaymentStatus(null);
    const result = mode === "full"
      ? await markBillPaid(bill, operationId)
      : await addBillPayment(bill, amount, operationId);
    setPaymentStatus({ type: result.ok ? "success" : "error", message: result.message });
    if (result.ok) pendingPayment.current = null;
  }

  async function handleResetDueDate() {
    setIsResettingDueDate(true);
    try {
      await resetBillDueDate(bill.id);
    } finally {
      setIsResettingDueDate(false);
    }
  }

  return editingBillId === bill.id ? (
    <div className="grid gap-2 sm:grid-cols-2">
      <button onClick={() => saveBillEdit(bill.id)} className="beast-button">
        Save
      </button>

      <button onClick={cancelEditBill} className="beast-button-secondary">
        Cancel
      </button>
    </div>
  ) : (
    <div className="grid min-w-0 gap-2 text-sm" data-action-menu-list="bill">
      <div
        className="grid min-w-0 grid-cols-1 gap-2"
        data-mobile-money-payment-form="bill"
      >
        <input
          type="number"
          value={partialPayments[bill.id] || ""}
          onChange={(e) =>
            setPartialPayments((prev) => ({
              ...prev,
              [bill.id]: e.target.value,
            }))
          }
          placeholder="Partial payment"
          className="beast-input h-9 px-2 text-sm"
        />

        <button
          onClick={() => void submitPayment("partial", Number(partialPayments[bill.id] || 0))}
          className={`beast-button-secondary ${actionClass}`}
        >
          Partial Payment
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button onClick={() => void submitPayment("full", Number(bill.remaining || 0))} className={`beast-button ${actionClass}`}>
          Pay
        </button>

        {paymentStatus ? <p role={paymentStatus.type === "error" ? "alert" : "status"} className={paymentStatus.type === "error" ? "rounded bg-red-950/60 px-3 py-2 text-sm text-red-200" : "rounded bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200"}>{paymentStatus.message}</p> : null}

        <button onClick={() => startEditBill(bill)} className={`beast-button-secondary ${actionClass}`}>
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
          onClick={() => { if (window.confirm(`Archive ${bill.name}?`)) void archiveBill(bill.id); }}
          className={`beast-button-secondary ${actionClass}`}
        >
          Archive
        </button>
      </div>
    </div>
  );
}
