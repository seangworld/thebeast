# BM-BUG-002 — Funding Source Audit & Recommendation Trace

Audit date: 2026-07-18 EDT

Environment: production BeastMoney snapshot replayed through the committed recommendation engines

Mode: diagnostic only; no recommendation, calculation, UI, schema, Supabase, or persistence changes

## Public-report privacy boundary

This public report preserves the formulas, execution path, root cause, architectural findings, and validation evidence from the production audit. Owner-specific account names, creditor names, balances, limits, income, expenses, available credit, payment amounts, rates, and dates are intentionally replaced with generic labels and symbolic placeholders.

The private audit verified every intermediate value against live production records. The public version does not contain enough information to reconstruct those records.

## Result

The displayed recommendation was not supported by its cash-only calculation. The recommendation engine instead selected a much larger aggregate funding-source capacity and then capped the recommendation at the target debt's balance.

The verified execution path is:

```text
Monthly surplus                         <MONTHLY_SURPLUS>
Current available cash                  <CURRENT_AVAILABLE_CASH>
Projected available cash                <PROJECTED_AVAILABLE_CASH>
Safe cash attack                        <SAFE_CASH_ATTACK>
Aggregate funding-source capacity       <AGGREGATE_FUNDING_CAPACITY>
Selected safe attack amount             <AGGREGATE_FUNDING_CAPACITY>
Target debt balance cap                 <TARGET_DEBT_BALANCE>
Final recommendation                    <TARGET_DEBT_BALANCE>
```

The controlling relationship was:

```text
AGGREGATE_FUNDING_CAPACITY > SAFE_CASH_ATTACK
AGGREGATE_FUNDING_CAPACITY > TARGET_DEBT_BALANCE
```

Therefore:

```text
selected capacity = AGGREGATE_FUNDING_CAPACITY
final recommendation = TARGET_DEBT_BALANCE
```

## Production data source

The audit used the production rows belonging to the account that owned the target revolving debt. The dashboard loads these tables in `src/app/dashboard/money/page.tsx`:

- `debts`
- `bill_events`
- `income_events`
- active `funding_sources`
- `cash_settings`
- `debt_settings`

The replay used the dashboard's live-view date, an empty in-memory Coach correction set, and the dashboard's hard-coded 30-day cash window. Unsaved Coach corrections and a browser-selected simulation date are client-only and are not production records, so they were not part of the database audit.

## Funding-source audit

The dashboard query includes only rows whose `is_active` value is `true`. None of the audited sources had a stored `max_utilization_percent`. The dashboard did not pass a funding-source utilization guardrail, so the engine applied its code fallback of `100%` to every active source with a positive credit limit.

The engine's per-source calculation is:

```text
available credit used = stored available_credit, when truthy;
                        otherwise credit_limit - current_balance

utilization capacity = credit_limit × applied utilization percentage
                       - current_balance

contribution = max(
  min(available credit used, utilization capacity) - emergency reserve,
  0
)
```

The verified production source structure is preserved below without live values:

| Active source | Canonical type | Credit limit | Current balance | Stored available credit | Configured utilization | Applied limit | Calculated capacity | Reserve applied | Contribution |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Primary cash account | checking | `<CASH_LIMIT>` | `<CASH_BALANCE>` | `<CASH_AVAILABLE>` | none | not evaluated | `<ZERO_CREDIT_CAPACITY>` | `<RESERVE>` | `<ZERO_CONTRIBUTION>` |
| Revolving source A | credit card | `<CARD_A_LIMIT>` | `<CARD_A_BALANCE>` | `<CARD_A_AVAILABLE>` | none | 100% default | `<CARD_A_CAPACITY>` | `<RESERVE>` | `<CARD_A_CAPACITY>` |
| Target revolving source | credit card | `<TARGET_CARD_LIMIT>` | `<TARGET_CARD_BALANCE>` | `<TARGET_CARD_AVAILABLE>` | none | 100% default | `<TARGET_CARD_CAPACITY>` | `<RESERVE>` | `<TARGET_CARD_CAPACITY>` |
| Secured source A | HELOC | `<SECURED_LIMIT>` | `<SECURED_BALANCE>` | `<SECURED_AVAILABLE>` | none | 100% default | `<SECURED_CAPACITY>` | `<RESERVE>` | `<SECURED_CAPACITY>` |
| **Total** |  |  |  |  |  |  |  |  | **`<AGGREGATE_FUNDING_CAPACITY>`** |

For each nonzero active credit source, the stored available-credit value equaled `credit_limit - current_balance`. The calculation did not distinguish cash from borrowed capacity and did not exclude the target debt's own revolving funding-source record.

## Related inactive funding-source record

The audit found a second HELOC-like record that was excluded only because it was inactive:

