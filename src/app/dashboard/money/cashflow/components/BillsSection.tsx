"use client";

import type { Dispatch, SetStateAction } from "react";
import BillPaymentControls from "./BillPaymentControls";

type BillFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "every_2_months"
  | "every_3_months"
  | "every_6_months"
  | "yearly";

export type BillRow = {
  id: string;
  name: string;
  amount: number;
  paid: number;
  remaining: number;
  frequency: string;
  due_date?: number;
  assigned_income_date?: string | null;
  funding_source_id?: string | null;
  nextDueDateDisplay: string;
  status: string;
};

type OptionItem = {
  value: string;
  label: string;
};

type IncomeBucket = {
  id: string;
  date: string;
  dropdownLabel: string;
};

type FundingSource = {
  id: string;
  name: string;
};

type BillsSectionProps = {
  showBills: boolean;
  setShowBills: () => void;
  activeBills: BillRow[];
  editingBillId: string | null;
  editBillName: string;
  editBillAmount: string;
  editBillDueDate: string;
  editBillFrequency: BillFrequency;
  setEditBillName: (value: string) => void;
  setEditBillAmount: (value: string) => void;
  setEditBillDueDate: (value: string) => void;
  setEditBillFrequency: (value: BillFrequency) => void;
  billFrequencyOptions: OptionItem[];
  getFrequencyLabel: (value: string) => string;
  incomeBucketPlans: IncomeBucket[];
  activeFundingSources: FundingSource[];
  updateBillIncomeDate: (billId: string, assignedIncomeDate: string) => void;
  updateBillFundingSource: (billId: string, fundingSourceId: string) => void;
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

export default function BillsSection({
  showBills,
  setShowBills,
  activeBills,
  editingBillId,
  editBillName,
  editBillAmount,
  editBillDueDate,
  editBillFrequency,
  setEditBillName,
  setEditBillAmount,
  setEditBillDueDate,
  setEditBillFrequency,
  billFrequencyOptions,
  getFrequencyLabel,
  incomeBucketPlans,
  activeFundingSources,
  updateBillIncomeDate,
  updateBillFundingSource,
  partialPayments,
  setPartialPayments,
  addBillPayment,
  markBillPaid,
  startEditBill,
  saveBillEdit,
  cancelEditBill,
  archiveBill,
  resetBillDueDate,
}: BillsSectionProps) {
  return (
    <section id="bills" className="money-section-panel">
      <div className="money-section-header">
        <div>
          <h2 className="money-section-title">Bills</h2>
          <p className="money-section-description">
            Compact operating view. Edit a bill to change amount, due day,
            or frequency.
          </p>
        </div>

        <button onClick={setShowBills} className="beast-button-secondary">
          {showBills ? "Hide" : `Show (${activeBills.length})`}
        </button>
      </div>

      {showBills && (
        <>
          <div
            className="grid min-w-0 gap-3 p-3 md:hidden"
            data-mobile-bill-cards="true"
          >
            {activeBills.length === 0 ? (
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm text-[#c7cfdb]">
                No bills added yet.
              </div>
            ) : (
              activeBills.map((bill) => (
                <article
                  key={bill.id}
                  className="min-w-0 overflow-hidden rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  {editingBillId === bill.id ? (
                    <div className="grid min-w-0 gap-3">
                      <input
                        value={editBillName}
                        onChange={(e) => setEditBillName(e.target.value)}
                        placeholder="Bill name"
                        className="beast-input"
                      />

                      <div className="grid min-w-0 gap-2">
                        <input
                          type="number"
                          value={editBillAmount}
                          onChange={(e) => setEditBillAmount(e.target.value)}
                          placeholder="Amount"
                          className="beast-input"
                        />

                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={editBillDueDate}
                          onChange={(e) => setEditBillDueDate(e.target.value)}
                          placeholder="Due day"
                          className="beast-input"
                        />

                        <select
                          value={editBillFrequency}
                          onChange={(e) =>
                            setEditBillFrequency(e.target.value as BillFrequency)
                          }
                          className="beast-input"
                        >
                          {billFrequencyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-base font-black text-white">
                            {bill.name}
                          </h3>
                          <p className="mt-1 text-xs text-[#7f8da3]">
                            Due {bill.nextDueDateDisplay}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs font-bold uppercase text-[#7f8da3]">
                            Remaining
                          </div>
                          <div className="font-black text-white">
                            ${Number(bill.remaining || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-sm">
                        <div className="min-w-0 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                          <div className="text-xs font-bold uppercase text-[#7f8da3]">
                            Status
                          </div>
                          <div
                            className={
                              bill.status === "Paid"
                                ? "mt-1 font-semibold text-green-300"
                                : bill.status === "Partial" || bill.status === "Due Soon"
                                ? "mt-1 font-semibold text-yellow-300"
                                : bill.status === "Late"
                                ? "mt-1 font-semibold text-red-300"
                                : "mt-1 font-semibold text-[#c7cfdb]"
                            }
                          >
                            {bill.status}
                          </div>
                        </div>

                        <div className="min-w-0 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                          <div className="text-xs font-bold uppercase text-[#7f8da3]">
                            Amount Due
                          </div>
                          <div className="mt-1 truncate font-semibold text-[#dbe3ef]">
                            ${Number(bill.amount || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 min-w-0">
                    <BillPaymentControls
                      bill={bill}
                      editingBillId={editingBillId}
                      partialPayments={partialPayments}
                      setPartialPayments={setPartialPayments}
                      addBillPayment={addBillPayment}
                      markBillPaid={markBillPaid}
                      startEditBill={startEditBill}
                      saveBillEdit={saveBillEdit}
                      cancelEditBill={cancelEditBill}
                      archiveBill={archiveBill}
                      resetBillDueDate={resetBillDueDate}
                    />
                  </div>

                  {editingBillId !== bill.id ? (
                    <details className="mt-4 min-w-0 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                      <summary className="cursor-pointer text-sm font-bold text-[#dbe3ef]">
                        Details
                      </summary>

                      <div className="mt-3 grid min-w-0 gap-3 text-sm text-[#c7cfdb]">
                        <div className="min-w-0">
                          Paid: ${Number(bill.paid || 0).toFixed(2)} |{" "}
                          {getFrequencyLabel(bill.frequency)}
                        </div>

                        <label className="grid min-w-0 gap-1">
                          <span className="text-xs font-bold uppercase text-[#7f8da3]">
                            Income Pot
                          </span>
                          <select
                            value={bill.assigned_income_date || ""}
                            onChange={(e) =>
                              updateBillIncomeDate(bill.id, e.target.value)
                            }
                            className="beast-input"
                          >
                            <option value="">Unassigned</option>
                            {incomeBucketPlans.map((bucket) => (
                              <option key={bucket.id} value={bucket.date}>
                                {bucket.dropdownLabel}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid min-w-0 gap-1">
                          <span className="text-xs font-bold uppercase text-[#7f8da3]">
                            Funding Source
                          </span>
                          <select
                            value={bill.funding_source_id || ""}
                            onChange={(e) =>
                              updateBillFundingSource(bill.id, e.target.value)
                            }
                            className="beast-input"
                          >
                            <option value="">Unassigned</option>
                            {activeFundingSources.map((source) => (
                              <option key={source.id} value={source.id}>
                                {source.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </details>
                  ) : null}
                </article>
              ))
            )}
          </div>

          <div className="beast-table-wrap hidden md:block" tabIndex={0} role="region" aria-label="Bills table">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr>
                <th className="text-left">Bill</th>
                <th className="text-right">Remaining</th>
                <th className="text-center">Next Due</th>
                <th className="text-center">Income Pot</th>
                <th className="text-center">Funding Source</th>
                <th className="text-center">Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {activeBills.length === 0 ? (
                <tr>
                  <td colSpan={7}>No bills added yet.</td>
                </tr>
              ) : (
                activeBills.map((bill) => (
                  <tr key={bill.id}>
                    <td className="min-w-[220px] text-left align-top">
                      {editingBillId === bill.id ? (
                        <div className="grid gap-2">
                          <input
                            value={editBillName}
                            onChange={(e) => setEditBillName(e.target.value)}
                            placeholder="Bill name"
                            className="beast-input"
                          />

                          <div className="grid gap-2 sm:grid-cols-3">
                            <input
                              type="number"
                              value={editBillAmount}
                              onChange={(e) => setEditBillAmount(e.target.value)}
                              placeholder="Amount"
                              className="beast-input"
                            />

                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={editBillDueDate}
                              onChange={(e) => setEditBillDueDate(e.target.value)}
                              placeholder="Due day"
                              className="beast-input"
                            />

                            <select
                              value={editBillFrequency}
                              onChange={(e) =>
                                setEditBillFrequency(e.target.value as BillFrequency)
                              }
                              className="beast-input"
                            >
                              {billFrequencyOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold">{bill.name}</div>
                          <div className="mt-1 text-xs text-[#7f8da3]">
                            Due: ${Number(bill.amount || 0).toFixed(2)} |
                            Paid: ${Number(bill.paid || 0).toFixed(2)} | {getFrequencyLabel(bill.frequency)}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="text-right align-top font-semibold">
                      ${Number(bill.remaining || 0).toFixed(2)}
                    </td>

                    <td className="text-center align-top">{bill.nextDueDateDisplay}</td>

                    <td className="min-w-[300px] text-center align-top">
                      <select
                        value={bill.assigned_income_date || ""}
                        onChange={(e) => updateBillIncomeDate(bill.id, e.target.value)}
                        className="beast-input"
                      >
                        <option value="">Unassigned</option>
                        {incomeBucketPlans.map((bucket) => (
                          <option key={bucket.id} value={bucket.date}>
                            {bucket.dropdownLabel}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="min-w-[240px] text-center align-top">
                      <select
                        value={bill.funding_source_id || ""}
                        onChange={(e) => updateBillFundingSource(bill.id, e.target.value)}
                        className="beast-input"
                      >
                        <option value="">Unassigned</option>
                        {activeFundingSources.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="text-center align-top">
                      <span
                        className={
                          bill.status === "Paid"
                            ? "text-green-300"
                            : bill.status === "Partial" || bill.status === "Due Soon"
                            ? "text-yellow-300"
                            : bill.status === "Late"
                            ? "text-red-300"
                            : "text-[#c7cfdb]"
                        }
                      >
                        {bill.status}
                      </span>
                    </td>

                    <td className="min-w-[240px] align-top">
                      <BillPaymentControls
                        bill={bill}
                        editingBillId={editingBillId}
                        partialPayments={partialPayments}
                        setPartialPayments={setPartialPayments}
                        addBillPayment={addBillPayment}
                        markBillPaid={markBillPaid}
                        startEditBill={startEditBill}
                        saveBillEdit={saveBillEdit}
                        cancelEditBill={cancelEditBill}
                        archiveBill={archiveBill}
                        resetBillDueDate={resetBillDueDate}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </>
      )}
    </section>
  );
}
