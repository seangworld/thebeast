"use client";

import { Dispatch, SetStateAction, useState } from "react";
import type { BillRow } from "./BillsSection";

type BillPaymentControlsProps = {
  bill: BillRow;
  editingBillId: string | null;
  partialPayments: Record<string, string>;
  setPartialPayments: Dispatch<SetStateAction<Record<string, string>>>;
  addBillPayment: (bill: BillRow, amount: number) => Promise<void>;
  markBillPaid: (bill: BillRow) => Promise<void>;
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
  const [isResettingDueDate, setIsResettingDueDate] = useState(false);

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
    <div className="grid gap-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          type="number"
          value={partialPayments[bill.id] || ""}
          onChange={(e) =>
            setPartialPayments((prev) => ({
              ...prev,
              [bill.id]: e.target.value,
            }))
          }
          placeholder="Partial"
          className="beast-input h-9 px-2 text-sm"
        />

        <button
          onClick={() =>
            addBillPayment(bill, Number(partialPayments[bill.id] || 0))
          }
          className="beast-button-secondary"
        >
          Add
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button onClick={() => markBillPaid(bill)} className="beast-button">
          Paid
        </button>

        <button onClick={() => startEditBill(bill)} className="beast-button-secondary">
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
          onClick={() => archiveBill(bill.id)}
          className="beast-button-secondary"
        >
          Archive
        </button>
      </div>
    </div>
  );
}
