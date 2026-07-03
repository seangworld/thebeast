"use client";

import { type Dispatch, type SetStateAction } from "react";
import DebtPaymentControls from "./DebtPaymentControls";

type DebtRow = {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
  payment_behavior?: "fixed" | "revolving";
  nextDueDateDisplay: string;
  assigned_income_date?: string | null;
  funding_source_id?: string | null;
};

export type { DebtRow };

type IncomeBucket = {
  id: string;
  date: string;
  dropdownLabel: string;
};

type FundingSource = {
  id: string;
  name: string;
};

type DebtsSectionProps = {
  showDebts: boolean;
  setShowDebts: () => void;
  activeDebts: DebtRow[];
  editingDebtId: string | null;
  editDebtName: string;
  editDebtBalance: string;
  editDebtMinimumPayment: string;
  editDebtPaymentBehavior: "fixed" | "revolving";
  editDebtInterestRate: string;
  editDebtDueDate: string;
  setEditDebtName: (value: string) => void;
  setEditDebtBalance: (value: string) => void;
  setEditDebtMinimumPayment: (value: string) => void;
  setEditDebtPaymentBehavior: (value: "fixed" | "revolving") => void;
  setEditDebtInterestRate: (value: string) => void;
  setEditDebtDueDate: (value: string) => void;
  editDebtMinimumPaymentRate: string;
  editDebtMinimumPaymentFloor: string;
  setEditDebtMinimumPaymentRate: (value: string) => void;
  setEditDebtMinimumPaymentFloor: (value: string) => void;
  incomeBucketPlans: IncomeBucket[];
  activeFundingSources: FundingSource[];
  updateDebtIncomeDate: (debtId: string, assignedIncomeDate: string) => void;
  updateDebtFundingSource: (debtId: string, fundingSourceId: string) => void;
  debtPayments: Record<string, string>;
  setDebtPayments: Dispatch<SetStateAction<Record<string, string>>>;
  applyDebtPayment: (debt: DebtRow, amount: number) => Promise<void>;
  applyingDebtPaymentId: string | null;
  debtPaymentStatus: Record<string, { type: "error" | "success" | null; message: string }>;
  startEditDebt: (debt: DebtRow) => void;
  saveDebtEdit: (id: string) => Promise<void>;
  cancelEditDebt: () => void;
  archiveDebt: (id: string) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  resetDebtDueDate: (id: string) => Promise<void>;
};

