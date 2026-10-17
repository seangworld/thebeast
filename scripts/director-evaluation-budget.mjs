// Conservative fixed reservation: <=20KB JSON text plus framing fits well below
// 65,536 byte-BPE input tokens; output cap includes reasoning tokens.
export const limits = Object.freeze({ calls: 8, usd: 3, inputTokens: 65536, outputTokens: 2400, bodyBytes: 20000, reservationUsd: 0.10592 });
export function reserveAttempt(ledger, body) {
  if (body.model !== 'gpt-5' || body.max_output_tokens !== limits.outputTokens || body.store !== false || body.tools || body.previous_response_id || body.service_tier !== 'default') throw new Error('Unbudgeted request configuration');
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > limits.bodyBytes) throw new Error('Input exceeds conservative reservation');
  if (ledger.attempts.length >= limits.calls || ledger.reservedUsd + limits.reservationUsd > limits.usd) throw new Error('Evaluation call or dollar cap reached');
  ledger.reservedUsd = Number((ledger.reservedUsd + limits.reservationUsd).toFixed(8));
  const attempt = { number: ledger.attempts.length + 1, state: 'reserved_before_request', reservedUsd: limits.reservationUsd };
  ledger.attempts.push(attempt);
  return attempt;
}
export function usageCost(usage) {
  const input = usage?.input_tokens, output = usage?.output_tokens, cached = usage?.input_tokens_details?.cached_tokens || 0;
  if (![input, output, cached].every(Number.isSafeInteger) || input < 0 || output < 0 || cached < 0 || cached > input || input > limits.inputTokens || output > limits.outputTokens) throw new Error('Missing or out-of-budget usage; stop evaluation');
  return ((input - cached) * 1.25 + cached * 0.125 + output * 10) / 1_000_000;
}
