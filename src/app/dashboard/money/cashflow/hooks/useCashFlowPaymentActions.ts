import { createClient } from "@/lib/supabase/client";
import type { Dispatch, SetStateAction } from "react";
import { useRef } from "react";
import { getCurrentDebtCycleDueDate } from "../cashflowUtils";
import type { PaymentConfigurationRecord } from "@/lib/paymentConfiguration";
import { reportClientOperationFailure } from "@/lib/clientDiagnostics";
import {
  AtomicFinancialCommandError,
  createFinancialOperationId,
  recordBillPaymentAtomic,
  recordDebtPaymentAtomic,
} from "@/lib/atomicFinancialCommands";
import { BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE } from "@/lib/beastMoneyPaymentWriteGate";

type PaymentConfigurationPatch = Partial<
  Pick<
    PaymentConfigurationRecord,
    | "payment_account_id"
    | "funding_account_type"
    | "funding_account_id"
    | "funding_strategy_id"
  >
>;

type UseCashFlowPaymentActionsInput = {
  cycleMonth: string;
  paymentWritesAvailable: boolean;
  getUserId: () => Promise<string | undefined>;
  load: () => Promise<void>;
  setPartialPayments: Dispatch<SetStateAction<Record<string, string>>>;
  setDebtPayments: Dispatch<SetStateAction<Record<string, string>>>;
  setDebtPaymentStatus: Dispatch<
    SetStateAction<
      Record<string, { type: "error" | "success" | null; message: string }>
    >
  >;
  setApplyingDebtPaymentId: Dispatch<SetStateAction<string | null>>;
};

