import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("GA commands use the Arguments transport required by gtag", () => {
  const source = readFileSync("src/app/components/analytics/BeastAnalytics.tsx", "utf8");
  const body = source.match(/window\.gtag = function \(\) \{([\s\S]*?)\n        \};/)?.[1];
  assert.ok(body);
  const layer: unknown[] = [];
  const context = { window: { dataLayer: layer } };
  const send = vm.runInNewContext(`(function () {${body}})`, context);
  send("config", "G-ABCDEF1234", { send_page_view: false });
  send("event", "page_view", { page_location: "https://example.com/" });
  assert.equal(layer.length, 2);
  assert.equal(Object.prototype.toString.call(layer[0]), "[object Arguments]");
  assert.equal(Array.isArray(layer[0]), false);
  assert.equal((layer[1] as IArguments)[1], "page_view");
});
