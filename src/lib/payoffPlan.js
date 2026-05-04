function getSortedDebts(debts, strategy) {
  const activeDebts = debts.filter((debt) => debt.balance > 0)

  if (strategy === "snowball") {
    return activeDebts.sort((a, b) => a.balance - b.balance)
  }

  if (strategy === "avalanche") {
    return activeDebts.sort((a, b) => b.interest_rate - a.interest_rate)
  }

  if (strategy === "velocity") {
    return activeDebts.sort((a, b) => {
      const aScore = (a.minimum_payment || 0) / (a.balance || 1)
      const bScore = (b.minimum_payment || 0) / (b.balance || 1)
      return bScore - aScore
    })
  }

  return activeDebts
}

export function buildPayoffPlan(debts, strategy = "minimum", extraMonthlyPayment = 0) {
  if (!Array.isArray(debts) || debts.length === 0) return []

  const workingDebts = debts
    .map((debt) => ({
      ...debt,
      balance: Number(debt.balance || 0),
      originalBalance: Number(debt.balance || 0),
      minimum_payment: Number(debt.minimum_payment || debt.min_payment || 0),
      interest_rate: Number(debt.interest_rate || 0),
      isPaidOff: false,
    }))
    .filter((debt) => debt.balance > 0)

  const plan = []
  let month = 1
  let recoveredMinimums = 0

  while (workingDebts.some((debt) => debt.balance > 0) && month <= 600) {
    let monthInterest = 0
    let monthPrincipal = 0
    let newlyRecoveredMinimums = 0
    const startingBalance = workingDebts.reduce(
      (sum, debt) => sum + debt.balance,
      0
    )

    // Add monthly interest
    for (const debt of workingDebts) {
      if (debt.balance <= 0) continue

      const monthlyRate = debt.interest_rate / 100 / 12
      const interest = debt.balance * monthlyRate

      debt.balance += interest
      monthInterest += interest
    }

    // Pay minimum payments
    for (const debt of workingDebts) {
      if (debt.balance <= 0) continue

      const payment = Math.min(debt.minimum_payment, debt.balance)
      debt.balance -= payment
      monthPrincipal += payment

      if (debt.balance <= 0 && !debt.isPaidOff) {
        debt.balance = 0
        debt.isPaidOff = true
        newlyRecoveredMinimums += debt.minimum_payment
      }
    }

    // Apply extra + recovered minimums to strategy target
    let attackPool = Number(extraMonthlyPayment || 0) + recoveredMinimums
    const startingAttackPool = attackPool

    while (attackPool > 0 && workingDebts.some((debt) => debt.balance > 0)) {
      const sortedDebts = getSortedDebts(workingDebts, strategy)
      const targetDebt = sortedDebts[0]

      if (!targetDebt) break

      const extraPayment = Math.min(attackPool, targetDebt.balance)

      targetDebt.balance -= extraPayment
      attackPool -= extraPayment
      monthPrincipal += extraPayment

      if (targetDebt.balance <= 0 && !targetDebt.isPaidOff) {
        targetDebt.balance = 0
        targetDebt.isPaidOff = true
        newlyRecoveredMinimums += targetDebt.minimum_payment
      }
    }

    recoveredMinimums += newlyRecoveredMinimums

    const sortedDebtsAfterPayment = getSortedDebts(workingDebts, strategy)
    const nextTargetDebt = sortedDebtsAfterPayment[0]

    const remainingBalance = workingDebts.reduce(
      (sum, debt) => sum + debt.balance,
      0
    )

    plan.push({
      month,
      targetDebtName: nextTargetDebt ? nextTargetDebt.name : "None",
      startingBalance,
      principalPaid: monthPrincipal,
      interestPaid: monthInterest,
      recoveredMinimums,
      attackPool: startingAttackPool,
      endingBalance: remainingBalance,
      remainingBalance,
    })

    month++
  }

  return plan
}