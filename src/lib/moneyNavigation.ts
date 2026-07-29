export type BeastMoneyNavigationItem = {
  label: string;
  href: string;
  parent?: string;
};

export const beastMoneyCoreNavigation: readonly BeastMoneyNavigationItem[] = [
  { label: "Dashboard", href: "/dashboard/money/dashboard" },
  { label: "Money Coach", href: "/dashboard/money/coach" },
  { label: "Cash Flow", href: "/dashboard/money/cashflow" },
  { label: "Income", href: "/dashboard/money/income", parent: "Cash Flow" },
  { label: "Expenses", href: "/dashboard/money/expenses", parent: "Cash Flow" },
  { label: "Payoff Plan", href: "/dashboard/money/debts" },
  { label: "Strategies", href: "/dashboard/money/debts#strategy-comparison", parent: "Payoff Plan" },
  { label: "Timeline", href: "/dashboard/money/debts#payoff-plan", parent: "Payoff Plan" },
  { label: "Retirement", href: "/dashboard/money/retirement" },
  { label: "Documents", href: "/dashboard/uploads" },
  { label: "Reports", href: "/dashboard/money/reports" },
] as const;

export function isBeastMoneyNavigationActive(
  item: BeastMoneyNavigationItem,
  pathname: string,
  hash = ""
) {
  const [itemPath, itemHash] = item.href.split("#");
  const normalizedHash = hash.replace(/^#/, "");

  if (pathname !== itemPath) return false;
  if (itemHash) return normalizedHash === itemHash;

  const exactHashDestination = beastMoneyCoreNavigation.some((candidate) => {
    const [candidatePath, candidateHash] = candidate.href.split("#");
    return candidatePath === pathname && candidateHash === normalizedHash;
  });
  return !exactHashDestination;
}
