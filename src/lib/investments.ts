export const INVESTMENT_ACCOUNT_TYPES = [
  "brokerage",
  "retirement",
  "education",
  "health_savings",
  "other",
] as const;

export const INVESTMENT_ASSET_CLASSES = [
  "cash",
  "stock",
  "bond",
  "fund",
  "real_estate",
  "other",
] as const;

export type InvestmentAccountType = (typeof INVESTMENT_ACCOUNT_TYPES)[number];
export type InvestmentAssetClass = (typeof INVESTMENT_ASSET_CLASSES)[number];

export type InvestmentAccount = {
  id: string;
  name: string;
  type: InvestmentAccountType;
  taxTreatment: "taxable" | "tax_deferred" | "tax_exempt" | "unknown";
  institutionLabel?: string;
};

export type InvestmentHolding = {
  id: string;
  accountId: string;
  name: string;
  assetClass: InvestmentAssetClass;
  valuedOn: string;
  marketValue: number;
};

export type InvestmentContribution = {
  id: string;
  accountId: string;
  occurredOn: string;
  amount: number;
  direction: "contribution" | "withdrawal";
  note?: string;
};

export type InvestmentAllocation = {
  assetClass: InvestmentAssetClass;
  marketValue: number;
  percentage: number;
};

export type InvestmentAccountSummary = {
  account: InvestmentAccount;
  marketValue: number;
  netContributions: number;
  allocation: InvestmentAllocation[];
};

export type InvestmentPortfolio = {
  accounts: InvestmentAccountSummary[];
  holdings: InvestmentHolding[];
  contributions: InvestmentContribution[];
  marketValue: number;
  netContributions: number;
  allocation: InvestmentAllocation[];
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
  return DATE_ONLY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function duplicateIds(values: Array<{ id: string }>) {
  const seen = new Set<string>();
  return values.flatMap(({ id }) => {
    if (seen.has(id)) return [id];
    seen.add(id);
    return [];
  });
}

function allocationFor(holdings: InvestmentHolding[]): InvestmentAllocation[] {
  const total = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const byClass = new Map<InvestmentAssetClass, number>();
  for (const holding of holdings) {
    byClass.set(holding.assetClass, (byClass.get(holding.assetClass) ?? 0) + holding.marketValue);
  }
  return INVESTMENT_ASSET_CLASSES.flatMap((assetClass) => {
    const marketValue = byClass.get(assetClass) ?? 0;
    if (marketValue === 0) return [];
    return [{ assetClass, marketValue, percentage: total === 0 ? 0 : (marketValue / total) * 100 }];
  });
}

function netContributions(contributions: InvestmentContribution[]) {
  return contributions.reduce(
    (sum, contribution) => sum + (contribution.direction === "contribution" ? contribution.amount : -contribution.amount),
    0
  );
}

export function validateInvestmentPortfolio(input: {
  accounts: InvestmentAccount[];
  holdings: InvestmentHolding[];
  contributions: InvestmentContribution[];
}): string[] {
  const errors: string[] = [];
  const accountIds = new Set(input.accounts.map(({ id }) => id));

  for (const id of duplicateIds(input.accounts)) errors.push(`Duplicate investment account id: ${id}.`);
  for (const id of duplicateIds(input.holdings)) errors.push(`Duplicate investment holding id: ${id}.`);
  for (const id of duplicateIds(input.contributions)) errors.push(`Duplicate investment contribution id: ${id}.`);

  for (const account of input.accounts) {
    if (!account.id.trim() || !account.name.trim()) errors.push("Investment accounts require an id and name.");
    if (!INVESTMENT_ACCOUNT_TYPES.includes(account.type)) errors.push(`Investment account ${account.id} has unsupported type ${account.type}.`);
  }

  for (const holding of input.holdings) {
    if (!holding.id.trim() || !holding.name.trim()) errors.push("Investment holdings require an id and name.");
    if (!accountIds.has(holding.accountId)) errors.push(`Investment holding ${holding.id} references missing account ${holding.accountId}.`);
    if (!INVESTMENT_ASSET_CLASSES.includes(holding.assetClass)) errors.push(`Investment holding ${holding.id} has unsupported asset class ${holding.assetClass}.`);
    if (!validDate(holding.valuedOn)) errors.push(`Investment holding ${holding.id} has invalid valuation date ${holding.valuedOn}.`);
    if (!Number.isFinite(holding.marketValue) || holding.marketValue < 0) errors.push(`Investment holding ${holding.id} requires a non-negative finite market value.`);
  }

  for (const contribution of input.contributions) {
    if (!contribution.id.trim()) errors.push("Investment contributions require an id.");
    if (!accountIds.has(contribution.accountId)) errors.push(`Investment contribution ${contribution.id} references missing account ${contribution.accountId}.`);
    if (!validDate(contribution.occurredOn)) errors.push(`Investment contribution ${contribution.id} has invalid date ${contribution.occurredOn}.`);
    if (!Number.isFinite(contribution.amount) || contribution.amount <= 0) errors.push(`Investment contribution ${contribution.id} requires a positive finite amount.`);
  }

  return errors;
}

export function buildInvestmentPortfolio(input: {
  accounts: InvestmentAccount[];
  holdings: InvestmentHolding[];
  contributions: InvestmentContribution[];
}): InvestmentPortfolio {
  const errors = validateInvestmentPortfolio(input);
  if (errors.length) throw new Error(errors.join(" "));

  const accounts = input.accounts.slice().sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  const holdings = input.holdings.slice().sort((left, right) => left.accountId.localeCompare(right.accountId) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  const contributions = input.contributions.slice().sort((left, right) => left.occurredOn.localeCompare(right.occurredOn) || left.id.localeCompare(right.id));
  const marketValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);

  return {
    accounts: accounts.map((account) => {
      const accountHoldings = holdings.filter((holding) => holding.accountId === account.id);
      const accountContributions = contributions.filter((contribution) => contribution.accountId === account.id);
      return {
        account,
        marketValue: accountHoldings.reduce((sum, holding) => sum + holding.marketValue, 0),
        netContributions: netContributions(accountContributions),
        allocation: allocationFor(accountHoldings),
      };
    }),
    holdings,
    contributions,
    marketValue,
    netContributions: netContributions(contributions),
    allocation: allocationFor(holdings),
  };
}

export const INVESTMENT_MODEL_BOUNDARY =
  "This model organizes owner-entered investment records. It does not provide investment, tax, legal, or financial advice; recommend securities or allocations; connect to institutions; or calculate performance.";
