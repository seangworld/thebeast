import assert from "node:assert/strict";
import test from "node:test";
import { beastAdminPortfolio } from "../src/lib/beastAdminPortfolio";
import { beastModuleRegistry } from "../src/lib/moduleRegistry";

test("BA-REC projects the current ecosystem portfolio from generated version identities", () => {
  assert.deepEqual(
    beastAdminPortfolio.map(({ product }) => product),
    [
      "The Beast", "BeastOS", "BeastMoney", "BeastEducation", "BeastHealth",
      "BeastGoals", "BeastDocuments", "Beast Director", "BeastAdmin",
      "SEANGWORLD", "BeastFusion", "Change the World",
      "BeastHome", "BeastSecurity", "BeastMarketing",
    ]
  );
  assert.equal(
    beastAdminPortfolio.some(({ product }) => product === "BeastFusion Dashboard"),
    false
  );
  assert.equal(
    beastAdminPortfolio.find(({ product }) => product === "BeastEducation")?.version,
    "v1.7.1"
  );
  assert.equal(
    beastAdminPortfolio.find(({ product }) => product === "Change the World")?.production,
    "Deployed"
  );
});

test("BA-REC released education and active Tutor do not create a beta module", () => {
  const education = beastModuleRegistry.find(({ name }) => name === "BeastEducation");
  assert.equal(education?.visibility, "released");
  assert.equal(education?.beta, false);
  assert.equal(beastModuleRegistry.filter(({ beta }) => beta).length, 0);
});
