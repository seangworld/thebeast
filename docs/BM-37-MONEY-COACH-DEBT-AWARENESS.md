# BM-37 Money Coach Debt Awareness

Money Coach derives debt attention from owner-scoped debt and payment records.
It recognizes upcoming, due-soon, due-today, overdue, and missed payment states;
the latest recorded interest-rate change; payment history; and payment-backed
payoff progress. It does not infer lender fees, delinquency reporting, or an
external payment result.

## Financial Health scoring impact

Late debt affects the existing 20% Debt dimension. BeastMoney first calculates
the utilization and debt-service score, then subtracts a disclosed timeliness
penalty:

- 10 Debt-dimension points for each overdue debt.
- 15 Debt-dimension points for each missed debt payment.
- The combined penalty is capped at 40 Debt-dimension points.
- The Debt dimension cannot fall below zero.

Because Debt is 20% of the overall score, the maximum direct overall reduction
from this penalty is eight points when all eight score dimensions are available.
Unavailable dimensions remain excluded from the denominator. This is a
financial-wellness measure, not a credit score.

## Planning effects

Money Coach explains that unresolved required payments can move the modeled
payoff date and interest cost. Velocity Banking treats debt minimums as near-term
cash obligations and should resolve overdue payments before modeling another
credit-line chunk. All projections recalculate from current BeastMoney records.