export function useCashFlowPaymentActions({
  cycleMonth,
  paymentWritesAvailable,
  getUserId,
  load,
  setPartialPayments,
  setDebtPayments,
  setDebtPaymentStatus,
  setApplyingDebtPaymentId,
}: UseCashFlowPaymentActionsInput) {
  const pendingDebtOperations = useRef(new Map<string, string>());

  async function addBillPayment(bill: any, amount: number, operationId: string) {
    const supabase = createClient();
    const userId = await getUserId();

    if (!paymentWritesAvailable) {
      return { ok: false, message: BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE };
    }

    if (!userId || !bill?.id || amount <= 0) {
      return { ok: false, message: "Enter a payment amount greater than zero." };
    }

    try {
      await recordBillPaymentAtomic(supabase, {
        operationId,
        billId: bill.id,
        amount,
        paymentDate: new Date().toISOString().slice(0, 10),
        cycleMonth,
      });
      setPartialPayments((prev) => ({ ...prev, [bill.id]: "" }));
      await load();
      return { ok: true, message: "Bill payment recorded and due state refreshed." };
    } catch (error) {
      reportClientOperationFailure({
        module: "beastmoney",
        operation: "bill_payment_apply",
        category: error instanceof AtomicFinancialCommandError ? error.category : "unknown_error",
      });
      return {
        ok: false,
        message:
          error instanceof AtomicFinancialCommandError &&
          error.category === "maintenance_error"
            ? BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE
            : error instanceof AtomicFinancialCommandError &&
                error.category === "validation_error"
              ? "This bill occurrence is already paid or has changed. Refresh and try again."
            : "Unable to record the bill payment. Your entry was preserved; please retry.",
      };
    }
  }

  async function markBillPaid(bill: any, operationId: string) {
    const remaining = Number(bill.remaining || 0);
    if (remaining <= 0) {
      return { ok: false, message: "This bill is already paid for the current cycle." };
    }

    return addBillPayment(bill, remaining, operationId);
  }

  async function updateBillIncomeDate(
    billId: string,
    assignedIncomeDate: string
  ) {
    const supabase = createClient();

    await supabase
      .from("bill_events")
      .update({
        assigned_income_date: assignedIncomeDate || null,
      })
      .eq("id", billId);

    await load();
  }

  async function updateDebtIncomeDate(
    debtId: string,
    assignedIncomeDate: string
  ) {
    const supabase = createClient();

    await supabase
      .from("debts")
      .update({
        assigned_income_date: assignedIncomeDate || null,
      })
      .eq("id", debtId);

    await load();
  }

  async function updateBillPaymentConfiguration(
    billId: string,
    patch: PaymentConfigurationPatch
  ) {
    const supabase = createClient();
    const legacyPatch =
      patch.funding_account_type === "account" && patch.funding_account_id
        ? { funding_source_id: patch.funding_account_id }
        : "funding_account_type" in patch
          ? { funding_source_id: null }
          : {};

    await supabase
      .from("bill_events")
      .update({ ...patch, ...legacyPatch })
      .eq("id", billId);

    await load();
  }

  async function updateDebtPaymentConfiguration(
    debtId: string,
    patch: PaymentConfigurationPatch
  ) {
    const supabase = createClient();
    const legacyPatch =
      patch.funding_account_type === "account" && patch.funding_account_id
        ? { funding_source_id: patch.funding_account_id }
        : "funding_account_type" in patch
          ? { funding_source_id: null }
          : {};

    await supabase
      .from("debts")
      .update({ ...patch, ...legacyPatch })
      .eq("id", debtId);

    await load();
  }

  async function applyDebtPayment(debt: any, amount: number) {
    const supabase = createClient();

    if (!paymentWritesAvailable) {
      if (debt?.id) {
        setDebtPaymentStatus((prev) => ({
          ...prev,
          [debt.id]: {
            type: "error",
            message: BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE,
          },
        }));
      }
      return { ok: false, message: BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE };
    }

    if (!debt?.id) {
      reportClientOperationFailure({
        module: "beastmoney",
        operation: "debt_payment_apply",
        category: "validation_error",
      });
      return { ok: false, message: "Unable to identify the selected debt." };
    }

    if (amount <= 0) {
      setDebtPaymentStatus((prev) => ({
        ...prev,
        [debt.id]: {
          type: "error",
          message: "Payment amount must be greater than 0.",
        },
      }));
      return { ok: false, message: "Payment amount must be greater than 0." };
    }

    setApplyingDebtPaymentId(debt.id);

    try {
      const userId = await getUserId();

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const currentCycleDueDate = getCurrentDebtCycleDueDate(debt);
      const cycleDueDate = `${currentCycleDueDate.getFullYear()}-${String(
        currentCycleDueDate.getMonth() + 1
      ).padStart(2, "0")}-${String(currentCycleDueDate.getDate()).padStart(
        2,
        "0"
      )}`;
      const paymentDate = new Date().toISOString().slice(0, 10);
      const operationKey = JSON.stringify({ debtId: debt.id, amount, paymentDate, cycleDueDate });
      const operationId = pendingDebtOperations.current.get(operationKey) || createFinancialOperationId();
      pendingDebtOperations.current.set(operationKey, operationId);
      const result = await recordDebtPaymentAtomic(supabase, {
        operationId,
        debtId: debt.id,
        amount,
        paymentDate,
        cycleDueDate,
        fundingSourceId: null,
        notes: "",
        actionType: "custom",
      });
      pendingDebtOperations.current.delete(operationKey);

      setDebtPayments((prev) => ({
        ...prev,
        [debt.id]: "",
      }));

      setDebtPaymentStatus((prev) => ({
        ...prev,
        [debt.id]: {
          type: "success",
          message: `Payment of $${result.recordedAmount.toFixed(2)} applied successfully.`,
        },
      }));

      setTimeout(() => {
        setDebtPaymentStatus((prev) => ({
          ...prev,
          [debt.id]: { type: null, message: "" },
        }));
      }, 3000);

      await load();
      return { ok: true, message: "Debt payment recorded. Money calculations and surfaces refreshed." };
    } catch (error) {
      reportClientOperationFailure({
        module: "beastmoney",
        operation: "debt_payment_apply",
        category: error instanceof AtomicFinancialCommandError ? error.category : "unknown_error",
      });
      const errorMessage =
        error instanceof AtomicFinancialCommandError &&
        error.category === "maintenance_error"
          ? BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE
          : "Unable to record the debt payment. Your entry was preserved; please retry.";

      setDebtPaymentStatus((prev) => ({
        ...prev,
        [debt.id]: {
          type: "error",
          message: errorMessage,
        },
      }));
      return { ok: false, message: errorMessage };
    } finally {
      setApplyingDebtPaymentId(null);
    }
  }

  return {
    addBillPayment,
    markBillPaid,
    updateBillIncomeDate,
    updateDebtIncomeDate,
    updateBillPaymentConfiguration,
    updateDebtPaymentConfiguration,
    applyDebtPayment,
  };
}
