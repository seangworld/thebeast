"use client";

import { type Dispatch, type SetStateAction } from "react";
import DebtPaymentControls from "./DebtPaymentControls";
import { PaymentAutomationControls, type AutomationPatch } from "../../components/PaymentAutomationControls";
import { normalizePaymentAutomation } from "@/lib/paymentAutomation";
import { CompactAssignmentSelect, compactIncomeLabel } from "./CompactAssignmentSelect";
import { OverlayPopover } from "./OverlayPopover";

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
  auto_pay_enabled?: boolean | null;
  reminder_enabled?: boolean | null;
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
  updatePaymentAutomation: (id: string, patch: AutomationPatch) => Promise<void>;
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
  updatePaymentAutomation,
}: DebtsSectionProps) {
  const incomeOptions = incomeBucketPlans.map((bucket) => ({
    value: bucket.date,
    compactLabel: compactIncomeLabel(bucket.dropdownLabel),
    detailLabel: bucket.dropdownLabel,
  }));
  const fundingOptions = activeFundingSources.map((source) => ({
    value: source.id,
    compactLabel: source.name,
    detailLabel: source.name,
  }));
  return (
    <section className="beast-panel overflow-hidden">
      <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="money-section-title">Debts</h2>
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
        <>
          <div
            className="grid min-w-0 gap-3 p-3 lg:hidden"
            data-mobile-debt-cards="true"
          >
            {activeDebts.length === 0 ? (
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm text-[#c7cfdb]">
                No debts added yet.
              </div>
            ) : (
              activeDebts.map((debt) => (
                <article
                  key={debt.id}
                  className="min-w-0 overflow-hidden rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  {editingDebtId === debt.id ? (
                    <div className="grid min-w-0 gap-3">
                      <input
                        value={editDebtName}
                        onChange={(e) => setEditDebtName(e.target.value)}
                        placeholder="Debt name"
                        className="beast-input"
                      />

                      <div className="grid min-w-0 gap-2">
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
                        <div className="grid min-w-0 gap-2">
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
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-base font-black text-white">
                            {debt.name}
                          </h3>
                          <p className="mt-1 text-xs text-[#7f8da3]">
                            Due {debt.nextDueDateDisplay}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs font-bold uppercase text-[#7f8da3]">
                            Balance
                          </div>
                          <div className="font-black text-white">
                            ${Number(debt.balance || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-sm">
                        <div className="min-w-0 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                          <div className="text-xs font-bold uppercase text-[#7f8da3]">
                            Minimum
                          </div>
                          <div className="mt-1 truncate font-semibold text-[#dbe3ef]">
                            ${Number(debt.minimum_payment || 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="min-w-0 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                          <div className="text-xs font-bold uppercase text-[#7f8da3]">
                            Status
                          </div>
                          <div className="mt-1 font-semibold text-yellow-300">
                            Active
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 min-w-0">
                    <PaymentAutomationControls name={debt.name} {...normalizePaymentAutomation(debt)} onSave={(patch) => updatePaymentAutomation(debt.id, patch)} />
                  </div>
                  <div className="mt-4 min-w-0">
                    {editingDebtId === debt.id ? <DebtPaymentControls
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
                    /> : <OverlayPopover label="Actions" width={192} testId="debt-actions">{() => <DebtPaymentControls
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
                    />}</OverlayPopover>}
                  </div>

                  {editingDebtId !== debt.id ? (
                    <details className="mt-4 min-w-0 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                      <summary className="cursor-pointer text-sm font-bold text-[#dbe3ef]">
                        Details
                      </summary>

                      <div className="mt-3 grid min-w-0 gap-3 text-sm text-[#c7cfdb]">
                        <div className="min-w-0">
                          APR: {Number(debt.interest_rate || 0).toFixed(2)}%
                        </div>

                        <div className="grid min-w-0 gap-1">
                          <span className="text-xs font-bold uppercase text-[#7f8da3]">
                            Income Pot
                          </span>
                          <CompactAssignmentSelect
                            label={`${debt.name} income pot`}
                            value={debt.assigned_income_date || ""}
                            options={incomeOptions}
                            onChange={(value) => updateDebtIncomeDate(debt.id, value)}
                          />
                        </div>

                        <div className="grid min-w-0 gap-1">
                          <span className="text-xs font-bold uppercase text-[#7f8da3]">
                            Funding Source
                          </span>
                          <CompactAssignmentSelect
                            label={`${debt.name} funding source`}
                            value={debt.funding_source_id || ""}
                            options={fundingOptions}
                            overlayWidth={220}
                            onChange={(value) => updateDebtFundingSource(debt.id, value)}
                          />
                        </div>
                      </div>
                    </details>
                  ) : null}
                </article>
              ))
            )}
          </div>

          <div className="hidden lg:block" role="region" aria-label="Cash flow debts table">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr>
                <th className="text-left">Debt</th>
                <th className="text-right">Minimum</th>
                <th className="text-center">Next Due</th>
                <th className="text-center">Income Pot</th>
                <th className="hidden text-center min-[1440px]:table-cell">Funding Source</th>
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
                    <td className="w-[28%] text-left align-top">
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
                      <div className="mt-2">
                        <PaymentAutomationControls compact name={debt.name} {...normalizePaymentAutomation(debt)} onSave={(patch) => updatePaymentAutomation(debt.id, patch)} />
                      </div>
                      <details className="mt-2 text-xs text-[#9aa7b8]">
                        <summary className="cursor-pointer font-semibold text-cyan-200">Row details</summary>
                        <div className="mt-2 grid gap-1">
                          <span>Income pot: {incomeOptions.find((option) => option.value === debt.assigned_income_date)?.detailLabel || "Unassigned"}</span>
                          <span>Funding source: {fundingOptions.find((option) => option.value === debt.funding_source_id)?.detailLabel || "Unassigned"}</span>
                          <span>Payment behavior: {debt.payment_behavior === "revolving" ? "Revolving / credit minimum" : "Fixed minimum"}</span>
                        </div>
                      </details>
                    </td>

                    <td className="text-right align-top font-semibold">
                      ${Number(debt.minimum_payment || 0).toFixed(2)}
                    </td>

                    <td className="text-center align-top">{debt.nextDueDateDisplay}</td>

                    <td className="text-center align-top">
                      <CompactAssignmentSelect
                        label={`${debt.name} income pot`}
                        value={debt.assigned_income_date || ""}
                        options={incomeOptions}
                        onChange={(value) => updateDebtIncomeDate(debt.id, value)}
                      />
                    </td>

                    <td className="hidden text-center align-top min-[1440px]:table-cell">
                      <CompactAssignmentSelect
                        label={`${debt.name} funding source`}
                        value={debt.funding_source_id || ""}
                        options={fundingOptions}
                        overlayWidth={220}
                        onChange={(value) => updateDebtFundingSource(debt.id, value)}
                      />
                    </td>

                    <td className="w-[18%] align-top">
                      <OverlayPopover label="Actions" width={192} testId="debt-actions">{() => <div className="min-w-0 whitespace-normal">
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
                        </div>}</OverlayPopover>
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
