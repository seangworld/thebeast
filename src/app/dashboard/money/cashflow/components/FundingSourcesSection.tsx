import type { FundingSource } from "../cashflowUtils";
import FundingIntelligence from "./FundingIntelligence";
import FundingRecommendations from "./FundingRecommendations";
import FundingSourcesSummaryCards from "./FundingSourcesSummaryCards";
import PaymentSourceCoverage from "./PaymentSourceCoverage";

type FundingSourcesSummary = {
  activeSourceCount: number;
  liquidFundingTotal: number;
  creditAvailableTotal: number;
  creditLimitTotal: number;
  creditUtilizationPercent: number;
};

type FundingSourcesSectionProps = {
  showFundingSources: boolean;
  setShowFundingSources: (value: boolean) => void;
  fundingSources: FundingSource[];
  debts: any[];
  activeFundingSources: FundingSource[];
  summary: FundingSourcesSummary;
  paymentSourceCoverage: any;
  fundingIntelligence: any[];
  fundingRecommendations: any[];
  newFundingSource: any;
  setNewFundingSource: (value: any) => void;
  addFundingSource: () => void;
  editingFundingSourceId: string | null;
  editingFundingSource: any;
  setEditingFundingSource: (value: any) => void;
  saveError: string | null;
  getFundingSourceBalance: (source: any, linkedDebt?: any) => number;
  getFundingSourceAvailableCredit: (source: any, linkedDebt?: any) => number | null;
  getFundingSourceUtilization: (source: FundingSource) => number | null;
  startEditFundingSource: (source: any) => void;
  cancelEditFundingSource: () => void;
  updateFundingSource: (id: string) => void;
  deleteFundingSource: (id: string) => void;
};

