export type FinancialEventType =
  | "account.connected"
  | "account.synced"
  | "balance.changed"
  | "transaction.posted"
  | "payment.detected"
  | "income.detected"
  | "cashflow.changed"
  | "recommendation.created";

export type FinancialEvent<T = unknown> = {
  id: string;
  ownerId: string;
  type: FinancialEventType;
  occurredAt: string;
  observedAt: string;
  source: { providerId: string; connectionId?: string; accountId?: string; externalId?: string };
  correlationId?: string;
  payload: T;
};

export type ConnectedAccount = {
  id: string;
  ownerId: string;
  providerId: string;
  externalAccountId: string;
  name: string;
  type: "checking" | "savings" | "credit" | "loan" | "investment" | "other";
  currency: string;
  status: "pending" | "active" | "reauthorization-required" | "disconnected" | "error";
  consent: { grantedAt: string; scopes: readonly string[]; revokedAt?: string };
  lastSuccessfulSyncAt?: string;
  cursor?: string;
};

export type ProviderTransaction = {
  externalId: string;
  accountExternalId: string;
  occurredAt: string;
  postedAt?: string;
  description: string;
  amount: number;
  currency?: string;
  direction?: "credit" | "debit";
  merchant?: string;
  category?: string;
  pending?: boolean;
};

export type FinancialTransaction = ProviderTransaction & {
  id: string;
  ownerId: string;
  connectionId: string;
  accountId: string;
  providerId: string;
  currency: string;
  direction: "credit" | "debit";
  normalizedDescription: string;
  fingerprint: string;
};

export type ConnectedAccountProvider = {
  id: string;
  displayName: string;
  capabilities: readonly ("accounts" | "balances" | "transactions" | "webhooks")[];
  connect(input: { ownerId: string; authorizationCode: string }): Promise<{ connectionId: string; accounts: readonly ConnectedAccount[] }>;
  sync(input: { connectionId: string; cursor?: string }): Promise<{ transactions: readonly ProviderTransaction[]; nextCursor?: string }>;
  disconnect(input: { connectionId: string }): Promise<void>;
};

export type FinancialMemoryRecord = {
  id: string;
  ownerId: string;
  kind: "pattern" | "preference" | "commitment" | "explanation" | "correction";
  summary: string;
  evidenceEventIds: readonly string[];
  confidence: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
};

export type FinancialStory = {
  ownerId: string;
  asOf: string;
  headline: string;
  whatChanged: readonly string[];
  whyItChanged: readonly string[];
  whatItMeans: readonly string[];
  nextActions: readonly FinancialRecommendation[];
  evidenceEventIds: readonly string[];
  limitations: readonly string[];
};

export type FinancialRecommendation = {
  id: string;
  priority: "urgent" | "high" | "normal" | "low";
  title: string;
  rationale: string;
  action: string;
  evidenceEventIds: readonly string[];
  requiresConfirmation: boolean;
};
