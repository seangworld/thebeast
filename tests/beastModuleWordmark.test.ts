import assert from "node:assert/strict";
import test from "node:test";
import {
  getBeastModuleWordmarkSuffixColor,
  splitBeastModuleWordmarks,
} from "../src/lib/beastModuleWordmark";

test("SW module names retain the standard blue Beast prefix and homepage suffix colors", () => {
  const colors = {
    OS: "#ffffff",
    Money: "#4ade80",
    Education: "#67e8f9",
    Guide: "#fbbf24",
    Health: "#f87171",
    Home: "#fb923c",
    Fusion: "#ffffff",
  };

  for (const [suffix, color] of Object.entries(colors)) {
    assert.deepEqual(splitBeastModuleWordmarks(`Beast${suffix}`), [
      { text: "Beast", role: "brand" },
      { text: suffix, role: "module", module: suffix.toLowerCase() },
    ]);
    assert.equal(getBeastModuleWordmarkSuffixColor(suffix), color);
  }
});

test("composite module labels preserve plain text and split each Beast wordmark", () => {
  assert.deepEqual(splitBeastModuleWordmarks("The Beast · BeastOS · BeastMoney"), [
    { text: "The " },
    { text: "Beast", role: "brand" },
    { text: " · " },
    { text: "Beast", role: "brand" },
    { text: "OS", role: "module", module: "os" },
    { text: " · " },
    { text: "Beast", role: "brand" },
    { text: "Money", role: "module", module: "money" },
  ]);
  assert.deepEqual(splitBeastModuleWordmarks("Dashboard"), [{ text: "Dashboard" }]);
});
