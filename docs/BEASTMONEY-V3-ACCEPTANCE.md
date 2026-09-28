# BeastMoney v3 acceptance gate

BeastMoney v3 is not declared released until the following member flows are verified against the Production candidate.

## Automated/build gates
- Production build succeeds with no TypeScript/build failure.
- Existing finance/calculation tests remain green.
- Connected-account comparison and balance-story tests remain green.
- No provider credential is exposed to browser code or AI context.
- Institutional V1 remains read-only and member-triggered.

## Authenticated member acceptance
1. Dashboard and Money Coach load the same owner-scoped cash, debt, income, funding, strategy, health, goal, and retirement context.
2. Income and Expenses Ahead show saved records without duplicate obligations.
3. Paycheck Strategy drag/select, Save, repeated Undo, partial-save recovery, and unsaved-navigation warning behave correctly.
4. Debt payoff, What-If, custom ordering, and Velocity retain current deterministic calculations and never execute payments.
5. Retirement saves and reloads TSP, 401(k), other accounts, Social Security, pension/defined benefit, military/uniformed-service retirement, and other recurring retirement income; timeline/scenarios/report remain reproducible.
6. Daily Briefing clearly separates What changed, Priorities, and Next actions without duplicating the dashboard.
7. Auto Pay means an external provider/biller arrangement; BeastMoney reminders do not schedule or send payments.
8. An overdue cycle with no BeastMoney payment record is not represented as proof an external Auto Pay failed.
9. Connected Accounts, when an approved provider is configured, refresh only on member request; comparison does not overwrite canonical records.
10. Accepting a connected balance requires explicit member confirmation and creates an audit record. No transaction sync, transfer, bill pay, or money movement occurs.

## External/owner gates
- Select and approve an institution-data provider and its actual Production cost/terms.
- Configure provider credentials through the server-side secret boundary.
- Review and authorize the additive Production database migration.
- Complete an authenticated Production walkthrough of the member flows above.
- Only then update the canonical BeastMoney version manifest to 3.0.0.
