export type SuggestedAttackPaymentResult = {
  ok: boolean;
  message: string;
};

export async function applySuggestedDebtAttackCommand<TDebt>(input: {
  debt: TDebt;
  amount: number;
  applyPayment: (
    debt: TDebt,
    amount: number
  ) => Promise<SuggestedAttackPaymentResult>;
}): Promise<SuggestedAttackPaymentResult> {
  const result = await input.applyPayment(input.debt, input.amount);
  if (!result.ok) return result;
  return { ok: true, message: "Suggested attack recorded." };
}
