/** Demo-only shipping calculator; cents, no payments or external services. */
export function shippingCents(orderSubtotalCents, isMember = false) {
  if (!Number.isSafeInteger(orderSubtotalCents) || orderSubtotalCents < 0) {
    throw new RangeError("Subtotal must be a nonnegative integer of cents");
  }
  if (typeof isMember !== "boolean") {
    throw new TypeError("isMember must be boolean");
  }
  if (isMember || orderSubtotalCents > 5000) return 0;
  return 599;
}
