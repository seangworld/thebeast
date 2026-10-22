import test from "node:test";
import assert from "node:assert/strict";
import { consumeResponseStream, newStreamDiagnostic } from "../src/lib/digitalStaffRuntime/providerStream";
const enc = new TextEncoder();
const usage = { input_tokens: 12, output_tokens: 7 };
function reader(data: string, abrupt = false) {
  let n = 0;
  return new ReadableStream<Uint8Array>({ pull(c) {
    if (n++ === 0) c.enqueue(enc.encode(data));
    else if (abrupt) c.error(new Error("synthetic disconnected stream"));
    else c.close();
  } }).getReader();
}
const event = (type: string, extra: object = {}) => `data: ${JSON.stringify({ type, ...extra })}\n\n`;
test("completed stream retains terminal payload, usage and exact deltas with CRLF chunk boundaries", async () => {
  const response = { model: "synthetic", status: "completed", output: [], usage };
  const bytes = enc.encode((event("response.output_text.delta", { delta: "Actual answer" }) + event("response.completed", { response })).replace(/\n/g, "\r\n"));
  let i = 0, text = "";
  const r = new ReadableStream<Uint8Array>({ pull(c) { if (i < bytes.length) c.enqueue(bytes.slice(i, ++i)); else c.close(); } }).getReader();
  const d = newStreamDiagnostic();
  assert.deepEqual(await consumeResponseStream(r, d, { onDelta: value => { text += value; } }), response);
  assert.equal(text, "Actual answer"); assert.equal(d.outcome, "completed"); assert.deepEqual(d.reportedUsage, usage);
  assert.deepEqual(JSON.parse(d.terminalJson!).response, response);
});
for (const terminal of ["response.incomplete", "response.failed", "error"]) {
  test(`${terminal} preserves error/reason/usage and refuses success`, async () => {
    const d = newStreamDiagnostic();
    const payload = terminal === "error" ? { code: "synthetic_error", message: "Original provider error", usage } : { response: { status: terminal.slice(9), usage, incomplete_details: { reason: "synthetic_reason" }, error: { code: "synthetic_error" } } };
    await assert.rejects(consumeResponseStream(reader(event(terminal, payload)), d));
    assert.equal(d.terminalType, terminal); assert.deepEqual(d.reportedUsage, usage);
    assert.deepEqual(JSON.parse(d.terminalJson!), { type: terminal, ...payload }); assert.equal(d.outcome, "terminal_failure");
  });
}
test("abrupt disconnection keeps partial text and reported interim usage without inventing a terminal result", async () => {
  const d = newStreamDiagnostic();
  await assert.rejects(consumeResponseStream(reader(event("response.created", { response: { usage } }) + event("response.output_text.delta", { delta: "Partial only" }), true), d));
  assert.equal(d.partialOutput, "Partial only"); assert.deepEqual(d.reportedUsage, usage); assert.equal(d.terminalType, null);
});
test("unterminated or malformed frames do not certify completion and retain bounded diagnostic text", async () => {
  for (const data of [event("response.completed", { response: { usage } }).trimEnd(), 'data: {bad-json}\n\n']) {
    const d = newStreamDiagnostic(); await assert.rejects(consumeResponseStream(reader(data), d)); assert.ok(d.unparsedTail.length > 0);
  }
  const d = newStreamDiagnostic();
  await assert.rejects(consumeResponseStream(reader(event("response.output_text.delta", { delta: "x".repeat(20000) })), d));
  assert.equal(d.partialOutput.length, 16384); assert.equal(d.truncated, true);
});


test("expired callers neither reserve evaluation spending nor dispatch a provider request", async () => {
 const { requestOpenAIResponse, requestOpenAIResponseStream } = await import("../src/lib/digitalStaffRuntime/provider");
 const { registerEvaluationReservation } = await import("../src/lib/digitalStaffRuntime/evaluationProviderHook");
 let reservations = 0, requests = 0;
 registerEvaluationReservation(() => { reservations++; return undefined; });
 const controller = new AbortController(); controller.abort(new Error("synthetic overall deadline"));
 try {
  for (const call of [requestOpenAIResponse, requestOpenAIResponseStream]) {
   await assert.rejects(call({}, { signal: controller.signal, fetchImpl: async () => { requests++; return Response.json({}); } }), /synthetic overall deadline/);
  }
  assert.equal(reservations, 0); assert.equal(requests, 0);
 } finally { registerEvaluationReservation(() => undefined); }
});


test("nonstream quota rejection retains sanitized diagnostic without settling or retrying", async () => {
 const { requestOpenAIResponse } = await import("../src/lib/digitalStaffRuntime/provider");
 const { registerEvaluationReservation } = await import("../src/lib/digitalStaffRuntime/evaluationProviderHook");
 let requests = 0, settlements = 0, unknown: unknown;
 registerEvaluationReservation(body => ({ body, settle: () => { settlements++; }, unknown: diagnostic => { unknown = diagnostic; } }));
 try {
  await assert.rejects(requestOpenAIResponse({}, { apiKey: "sk-SYNTHETIC_ONLY", fetchImpl: async () => {
   requests++; return Response.json({ error: { type: "insufficient_quota", code: "credit_balance_exhausted", message: "PRIVATE_RAW_MESSAGE_DO_NOT_RETAIN" } }, { status: 429, headers: { "x-request-id": "synthetic-request" } });
  } }));
  assert.equal(requests, 1); assert.equal(settlements, 0);
  assert.deepEqual(unknown, { httpStatus: 429, providerRequestId: "synthetic-request", failure: { message: "OpenAI Responses API returned status 429 (type=insufficient_quota, code=credit_balance_exhausted)." } });
  assert.doesNotMatch(JSON.stringify(unknown), /PRIVATE_RAW_MESSAGE/);
 } finally { registerEvaluationReservation(() => undefined); }
});