| Source | Type | Active | Credit limit | Current balance | Stored available credit | Derived unused credit | Difference | APR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Secured source B | HELOC | no | `<SAME_SECURED_LIMIT>` | `<CONFLICTING_BALANCE>` | `<CONFLICTING_AVAILABLE>` | `<DERIVED_UNUSED_CREDIT>` | `<STORED_DERIVED_DIFFERENCE>` | `<SAME_APR>` |

The inactive and active HELOC-like rows shared the same source type, limit, and APR but contained conflicting balances and available-credit values. Neither was linked to a debt row. The active row was included in the dashboard funding calculation; the inactive row contributed nothing.

The repository could not determine whether the rows represented two physical accounts. It could verify that production contained two stored HELOC representations with matching structural identifiers and conflicting financial state.

## Cash audit

### Monthly income

The engine normalized each active, non-archived income record before rounding the aggregate total:

| Generic income | Stored amount | Frequency | Monthly calculation |
| --- | --- | --- | --- |
| Income source A | `<INCOME_A>` | biweekly | `INCOME_A × 26 ÷ 12` |
| Income source B | `<INCOME_B>` | biweekly | `INCOME_B × 26 ÷ 12` |
| Income source C | `<INCOME_C>` | monthly | `INCOME_C` |
| **Engine-rounded monthly income** |  |  | **`<MONTHLY_INCOME>`** |

The aggregate calculation was:

```text
MONTHLY_INCOME = roundMoney(
  INCOME_A × 26 ÷ 12
  + INCOME_B × 26 ÷ 12
  + INCOME_C
)
```

### Monthly bills

The live records were reduced to the following frequency structure:

| Bill group | Frequency | Monthly treatment |
| --- | --- | --- |
| Standard recurring obligations | monthly | full stored amount |
| Periodic obligation A | every 2 months | full stored amount |
| Periodic obligation B | every 3 months | full stored amount |
| Periodic obligation C | every 6 months | full stored amount |
| **Monthly bills used** |  | **`<MONTHLY_BILLS>`** |

`normalizeRecurringAmountToMonthly` recognizes weekly, biweekly, semi-monthly, and annual/yearly values. It does not recognize `every_2_months`, `every_3_months`, or `every_6_months`, so those values receive the default multiplier of `1`.

That behavior overstates the monthly equivalent of periodic bills. It did not create the oversized payoff recommendation because the funding-source branch, rather than cash-only capacity, controlled the final value.

### Monthly debt minimums

The engine included minimum payments for every active debt with a positive balance:

```text
MONTHLY_DEBT_MINIMUMS = sum(active positive-balance debt.minimum_payment)
```

Zero-balance, negative-balance, and archived debts were excluded.

### Cash-flow values

| Value | Redacted production replay |
| --- | --- |
| Monthly income | `<MONTHLY_INCOME>` |
| Monthly bills | `<MONTHLY_BILLS>` |
| Monthly debt minimums | `<MONTHLY_DEBT_MINIMUMS>` |
| Scheduled transfers | `<SCHEDULED_TRANSFERS>` |
| Monthly savings contributions | `<SAVINGS_CONTRIBUTIONS>` |
| Recurring monthly surplus | `<MONTHLY_SURPLUS>` |
| Starting cash | `<STARTING_CASH>` |
| Protected cash buffer | `<PROTECTED_BUFFER>` |
| Emergency reserve | `<EMERGENCY_RESERVE>` |
| Required cash | `<REQUIRED_CASH>` |
| Current available cash | `<CURRENT_AVAILABLE_CASH>` |
| Planning-window income | `<WINDOW_INCOME>` |
| Planning-window obligations | `<WINDOW_OBLIGATIONS>` |
| Projected cash balance | `<PROJECTED_CASH_BALANCE>` |
| Projected available cash | `<PROJECTED_AVAILABLE_CASH>` |
| Safe cash attack | `<SAFE_CASH_ATTACK>` |

The recurring surplus formula is:

```text
MONTHLY_SURPLUS =
  MONTHLY_INCOME
  - MONTHLY_BILLS
  - MONTHLY_DEBT_MINIMUMS
  - SCHEDULED_TRANSFERS
  - SAVINGS_CONTRIBUTIONS
```

The cash-only attack formula is:

```text
CURRENT_AVAILABLE_CASH = max(
  STARTING_CASH - PROTECTED_BUFFER - REQUIRED_CASH,
  0
)

PROJECTED_AVAILABLE_CASH = max(
  PROJECTED_CASH_BALANCE - PROTECTED_BUFFER,
  0
)

SAFE_CASH_ATTACK = min(
  CURRENT_AVAILABLE_CASH,
  PROJECTED_AVAILABLE_CASH,
  max(MONTHLY_SURPLUS, 0)
)
```

## Recommendation trace

