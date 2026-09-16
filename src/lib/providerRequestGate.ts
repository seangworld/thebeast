/** Shared by all scopes in one server process; other instances still rely on retries. */
export function createRequestGate(limit: number) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("invalid_request_limit");
  let active = 0;
  const waiting: Array<() => void> = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try { return await task(); }
    finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

export function retryDelayMs(status: number, retryAfter: string | null, attempt: number, now = Date.now()) {
  const seconds = retryAfter === null ? NaN : Number(retryAfter);
  const advised = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter || "") - now;
  // Bound server execution time while respecting reasonable provider advice.
  return Math.min(30000, Math.max(status === 429 ? 2000 * 2 ** attempt : 250 * 2 ** attempt,
    Number.isFinite(advised) ? advised : 0));
}
