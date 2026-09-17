type OrderedDebt = { id?: string; balance?: number | string | null; is_archived?: boolean | null; is_excluded?: boolean | null };

export function parseCustomDebtOrder(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))).slice(0, 1000)
    : [];
}

export function normalizeCustomDebtOrder(debts: OrderedDebt[], value: unknown): string[] {
  const ids = debts.filter(debt => debt.id && Number(debt.balance) > 0 && !debt.is_archived && !debt.is_excluded)
    .map(debt => debt.id!).sort();
  const eligible = new Set(ids);
  return Array.from(new Set([...parseCustomDebtOrder(value).filter(id => eligible.has(id)), ...ids]));
}

export function getCustomDebtTarget<T extends OrderedDebt>(debts: T[], value: unknown): T | null {
  const first = normalizeCustomDebtOrder(debts, value)[0];
  return first ? debts.find(debt => debt.id === first) ?? null : null;
}
