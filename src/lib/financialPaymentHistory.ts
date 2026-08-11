export type ReversibleDebtPayment = {
  reversed_at?: string | null;
  action_type?: string | null;
};

export function isActiveDebtPayment(payment: ReversibleDebtPayment) {
  return !payment.reversed_at;
}

export function activeDebtPayments<T extends ReversibleDebtPayment>(
  payments: readonly T[]
) {
  return payments.filter(isActiveDebtPayment);
}
