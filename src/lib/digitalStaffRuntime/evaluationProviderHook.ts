/** Client-safe seam: filesystem/async context implementation is registered only
 * by the authenticated server evaluation route. Ordinary runtime is unchanged. */
type Reservation = { body: Record<string, unknown>; settle(payload: unknown): void; unknown(diagnostic?: unknown): void; diagnostic?(payload: unknown): void };
let reserve: ((body: Record<string, unknown>, requestId: string) => Reservation | undefined) | undefined;
export function registerEvaluationReservation(factory: NonNullable<typeof reserve>) { reserve = factory; }
export function prepareEvaluationCall(body: unknown, requestId: string) { return reserve?.(body as Record<string, unknown>, requestId); }
