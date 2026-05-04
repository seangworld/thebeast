export type PayoffStrategy = "snowball" | "avalanche";

export type PayoffDebt = {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
};

export type PayoffMonth = {
  month: number;
  target: string;
  starting_balance: number;
  interest_paid: number;
  principal_paid: number;
  total_payment: number;
  remaining_debt: number;
};

export type PayoffResult = {
  months_to_payoff: number;
  total_interest: number;
  total_paid: number;
  first_target: string;
  payoff_months: PayoffMonth[];
};

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function chooseTarget(debts: PayoffDebt[], strategy: PayoffStrategy) {
  const active = debts.filter((d) => d.balance > 0);

  if (active.length === 0) return null;

  if (strategy === "avalanche") {
    return [...active].sort(
      (a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0)
    )[0];
  }

  return [...active].sort(
    (a, b) => Number(a.balance || 0) - Number(b.balance || 0)
  )[0];
}

export function simulatePayoffPlan({
  debts,
  strategy,
  extraPayment,
}: {
  debts: PayoffDebt[];
  strategy: PayoffStrategy;
  extraPayment: number;
}): PayoffResult {
  const workingDebts: PayoffDebt[] = debts.map((debt) => ({
    ...debt,
    balance: money(Number(debt.balance || 0)),
    minimum_payment: money(Number(debt.minimum_payment || 0)),
    interest_rate: Number(debt.interest_rate || 0),
  }));

  const baseMonthlyPayment = money(
    workingDebts.reduce((sum, debt) => sum + debt.minimum_payment, 0) +
      Number(extraPayment || 0)
  );

  const firstTarget = chooseTarget(workingDebts, strategy);

  if (!firstTarget || baseMonthlyPayment <= 0) {
    return {
      months_to_payoff: 0,
      total_interest: 0,
      total_paid: 0,
      first_target: "—",
      payoff_months: [],
    };
  }

  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const payoffMonths: PayoffMonth[] = [];

  while (workingDebts.some((d) => d.balance > 0) && month < 600) {
    month += 1;

    const startingBalance = money(
      workingDebts.reduce((sum, debt) => sum + debt.balance, 0)
    );

    let monthlyInterest = 0;

    for (const debt of workingDebts) {
      if (debt.balance <= 0) continue;

      const monthlyRate = Number(debt.interest_rate || 0) / 100 / 12;
      const interest = money(debt.balance * monthlyRate);

      debt.balance = money(debt.balance + interest);
      monthlyInterest = money(monthlyInterest + interest);
    }

    const target = chooseTarget(workingDebts, strategy);
    if (!target) break;

    let paymentPool = baseMonthlyPayment;
    let monthlyPaid = 0;

    for (const debt of workingDebts) {
      if (debt.balance <= 0) continue;
      if (debt.id === target.id) continue;

      const payment = Math.min(debt.minimum_payment, debt.balance);

      debt.balance = money(debt.balance - payment);
      paymentPool = money(paymentPool - payment);
      monthlyPaid = money(monthlyPaid + payment);
    }

    const targetPayment = Math.min(Math.max(paymentPool, 0), target.balance);

    target.balance = money(target.balance - targetPayment);
    monthlyPaid = money(monthlyPaid + targetPayment);

    const remainingDebt = money(
      workingDebts.reduce((sum, debt) => sum + debt.balance, 0)
    );

    totalInterest = money(totalInterest + monthlyInterest);
    totalPaid = money(totalPaid + monthlyPaid);

    payoffMonths.push({
      month,
      target: target.name,
      starting_balance: startingBalance,
      interest_paid: monthlyInterest,
      principal_paid: money(monthlyPaid - monthlyInterest),
      total_payment: monthlyPaid,
      remaining_debt: remainingDebt,
    });
  }

  return {
    months_to_payoff: payoffMonths.length,
    total_interest: totalInterest,
    total_paid: totalPaid,
    first_target: firstTarget.name,
    payoff_months: payoffMonths,
  };
}