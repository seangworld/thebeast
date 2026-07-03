import { createClient } from "@/lib/supabase/client";
import type { Dispatch, SetStateAction } from "react";
import {
  addDays,
  addMonthsClamped,
  getCurrentBillCycleDueDate,
  getCurrentDebtCycleDueDate,
  getFrequencyMonthStep,
  toDateInputValue,
} from "../cashflowUtils";

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
      funding_source_id: bill.funding_source_id || null,
    });

    const currentCycleDueDate = getCurrentBillCycleDueDate(bill, cycleMonth);
    const frequency = bill.frequency || "monthly";
    const currentCycleRemaining = Math.max(
      Number(bill.remaining ?? 0),
      Math.max(Number(bill.amount || 0) - Number(bill.paid || 0), 0)
    );
    const remainingAfterPayment = Math.max(currentCycleRemaining - amount, 0);
    const shouldAdvanceNextDue = remainingAfterPayment <= 0;
    let nextDueDateAfterPayment: string | null = null;

    if (shouldAdvanceNextDue) {
      const nextDueDate =
        frequency === "weekly"
          ? addDays(currentCycleDueDate, 7)
          : frequency === "biweekly"
          ? addDays(currentCycleDueDate, 14)
          : addMonthsClamped(
              currentCycleDueDate,
              getFrequencyMonthStep(frequency)
            );
      nextDueDateAfterPayment = toDateInputValue(nextDueDate);
    }

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
        console.warn("Warning: Could not persist bill next due date:", updateError);
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

  async function updateBillFundingSource(
    billId: string,
    fundingSourceId: string
  ) {
    const supabase = createClient();

    await supabase
      .from("bill_events")
      .update({
        funding_source_id: fundingSourceId || null,
      })
      .eq("id", billId);

    await load();
  }

  async function updateDebtFundingSource(
    debtId: string,
    fundingSourceId: string
  ) {
    const supabase = createClient();

    await supabase
      .from("debts")
      .update({
        funding_source_id: fundingSourceId || null,
      })
      .eq("id", debtId);

    await load();
  }

  async function applyDebtPayment(debt: any, amount: number) {
    const supabase = createClient();

    if (!debt?.id) {
      console.error("Invalid debt: missing id");
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
      const newBalance = Math.max(currentBalance - amount, 0);
      const userId = await getUserId();

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const currentCycleDueDate = getCurrentDebtCycleDueDate(debt);
      const cycleDueDate = toDateInputValue(currentCycleDueDate);
      const minimumPayment = Number(debt.minimum_payment || 0);
      const cycleKey = `${debt.id}||${cycleDueDate}`;

      const debtPaymentsByDebtAndCycle: Record<string, number> = {};
      for (const payment of debtPaymentRows) {
        const key = `${payment.debt_id}||${payment.cycle_due_date}`;
        debtPaymentsByDebtAndCycle[key] =
          Number(debtPaymentsByDebtAndCycle[key] || 0) + Number(payment.amount || 0);
      }

      const currentCyclePaid = Number(debtPaymentsByDebtAndCycle[cycleKey] || 0);
      const totalCyclePaid = currentCyclePaid + amount;
      const shouldAdvanceDueDate =
        newBalance === 0 || totalCyclePaid >= minimumPayment;
      let nextDueDateAfterPayment: string | null = null;

      if (shouldAdvanceDueDate) {
        const nextCycleDueDate = addMonthsClamped(currentCycleDueDate, 1);
        nextDueDateAfterPayment = toDateInputValue(nextCycleDueDate);
      }

      const { error: insertError } = await supabase
        .from("debt_payments")
        .insert({
          user_id: userId,
          debt_id: debt.id,
          amount,
          payment_date: new Date().toISOString().slice(0, 10),
          cycle_due_date: cycleDueDate,
          funding_source_id: debt.funding_source_id || null,
        });

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

      const { error: updateError } = await supabase
        .from("debts")
        .update(updatePayload)
        .eq("id", debt.id);

      if (updateError) {
        throw new Error(`Failed to update debt: ${updateError.message}`);
      }

      setDebtPayments((prev) => ({
        ...prev,
        [debt.id]: "",
      }));

      setDebtPaymentStatus((prev) => ({
        ...prev,
        [debt.id]: {
          type: "success",
          message: `Payment of $${amount.toFixed(2)} applied successfully.`,
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
      console.error("Error applying debt payment:", error);
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
    updateBillFundingSource,
    updateDebtFundingSource,
    applyDebtPayment,
  };
}
