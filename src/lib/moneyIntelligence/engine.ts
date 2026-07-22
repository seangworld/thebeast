import type { FinancialEvent, FinancialMemoryRecord, FinancialRecommendation, FinancialStory, FinancialTransaction, ProviderTransaction } from "./types";

function clean(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function eventId(type: string, transaction: FinancialTransaction) {
  return `${type}:${transaction.fingerprint}`;
}

export function normalizeProviderTransaction(input: ProviderTransaction & { ownerId: string; connectionId: string; accountId: string; providerId: string }): FinancialTransaction {
  const amount = Math.abs(Number(input.amount));
  const direction = input.direction || (input.amount >= 0 ? "credit" : "debit");
  const normalizedDescription = clean(input.description);
  const fingerprint = [input.providerId, input.accountExternalId, input.externalId, input.occurredAt.slice(0, 10), amount.toFixed(2)].join(":");
  return { ...input, amount, direction, id: fingerprint, currency: input.currency || "USD", normalizedDescription, fingerprint };
}

export function detectFinancialEvents(transaction: FinancialTransaction, observedAt = transaction.postedAt || transaction.occurredAt): FinancialEvent[] {
  const base = { ownerId: transaction.ownerId, occurredAt: transaction.occurredAt, observedAt, source: { providerId: transaction.providerId, connectionId: transaction.connectionId, accountId: transaction.accountId, externalId: transaction.externalId }, correlationId: transaction.fingerprint };
  const events: FinancialEvent[] = [{ ...base, id: eventId("transaction.posted", transaction), type: "transaction.posted", payload: transaction }];
  const payment = transaction.direction === "debit" && /payment|autopay|credit card|loan/.test(transaction.normalizedDescription);
  const income = transaction.direction === "credit" && /payroll|salary|direct deposit|pension|benefit/.test(transaction.normalizedDescription);
  if (payment) events.push({ ...base, id: eventId("payment.detected", transaction), type: "payment.detected", payload: { transactionId: transaction.id, amount: transaction.amount, description: transaction.description, confidence: "medium" } });
  if (income) events.push({ ...base, id: eventId("income.detected", transaction), type: "income.detected", payload: { transactionId: transaction.id, amount: transaction.amount, description: transaction.description, confidence: "medium" } });
  return events;
}

export function buildFinancialMemory(events: readonly FinancialEvent[], prior: readonly FinancialMemoryRecord[] = []): FinancialMemoryRecord[] {
  const meaningful = events.filter((event) => event.type === "payment.detected" || event.type === "income.detected");
  return [...prior, ...meaningful.map((event) => ({ id: `memory:${event.id}`, ownerId: event.ownerId, kind: "pattern" as const, summary: event.type === "income.detected" ? "A likely income deposit was detected." : "A likely payment was detected.", evidenceEventIds: [event.id], confidence: "medium" as const, createdAt: event.observedAt, updatedAt: event.observedAt }))];
}

export function buildLiveFinancialStory(ownerId: string, events: readonly FinancialEvent[], memories: readonly FinancialMemoryRecord[] = []): FinancialStory {
  const ordered = [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const payments = ordered.filter((event) => event.type === "payment.detected");
  const income = ordered.filter((event) => event.type === "income.detected");
  const recommendations: FinancialRecommendation[] = [];
  if (income.length) recommendations.push({ id: `review-income:${income[0].id}`, priority: "normal", title: "Review the new income event", rationale: "A likely income deposit changed available cash and may affect the current plan.", action: "Confirm the deposit source and refresh cash-flow guidance.", evidenceEventIds: [income[0].id], requiresConfirmation: true });
  if (payments.length) recommendations.push({ id: `verify-payment:${payments[0].id}`, priority: "normal", title: "Verify the detected payment", rationale: "Confirming the target prevents the manager from applying the payment to the wrong obligation.", action: "Confirm the payment target and posted amount.", evidenceEventIds: [payments[0].id], requiresConfirmation: true });
  return {
    ownerId,
    asOf: ordered[0]?.observedAt || new Date(0).toISOString(),
    headline: ordered.length ? `${ordered.length} financial event${ordered.length === 1 ? "" : "s"} changed the current story.` : "Connect or import an account to begin the financial story.",
    whatChanged: [...(income.length ? [`${income.length} likely income event${income.length === 1 ? "" : "s"} detected.`] : []), ...(payments.length ? [`${payments.length} likely payment${payments.length === 1 ? "" : "s"} detected.`] : [])],
    whyItChanged: ordered.length ? ["New source-owned account or transaction evidence arrived."] : ["No live financial events are available yet."],
    whatItMeans: memories.length ? ["The Financial Manager can compare this evidence with remembered patterns, but confirmation is still required."] : ["The event is new and has not yet formed a durable financial pattern."],
    nextActions: recommendations,
    evidenceEventIds: ordered.map((event) => event.id),
    limitations: ["Detection is informational and may be wrong; users must confirm classifications and payment targets.", "No payment, transfer, account connection, or financial action is executed automatically."],
  };
}

export class FinancialIntelligencePipeline {
  private readonly seen = new Set<string>();
  private events: FinancialEvent[] = [];
  private memory: FinancialMemoryRecord[] = [];

  ingest(transactions: readonly FinancialTransaction[]) {
    const next = transactions.flatMap((transaction) => detectFinancialEvents(transaction)).filter((event) => !this.seen.has(event.id));
    next.forEach((event) => this.seen.add(event.id));
    this.events = [...this.events, ...next];
    this.memory = buildFinancialMemory(next, this.memory);
    return next;
  }

  snapshot(ownerId: string) {
    return { events: [...this.events], memory: [...this.memory], story: buildLiveFinancialStory(ownerId, this.events, this.memory) };
  }
}
