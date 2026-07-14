import { roundMoney } from "./formatters";

export type FinancialCreditProductKind =
  | "heloc"
  | "ploc"
  | "credit_card"
  | "balance_transfer"
  | "other";

export type FinancialCreditProduct = {
  id: string;
  name: string;
  type: FinancialCreditProductKind;
  balance: number;
  creditLimit?: number | null;
  apr: number;
  promotionalApr?: number | null;
  promotionalAprEndsOn?: string | null;
  balanceTransferFeePercent?: number | null;
  asOfDate?: string | null;
};

export type FinancialCreditProductRisk = {
  id: string;
  name: string;
  type: FinancialCreditProductKind;
  effectiveApr: number;
  utilizationPercent: number | null;
  promoActive: boolean;
  promoEndsInDays: number | null;
  balanceTransferFee: number;
  riskLevel: "low" | "medium" | "high";
  warnings: string[];
};

function daysBetween(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000);
}

export function buildFinancialCreditProductRisk(
  product: FinancialCreditProduct
): FinancialCreditProductRisk {
  const asOfDate = product.asOfDate || new Date().toISOString().slice(0, 10);
  const promoEndsInDays = product.promotionalAprEndsOn
    ? daysBetween(asOfDate, product.promotionalAprEndsOn)
    : null;
  const promoActive =
    product.promotionalApr != null &&
    promoEndsInDays != null &&
    promoEndsInDays >= 0;
  const effectiveApr = roundMoney(
    promoActive ? Number(product.promotionalApr) : Number(product.apr || 0)
  );
  const utilizationPercent =
    product.creditLimit && product.creditLimit > 0
      ? roundMoney((Math.max(product.balance, 0) / product.creditLimit) * 100)
      : null;
  const balanceTransferFee = roundMoney(
    product.type === "balance_transfer"
      ? Math.max(product.balance, 0) *
          (Math.max(Number(product.balanceTransferFeePercent || 0), 0) / 100)
      : 0
  );
  const warnings: string[] = [];

  if (utilizationPercent != null && utilizationPercent >= 80) {
    warnings.push("High utilization reduces safe borrowing capacity.");
  }

  if (promoActive && promoEndsInDays != null && promoEndsInDays <= 60) {
    warnings.push("Promotional APR ends soon; plan repayment before the rate changes.");
  }

  if (product.type === "balance_transfer" && balanceTransferFee > 0) {
    warnings.push("Balance transfer fee increases the real payoff cost.");
  }

  if (["heloc", "ploc"].includes(product.type) && effectiveApr > 0) {
    warnings.push("Line-of-credit APR must be included before recommending a debt move.");
  }

  const riskLevel =
    warnings.length >= 2 || (utilizationPercent != null && utilizationPercent >= 90)
      ? "high"
      : warnings.length === 1
      ? "medium"
      : "low";

  return {
    id: product.id,
    name: product.name,
    type: product.type,
    effectiveApr,
    utilizationPercent,
    promoActive,
    promoEndsInDays,
    balanceTransferFee,
    riskLevel,
    warnings,
  };
}

export function buildFinancialCreditProductRisks(
  products: FinancialCreditProduct[]
) {
  return products.map(buildFinancialCreditProductRisk);
}
