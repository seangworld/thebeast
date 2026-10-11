import test from "node:test";
import assert from "node:assert/strict";
import { shippingCents } from "./shipping.mjs";

test("orders below $50 pay standard shipping", () => assert.equal(shippingCents(4999), 599));
test("orders at exactly $50 get free shipping", () => assert.equal(shippingCents(5000), 0));
test("orders above $50 get free shipping", () => assert.equal(shippingCents(5001), 0));
test("members get free shipping", () => assert.equal(shippingCents(100, true), 0));
test("invalid amounts and membership are rejected", () => {
  assert.throws(() => shippingCents(-1), RangeError);
  assert.throws(() => shippingCents(1.5), RangeError);
  assert.throws(() => shippingCents(100, "yes"), TypeError);
});
