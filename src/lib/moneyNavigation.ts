export type BeastMoneyNavigationItem = {
  label: string;
  href: string;
};

export const beastMoneyCoreNavigation: readonly BeastMoneyNavigationItem[] = [
  { label: "Money Coach", href: "/dashboard/money" },
  { label: "Dashboard", href: "/dashboard/money/dashboard" },
  { label: "Cash Flow", href: "/dashboard/money/cashflow" },
  { label: "Bills", href: "/dashboard/money/cashflow#bills" },
  { label: "Debts", href: "/dashboard/money/debts" },
  { label: "Payoff Plan", href: "/dashboard/money/debts#payoff-plan" },
  { label: "Velocity", href: "/dashboard/money/velocity" },
  { label: "Retirement", href: "/dashboard/money/retirement" },
  { label: "Reports", href: "/dashboard/money/dashboard#reports" },
  { label: "Settings", href: "/dashboard/money/settings" },
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
