import { useState } from "react";

export function useCashFlowPaymentState() {
  const [debtPayments, setDebtPayments] = useState<Record<string, string>>({});
  const [partialPayments, setPartialPayments] = useState<Record<string, string>>(
    {}
  );
  const [debtPaymentStatus, setDebtPaymentStatus] = useState<
    Record<string, { type: "error" | "success" | null; message: string }>
  >({});
  const [applyingDebtPaymentId, setApplyingDebtPaymentId] = useState<
    string | null
  >(null);
  const [isApplyingSuggestedAttack, setIsApplyingSuggestedAttack] =
    useState(false);
  const [suggestedAttackMessage, setSuggestedAttackMessage] = useState<
    string | null
  >(null);

  return {
    debtPayments,
    setDebtPayments,
    partialPayments,
    setPartialPayments,
    debtPaymentStatus,
    setDebtPaymentStatus,
    applyingDebtPaymentId,
    setApplyingDebtPaymentId,
    isApplyingSuggestedAttack,
    setIsApplyingSuggestedAttack,
    suggestedAttackMessage,
    setSuggestedAttackMessage,
  };
}
