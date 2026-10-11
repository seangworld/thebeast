import test from "node:test";
import assert from "node:assert/strict";
import { shippingCents } from "./shipping.js";

test("orders below $50 are charged standard shipping", () => {
  assert.equal(shippingCents(4999), 599);
});
test("orders at exactly $50 qualify for free shipping", () => {
  assert.equal(shippingCents(5000), 0);
});
test("orders above $50 qualify for free shipping", () => {
  assert.equal(shippingCents(5001), 0);
});
test("members receive free shipping at any valid subtotal", () => {
  assert.equal(shippingCents(100, true), 0);
});
test("rejects invalid totals", () => {
  assert.throws(() => shippingCents(-1), RangeError);
  assert.throws(() => shippingCents(1.5), RangeError);
});
