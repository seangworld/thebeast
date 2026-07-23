import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("BL-408 gives Learning Mission Control premium responsive card rhythm", () => {
  const source = readFileSync(
    "src/app/dashboard/learning/LearningMissionControl.tsx",
    "utf8"
  );

  assert.match(source, /sm:space-y-8/);
  assert.match(source, /xl:grid-cols-\[minmax\(0,1\.2fr\)_minmax\(20rem,0\.8fr\)\]/);
  assert.match(source, /md:grid-cols-2 2xl:grid-cols-3/);
  assert.match(source, /const polishedCard/);
  assert.match(source, /motion-safe:hover:-translate-y-0\.5/);
  assert.match(source, /motion-reduce:transition-none/);
  assert.match(source, /transition-\[width\] duration-700/);
  assert.doesNotMatch(source, /<details[^>]+open>/);
});

test("BL-408 polishes accessible loading empty and error presentation", () => {
  const shell = readFileSync(
    "src/app/dashboard/learning/LearningWorkspaceShell.tsx",
    "utf8"
  );
  const error = readFileSync(
    "src/app/dashboard/education/[workspace]/error.tsx",
    "utf8"
  );

  assert.match(shell, /motion-safe:animate-pulse/);
  assert.match(shell, /\[0, 1, 2, 3, 4, 5\]/);
  assert.match(shell, /aria-busy="true"/);
  assert.match(shell, /sm:w-auto/);
  assert.match(error, /role="alert"/);
  assert.match(error, /min-h-\[55vh\]/);
  assert.match(error, /sm:flex-row/);
  assert.match(error, /Try again/);
});
