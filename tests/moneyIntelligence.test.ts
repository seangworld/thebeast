import assert from "node:assert/strict";
import test from "node:test";
import { ConnectedAccountProviderRegistry, FinancialIntelligencePipeline, buildLiveFinancialStory, detectFinancialEvents, normalizeProviderTransaction } from "../src/lib/moneyIntelligence";

function transaction(description: string, amount: number, externalId: string) {
  return normalizeProviderTransaction({ ownerId: "owner-1", connectionId: "connection-1", accountId: "account-1", providerId: "test-provider", accountExternalId: "external-account", externalId, occurredAt: "2026-07-21T12:00:00.000Z", description, amount });
}

test("connected account providers plug into one provider-neutral registry", async () => {
  const registry = new ConnectedAccountProviderRegistry();
  registry.register({ id: "test-provider", displayName: "Test Provider", capabilities: ["accounts", "transactions"], async connect() { return { connectionId: "connection-1", accounts: [] }; }, async sync() { return { transactions: [] }; }, async disconnect() {} });
  assert.equal(registry.get("test-provider").displayName, "Test Provider");
  assert.throws(() => registry.register(registry.get("test-provider")), /already registered/);
});

test("transaction intelligence detects payment and income without executing actions", () => {
  const payment = detectFinancialEvents(transaction("Credit Card Autopay", -125, "tx-1"));
  const income = detectFinancialEvents(transaction("Employer Payroll Direct Deposit", 2400, "tx-2"));
  assert.deepEqual(payment.map((event) => event.type), ["transaction.posted", "payment.detected"]);
  assert.deepEqual(income.map((event) => event.type), ["transaction.posted", "income.detected"]);
  const story = buildLiveFinancialStory("owner-1", [...payment, ...income]);
  assert.ok(story.nextActions.every((action) => action.requiresConfirmation));
  assert.match(story.limitations.join(" "), /No payment, transfer, account connection, or financial action is executed automatically/);
});

test("financial pipeline deduplicates events and remembers evidence-backed patterns", () => {
  const pipeline = new FinancialIntelligencePipeline();
  const payroll = transaction("Salary Payroll", 1800, "tx-payroll");
  assert.equal(pipeline.ingest([payroll]).length, 2);
  assert.equal(pipeline.ingest([payroll]).length, 0);
  const snapshot = pipeline.snapshot("owner-1");
  assert.equal(snapshot.memory.length, 1);
  assert.equal(snapshot.story.whatChanged.length, 1);
  assert.ok(snapshot.story.evidenceEventIds.length > 0);
});

test("empty financial story gives a useful no-dead-end next state", () => {
  const story = buildLiveFinancialStory("owner-1", []);
  assert.match(story.headline, /Connect or import an account/);
  assert.match(story.whyItChanged[0], /No live financial events/);
});
