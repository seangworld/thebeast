import { createClient } from "@/lib/supabase/client";
import {
  applyBillPartialPayment,
  applyDebtPaymentToCycle,
} from "@/lib/financialPayments";
import type { Dispatch, SetStateAction } from "react";
import {
  getCurrentBillCycleDueDate,
  getCurrentDebtCycleDueDate,
} from "../cashflowUtils";
import type { PaymentConfigurationRecord } from "@/lib/paymentConfiguration";
import { resolveDebtLifecycle } from "@/lib/debtLifecycle";
import { reportClientOperationFailure } from "@/lib/clientDiagnostics";

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
  debtPaymentRows: any[];
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
  debtPaymentRows,
  getUserId,
  load,
  setPartialPayments,
  setDebtPayments,
  setDebtPaymentStatus,
  setApplyingDebtPaymentId,
}: UseCashFlowPaymentActionsInput) {
  async function addBillPayment(bill: any, amount: number) {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;
    if (!bill?.id) return;
    if (amount <= 0) return;

    await supabase.from("bill_payments").insert({
      user_id: userId,
      bill_id: bill.id,
      amount_paid: amount,
      payment_date: new Date().toISOString().slice(0, 10),
      cycle_month: cycleMonth,
      payment_account_id: bill.payment_account_id || bill.funding_source_id || null,
      funding_account_type:
        bill.funding_account_type || (bill.funding_source_id ? "account" : null),
      funding_account_id:
        bill.funding_account_id || bill.funding_source_id || null,
      funding_strategy_id: bill.funding_strategy_id || "direct_payment",
      funding_source_id: bill.funding_source_id || null,
    });

    const currentCycleDueDate = getCurrentBillCycleDueDate(bill, cycleMonth);
    const frequency = bill.frequency || "monthly";
    const paymentResult = applyBillPartialPayment({
      amountDue: Number(bill.amount || 0),
      alreadyPaid: Number(bill.paid || 0),
      remaining: Number(bill.remaining ?? 0),
      paymentAmount: amount,
      currentCycleDueDate,
      frequency,
    });
    const nextDueDateAfterPayment = paymentResult.nextDueDateAfterPayment;

    const updatePayload: Record<string, any> = {};
    if (nextDueDateAfterPayment) {
      updatePayload.assigned_income_date = null;
      updatePayload.next_due_date_after_payment = nextDueDateAfterPayment;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from("bill_events")
        .update(updatePayload)
        .eq("id", bill.id);
      if (updateError) {
        reportClientOperationFailure({
          module: "beastmoney",
          operation: "bill_due_date_save",
          error: updateError,
        });
      }
    }

    setPartialPayments((prev) => ({
      ...prev,
      [bill.id]: "",
    }));

    await load();
  }

  async function markBillPaid(bill: any) {
    const remaining = Number(bill.remaining || 0);
    if (remaining <= 0) return;

    await addBillPayment(bill, remaining);
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

    if (!debt?.id) {
      reportClientOperationFailure({
        module: "beastmoney",
        operation: "debt_payment_apply",
        category: "validation_error",
      });
      return;
    }

    if (amount <= 0) {
      setDebtPaymentStatus((prev) => ({
        ...prev,
        [debt.id]: {
          type: "error",
          message: "Payment amount must be greater than 0.",
        },
      }));
      return;
    }

    setApplyingDebtPaymentId(debt.id);

    try {
      const currentBalance = Number(debt.balance || 0);
      const recordedAmount = Math.min(amount, Math.max(currentBalance, 0));
      const newBalance = Math.max(currentBalance - recordedAmount, 0);
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
      const minimumPayment = Number(debt.minimum_payment || 0);
      const cycleKey = `${debt.id}||${cycleDueDate}`;

      const debtPaymentsByDebtAndCycle: Record<string, number> = {};
      for (const payment of debtPaymentRows) {
        if (payment.reversed_at) continue;
        const key = `${payment.debt_id}||${payment.cycle_due_date}`;
        debtPaymentsByDebtAndCycle[key] =
          Number(debtPaymentsByDebtAndCycle[key] || 0) + Number(payment.amount || 0);
      }

      const paymentResult = applyDebtPaymentToCycle({
        balance: currentBalance,
        currentCyclePaid: Number(debtPaymentsByDebtAndCycle[cycleKey] || 0),
        paymentAmount: recordedAmount,
        minimumPayment,
        currentCycleDueDate,
      });
      const nextDueDateAfterPayment = paymentResult.nextDueDateAfterPayment;

      const { data: insertedPayment, error: insertError } = await supabase
        .from("debt_payments")
        .insert({
          user_id: userId,
          debt_id: debt.id,
          amount: recordedAmount,
          payment_date: new Date().toISOString().slice(0, 10),
          cycle_due_date: cycleDueDate,
          payment_account_id: debt.payment_account_id || debt.funding_source_id || null,
          funding_account_type:
            debt.funding_account_type || (debt.funding_source_id ? "account" : null),
          funding_account_id:
            debt.funding_account_id || debt.funding_source_id || null,
          funding_strategy_id: debt.funding_strategy_id || "direct_payment",
          funding_source_id: debt.funding_source_id || null,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Failed to insert payment: ${insertError.message}`);
      }

      const updatePayload: Record<string, any> = {
        balance: newBalance,
      };
      if (nextDueDateAfterPayment) {
        updatePayload.assigned_income_date = null;
        updatePayload.next_due_date_after_payment = nextDueDateAfterPayment;
      }
      const lifecycle = resolveDebtLifecycle({
        balance: newBalance,
        paymentBehavior: debt.payment_behavior,
        isArchived: debt.is_archived,
        currentStatus: debt.lifecycle_status,
        source: "beast_payment",
        effectiveDate: new Date().toISOString().slice(0, 10),
        reminderEnabled: debt.reminder_enabled,
        reminderEnabledBeforePayoff: debt.reminder_enabled_before_payoff,
        lifecycleAutoArchived: debt.lifecycle_auto_archived,
      });
      Object.assign(updatePayload, lifecycle.update);

      const { error: updateError } = await supabase
        .from("debts")
        .update(updatePayload)
        .eq("id", debt.id);

      if (updateError) {
        throw new Error(`Failed to update debt: ${updateError.message}`);
      }
      if (lifecycle.changed) {
        const { error: lifecycleError } = await supabase.from("debt_lifecycle_events").insert({
          user_id: userId,
          debt_id: debt.id,
          previous_status: debt.lifecycle_status || (debt.is_archived ? "archived" : "active_balance"),
          next_status: lifecycle.status,
          source: "beast_payment",
          balance: newBalance,
          reason: lifecycle.reason,
          payment_id: insertedPayment?.id || null,
        });
        if (lifecycleError) throw new Error(`Failed to preserve debt lifecycle history: ${lifecycleError.message}`);
      }

      setDebtPayments((prev) => ({
        ...prev,
        [debt.id]: "",
      }));

      setDebtPaymentStatus((prev) => ({
        ...prev,
        [debt.id]: {
          type: "success",
          message: `Payment of $${recordedAmount.toFixed(2)} applied successfully.`,
        },
      }));

      setTimeout(() => {
        setDebtPaymentStatus((prev) => ({
          ...prev,
          [debt.id]: { type: null, message: "" },
        }));
      }, 3000);

      await load();
    } catch (error) {
      reportClientOperationFailure({
        module: "beastmoney",
        operation: "debt_payment_apply",
        error,
      });
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to apply payment. Please try again.";

      setDebtPaymentStatus((prev) => ({
        ...prev,
        [debt.id]: {
          type: "error",
          message: errorMessage,
        },
      }));
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
