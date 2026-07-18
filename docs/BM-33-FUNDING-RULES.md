# BM-33 Funding Rules

BeastMoney classifies funding sources as cash, secured credit, unsecured credit, revolving spending, or reserved promotional balance transfer. Cash is preferred for debt payoff after protected reserves. Credit cards may fund merchant spending only and never debt payoff. Borrowed funds require a lower rate than the target debt and must stay within the source utilization limit. Recommendations show cash and eligible borrowing separately; they do not provide financial advice or execute transfers.

## Completion summary

- Funding-source classification is centralized in `fundingRules`.
- The payment eligibility matrix blocks revolving spending sources from debt payoff.
- Recommendation eligibility requires a lower borrowing rate and respects utilization capacity.
- The recommendation trace separates safe cash from eligible borrowing and names each source class.
- The Money dashboard presents the trace and explains the card-to-debt prohibition.
- Financial education is plain-language, non-advisory, and explains rate, utilization, and cash-reserve boundaries.
- Promotional balance transfers remain deferred architecture only; they cannot enter normal funding logic.
- Regression coverage verifies card blocking, lower-rate HELOC eligibility, utilization limits, and existing financial behavior.