export default function FundingSourcesSection({
  showFundingSources,
  setShowFundingSources,
  fundingSources,
  debts,
  activeFundingSources,
  summary,
  paymentSourceCoverage,
  fundingIntelligence,
  fundingRecommendations,
  newFundingSource,
  setNewFundingSource,
  addFundingSource,
  editingFundingSourceId,
  editingFundingSource,
  setEditingFundingSource,
  saveError,
  getFundingSourceBalance,
  getFundingSourceAvailableCredit,
  getFundingSourceUtilization,
  startEditFundingSource,
  cancelEditFundingSource,
  updateFundingSource,
  deleteFundingSource,
}: FundingSourcesSectionProps) {
  return (
    <section className="beast-panel overflow-hidden">
      <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="money-section-title">Payment &amp; Funding Accounts</h2>
          <p className="mt-1 text-sm text-[#7f8da3]">
            Accounts and liquidity sources used to fund bills, debt payments,
            and future HELOC/PLOC planning.
          </p>
          <p className="mt-2 text-xs text-[#5a6577]">
            These accounts can be selected as the Payment Account a draft leaves from or the Funding Account where its money originated. Credit cards and HELOCs may also appear as debts when they carry a balance.
          </p>
        </div>

        <button
          onClick={() => setShowFundingSources(!showFundingSources)}
          className="beast-button-secondary"
        >
          {showFundingSources ? "Hide" : `Show (${fundingSources.length})`}
        </button>
      </div>

      {showFundingSources && (
        <div className="space-y-5 p-5">
          <FundingSourcesSummaryCards
            activeSourceCount={summary.activeSourceCount}
            liquidFundingTotal={summary.liquidFundingTotal}
            creditAvailableTotal={summary.creditAvailableTotal}
            creditLimitTotal={summary.creditLimitTotal}
            creditUtilizationPercent={summary.creditUtilizationPercent}
          />

          <PaymentSourceCoverage coverage={paymentSourceCoverage} />

          {fundingIntelligence.length > 0 && (
            <FundingIntelligence insights={fundingIntelligence} />
          )}

          {fundingRecommendations.length > 0 && (
            <FundingRecommendations recommendations={fundingRecommendations} />
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 mt-6">
            <input
              value={newFundingSource.name}
              onChange={(e) =>
                setNewFundingSource({
                  ...newFundingSource,
                  name: e.target.value,
                })
              }
              placeholder="Account name"
              className="beast-input"
            />

            <select
              value={newFundingSource.type}
              onChange={(e) =>
                setNewFundingSource({
                  ...newFundingSource,
                  type: e.target.value,
                })
              }
              className="beast-input"
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit_card">Credit Card</option>
              <option value="heloc">HELOC</option>
              <option value="ploc">PLOC</option>
              <option value="cash">Cash</option>
            </select>

            <input
              type="number"
              value={newFundingSource.current_balance}
              onChange={(e) =>
                setNewFundingSource({
                  ...newFundingSource,
                  current_balance: e.target.value,
                })
              }
              placeholder="Current balance"
              className="beast-input"
            />

            <input
              type="number"
              value={newFundingSource.credit_limit}
              onChange={(e) =>
                setNewFundingSource({
                  ...newFundingSource,
                  credit_limit: e.target.value,
                })
              }
              placeholder="Credit limit"
              className="beast-input"
            />

            <input
              type="text"
              readOnly
              value={
                Number.isFinite(Number(newFundingSource.credit_limit)) &&
                Number.isFinite(Number(newFundingSource.current_balance))
                  ? `$${(
                      Number(newFundingSource.credit_limit) -
                      Number(newFundingSource.current_balance)
                    ).toFixed(2)}`
                  : newFundingSource.available_credit || ""
              }
              placeholder="Available credit"
              className="beast-input"
            />

            <input
              type="number"
              value={newFundingSource.interest_rate}
              onChange={(e) =>
                setNewFundingSource({
                  ...newFundingSource,
                  interest_rate: e.target.value,
                })
              }
              placeholder="Interest rate %"
              className="beast-input"
            />
          </div>

          <button onClick={addFundingSource} className="beast-button">
            Add Account
          </button>

          <div className="beast-table-wrap" tabIndex={0} role="region" aria-label="Payment and funding accounts table">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-center">Type</th>
                  <th className="text-right">Balance</th>
                  <th className="text-right">Credit Limit</th>
                  <th className="text-right">Available Credit</th>
                  <th className="text-right">Utilization</th>
                  <th className="text-right">APR</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {fundingSources.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No payment or funding accounts added yet.</td>
                  </tr>
                ) : (
                  fundingSources.map((source) => {
                    const linkedDebt = debts.find(
                      (debt) => debt.id === source.linked_debt_id
                    );
                    const effectiveBalance = getFundingSourceBalance(
                      source,
                      linkedDebt
                    );
                    const effectiveAvailableCredit =
                      getFundingSourceAvailableCredit(source, linkedDebt);
                    const utilization = getFundingSourceUtilization(source);
                    const isEditing = editingFundingSourceId === source.id;
                    const editingBalance = source.linked_debt_id
                      ? effectiveBalance
                      : Number(editingFundingSource.current_balance || 0);
                    const editingAvailableCredit =
                      editingFundingSource.credit_limit !== "" &&
                      Number.isFinite(Number(editingFundingSource.credit_limit))
                        ? Math.max(
                            Number(editingFundingSource.credit_limit) -
                              editingBalance,
                            0
                          )
                        : null;

                    return (
                      <tr key={source.id}>
                        <td className="text-left font-semibold">
                          {isEditing ? (
                            <input
                              value={editingFundingSource.name}
                              onChange={(e) =>
                                setEditingFundingSource({
                                  ...editingFundingSource,
                                  name: e.target.value,
                                })
                              }
                              className="beast-input"
                            />
                          ) : (
                            source.name
                          )}
                        </td>

                        <td className="text-center capitalize">
                          {isEditing ? (
                            <select
                              value={editingFundingSource.type}
                              onChange={(e) =>
                                setEditingFundingSource({
                                  ...editingFundingSource,
                                  type: e.target.value,
                                })
                              }
                              className="beast-input"
                            >
                              <option value="checking">Checking</option>
                              <option value="savings">Savings</option>
                              <option value="credit_card">Credit Card</option>
                              <option value="heloc">HELOC</option>
                              <option value="ploc">PLOC</option>
                              <option value="cash">Cash</option>
                            </select>
                          ) : (
                            source.type.replace("_", " ")
                          )}
                        </td>

                        <td className="text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={
                                source.linked_debt_id
                                  ? String(effectiveBalance)
                                  : editingFundingSource.current_balance
                              }
                              onChange={(e) =>
                                setEditingFundingSource({
                                  ...editingFundingSource,
                                  current_balance: e.target.value,
                                })
                              }
                              readOnly={Boolean(source.linked_debt_id)}
                              className="beast-input text-right"
                            />
                          ) : (
                            `$${effectiveBalance.toFixed(2)}`
                          )}
                        </td>

                        <td className="text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingFundingSource.credit_limit}
                              onChange={(e) =>
                                setEditingFundingSource({
                                  ...editingFundingSource,
                                  credit_limit: e.target.value,
                                })
                              }
                              className="beast-input text-right"
                            />
                          ) : source.credit_limit === null ? (
                            "—"
                          ) : (
                            `$${Number(source.credit_limit || 0).toFixed(2)}`
                          )}
                        </td>

                        <td className="text-right">
                          {isEditing ? (
                            <input
                              type="text"
                              readOnly
                              value={
                                editingAvailableCredit !== null
                                  ? `$${editingAvailableCredit.toFixed(2)}`
                                  : editingFundingSource.available_credit || ""
                              }
                              className="beast-input text-right"
                            />
                          ) : effectiveAvailableCredit === null ? (
                            "—"
                          ) : (
                            `$${effectiveAvailableCredit.toFixed(2)}`
                          )}
                        </td>

                        <td
                          className={`text-right font-semibold ${
                            utilization === null
                              ? "text-[#c7cfdb]"
                              : utilization > 90
                              ? "text-red-300"
                              : utilization > 70
                              ? "text-yellow-300"
                              : "text-green-300"
                          }`}
                        >
                          {utilization === null ? "—" : `${utilization.toFixed(1)}%`}
                        </td>

                        <td className="text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingFundingSource.interest_rate}
                              onChange={(e) =>
                                setEditingFundingSource({
                                  ...editingFundingSource,
                                  interest_rate: e.target.value,
                                })
                              }
                              className="beast-input text-right"
                            />
                          ) : (
                            `${Number(source.interest_rate || 0).toFixed(2)}%`
                          )}
                        </td>

                        <td className="text-center">
                          {isEditing ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateFundingSource(source.id)}
                                  className="beast-button"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditFundingSource}
                                  className="beast-button-secondary"
                                >
                                  Cancel
                                </button>
                              </div>
                              {saveError && (
                                <div className="text-red-400 text-xs text-center max-w-xs">
                                  {saveError}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => startEditFundingSource(source)}
                                className="beast-button-secondary"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteFundingSource(source.id)}
                                className="beast-button-secondary"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