export default function DebtsSection({
  showDebts,
  setShowDebts,
  activeDebts,
  editingDebtId,
  editDebtName,
  editDebtBalance,
  editDebtMinimumPayment,
  editDebtPaymentBehavior,
  editDebtInterestRate,
  editDebtDueDate,
  setEditDebtName,
  setEditDebtBalance,
  setEditDebtMinimumPayment,
  setEditDebtPaymentBehavior,
  setEditDebtInterestRate,
  setEditDebtDueDate,
  editDebtMinimumPaymentRate,
  editDebtMinimumPaymentFloor,
  setEditDebtMinimumPaymentRate,
  setEditDebtMinimumPaymentFloor,
  incomeBucketPlans,
  activeFundingSources,
  updateDebtIncomeDate,
  updateDebtFundingSource,
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
}: DebtsSectionProps) {
  return (
    <section className="beast-panel overflow-hidden">
      <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-xl font-bold">Debts</h2>
          <p className="mt-1 text-sm text-[#7f8da3]">
            Assign each debt minimum payment to the income pot that should
            cover it. Edit debts when APRs, balances, due days, or minimums
            change.
          </p>
          <p className="mt-2 text-xs text-[#5a6577]">
            Debts are balances you owe and plan to pay down. A debt may be linked to a funding source for tracking credit limits, available credit, or payment routing.
          </p>
        </div>

        <button onClick={setShowDebts} className="beast-button-secondary">
          {showDebts ? "Hide" : `Show (${activeDebts.length})`}
        </button>
      </div>

      {showDebts && (
        <div className="beast-table-wrap">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr>
                <th className="text-left">Debt</th>
                <th className="text-right">Minimum</th>
                <th className="text-center">Next Due</th>
                <th className="text-center">Income Pot</th>
                <th className="text-center">Funding Source</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {activeDebts.length === 0 ? (
                <tr>
                  <td colSpan={6}>No debts added yet.</td>
                </tr>
              ) : (
                activeDebts.map((debt) => (
                  <tr key={debt.id}>
                    <td className="min-w-[260px] text-left align-top">
                      {editingDebtId === debt.id ? (
                        <div className="grid gap-2">
                          <input
                            value={editDebtName}
                            onChange={(e) => setEditDebtName(e.target.value)}
                            placeholder="Debt name"
                            className="beast-input"
                          />

                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              type="number"
                              value={editDebtBalance}
                              onChange={(e) => setEditDebtBalance(e.target.value)}
                              placeholder="Balance"
                              className="beast-input"
                            />

                            <input
                              type="number"
                              value={editDebtMinimumPayment}
                              onChange={(e) => setEditDebtMinimumPayment(e.target.value)}
                              placeholder="Minimum"
                              className="beast-input"
                            />

                            <select
                              value={editDebtPaymentBehavior}
                              onChange={(e) =>
                                setEditDebtPaymentBehavior(
                                  e.target.value as "fixed" | "revolving"
                                )
                              }
                              className="beast-input"
                            >
                              <option value="fixed">Fixed Minimum</option>
                              <option value="revolving">Revolving / Credit Minimum</option>
                            </select>

                            <input
                              type="number"
                              value={editDebtInterestRate}
                              onChange={(e) => setEditDebtInterestRate(e.target.value)}
                              placeholder="APR"
                              className="beast-input"
                            />

                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={editDebtDueDate}
                              onChange={(e) => setEditDebtDueDate(e.target.value)}
                              placeholder="Due day"
                              className="beast-input"
                            />
                          </div>

                          {editDebtPaymentBehavior === "revolving" ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                type="number"
                                value={editDebtMinimumPaymentRate}
                                onChange={(e) =>
                                  setEditDebtMinimumPaymentRate(e.target.value)
                                }
                                placeholder="Min %"
                                className="beast-input"
                              />

                              <input
                                type="number"
                                value={editDebtMinimumPaymentFloor}
                                onChange={(e) =>
                                  setEditDebtMinimumPaymentFloor(e.target.value)
                                }
                                placeholder="Floor"
                                className="beast-input"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold">{debt.name}</div>
                          <div className="mt-1 text-xs text-[#7f8da3]">
                            Balance: ${Number(debt.balance || 0).toFixed(2)} | APR: {Number(debt.interest_rate || 0).toFixed(2)}%
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="text-right align-top font-semibold">
                      ${Number(debt.minimum_payment || 0).toFixed(2)}
                    </td>

                    <td className="text-center align-top">{debt.nextDueDateDisplay}</td>

                    <td className="min-w-[300px] text-center align-top">
                      <select
                        value={debt.assigned_income_date || ""}
                        onChange={(e) => updateDebtIncomeDate(debt.id, e.target.value)}
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
                        value={debt.funding_source_id || ""}
                        onChange={(e) => updateDebtFundingSource(debt.id, e.target.value)}
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

                    <td className="min-w-[220px] align-top">
                      <DebtPaymentControls
                        debt={debt}
                        editingDebtId={editingDebtId}
                        debtPayments={debtPayments}
                        setDebtPayments={setDebtPayments}
                        applyDebtPayment={applyDebtPayment}
                        applyingDebtPaymentId={applyingDebtPaymentId}
                        debtPaymentStatus={debtPaymentStatus}
                        startEditDebt={startEditDebt}
                        saveDebtEdit={saveDebtEdit}
                        cancelEditDebt={cancelEditDebt}
                        archiveDebt={archiveDebt}
                        resetDebtDueDate={resetDebtDueDate}
                        deleteDebt={deleteDebt}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
