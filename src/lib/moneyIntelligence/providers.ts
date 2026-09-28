import type { ConnectedAccountProvider } from "./types";

export class ConnectedAccountProviderRegistry {
  private readonly providers = new Map<string, ConnectedAccountProvider>();

  register(provider: ConnectedAccountProvider) {
    if (!provider.id.trim()) throw new Error("Connected account provider id is required.");
    if (this.providers.has(provider.id)) throw new Error(`Connected account provider ${provider.id} is already registered.`);
    this.providers.set(provider.id, provider);
    return provider;
  }

  get(providerId: string) {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Connected account provider ${providerId} is not registered.`);
    return provider;
  }

  list() {
    return Array.from(this.providers.values());
  }
}


export type BalanceRefreshPolicy = {
  mode: "manual";
  minimumSecondsBetweenRequests: number;
};

export const BEASTMONEY_BALANCE_REFRESH_POLICY: BalanceRefreshPolicy = {
  mode: "manual",
  minimumSecondsBetweenRequests: 30,
};

export function assertManualBalanceRefreshAllowed(input: {
  requestedByMember: boolean;
  lastRequestedAt?: string;
  now?: string;
  policy?: BalanceRefreshPolicy;
}) {
  const policy = input.policy || BEASTMONEY_BALANCE_REFRESH_POLICY;
  if (policy.mode !== "manual" || !input.requestedByMember) {
    throw new Error("Balance refresh requires an explicit member request.");
  }
  if (!input.lastRequestedAt) return true;
  const now = Date.parse(input.now || new Date().toISOString());
  const previous = Date.parse(input.lastRequestedAt);
  if (!Number.isFinite(now) || !Number.isFinite(previous)) {
    throw new Error("Balance refresh timestamps are invalid.");
  }
  if (now - previous < policy.minimumSecondsBetweenRequests * 1000) {
    throw new Error("Please wait before refreshing balances again.");
  }
  return true;
}
