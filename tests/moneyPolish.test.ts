import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Money cockpit includes first-run and load-failure guidance", () => {
  const source = readFileSync("src/app/dashboard/money/page.tsx", "utf8");

  assert.match(source, /Money could not load/);
  assert.match(source, /Build your first Money plan/);
  assert.match(source, /Add Money Records/);
  assert.match(source, /aria-label="Simulation date"/);
});