`buildCashIntelligence` calculated:

```text
SAFE_FUNDING_SOURCE_CAPACITY =
  CASH_SOURCE_CONTRIBUTION
  + CARD_A_CAPACITY
  + TARGET_CARD_CAPACITY
  + SECURED_CAPACITY

UNCAPPED_SAFE_ATTACK_AMOUNT = max(
  SAFE_CASH_ATTACK,
  SAFE_FUNDING_SOURCE_CAPACITY
)

SAFE_ATTACK_AMOUNT = UNCAPPED_SAFE_ATTACK_AMOUNT
```

The dashboard did not pass `maxAttackAmount`, so no attack cap was applied at this stage.

`buildFinancialDecision` then:

1. Selected the target revolving debt under the dashboard's hard-coded avalanche strategy because it had the highest APR among active positive-balance debts.
2. Applied the debt-balance cap:

```text
UNCAPPED_PAYMENT = min(
  SAFE_ATTACK_AMOUNT,
  TARGET_DEBT_BALANCE
)
```

3. Received no `maxExtraPayment` guardrail from the dashboard.
4. Produced `suggestedExtraPayment = TARGET_DEBT_BALANCE` because aggregate funding capacity exceeded the target balance.

No decision guardrail violation was generated because funding-source capacity was positive, projected available cash was positive, monthly surplus was positive, and the planning-window obligations check passed.

## Data verification findings

### Stale or conflicting sources

- The active HELOC-like row reported material available capacity even though the owner's verified real-world position did not have that drawable capacity.
- A second inactive HELOC representation had the same limit and APR but a materially different balance.
- The inactive row's stored available credit did not equal its limit less balance.

### Cross-record inconsistencies

- One revolving funding-source balance differed from the corresponding debt balance, yet the active funding-source row still contributed its available credit.
- The target debt's funding-source and debt balances agreed, but the records were not linked.
- The target funding-source row contributed its own unused revolving credit to the global capacity used to recommend paying that target debt.
- None of the audited funding-source records was linked to a debt through `linked_debt_id`.

### Defaults and calculation behavior

- No audited source had a configured utilization percentage, and the dashboard supplied no global source-utilization guardrail. The engine therefore applied its `100%` fallback.
- The dashboard did not pass an emergency-reserve amount or savings reserve into this calculation path. The checking buffer protected cash but was not subtracted from funding-source capacity.
- `safeAttackAmount` selected the larger of safe cash and aggregate funding-source capacity. It did not require the source to be cash, verify that secured credit was currently drawable outside BeastMoney, or require the payoff target to differ from the contributing revolving source.

## Root cause

The oversized recommendation was caused by the following verified chain, not by available cash:

1. Production marked multiple revolving and secured-credit records as active funding sources.
2. One active secured-credit row reported substantial unused capacity despite conflicting real-world and inactive-record evidence.
3. Missing utilization configuration defaulted every positive-limit source to `100%` capacity, and no separate reserve constrained funding-source capacity.
4. The calculation aggregated available credit from unrelated revolving sources, the target revolving source, and the secured source.
5. The engine selected `max(SAFE_CASH_ATTACK, AGGREGATE_FUNDING_CAPACITY)`, so borrowed capacity controlled the recommendation.
6. The decision engine capped that selected capacity at the target debt balance, producing a full-balance payoff recommendation.

No estimate was used to establish this execution path. Only the public presentation has been redacted.

## Architectural findings

- Cash and borrowed capacity were represented by one final scalar without source identity.
- Funding-source types were treated as interchangeable during debt-payoff capacity aggregation.
- Revolving credit was allowed to contribute capacity toward another revolving debt and toward itself.
- Source eligibility, transfer approval, fees, APR comparison, break-even analysis, and payoff improvement were not validated before borrowed capacity entered the recommendation.
- The recommendation response did not identify how much came from cash, recurring surplus, or a named borrowing strategy.
- The protected checking buffer and funding-source reserve were separate concepts; only the cash side used the checking buffer.
- Stored `available_credit` was trusted when truthy, even when another record or external reality conflicted with it.

## Code trace

- Production record loading: `src/app/dashboard/money/page.tsx`
- Dashboard input assembly: `src/app/dashboard/money/page.tsx`
- Monthly normalization: `src/lib/financialMetrics.ts`
- Cash and funding-source calculation: `src/lib/cashIntelligence.ts`
- Target selection and final balance cap: `src/lib/financialDecisionEngine.ts`

## Validation evidence

The diagnostic package passed the normal Beast application checks before release:

- Beast tests: 378 passed, 0 failed
- Lint: passed with no warnings or errors
- TypeScript: passed
- Production build: passed; 59 application routes generated or compiled
- Staged diff whitespace validation: passed

No recommendation logic was changed as part of BM-BUG-002.
