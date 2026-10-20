import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { sourcesCitedInAnswer, withCitedHealthSources } from "../src/lib/health/answerSources";

const cited = { title: "VA evidence", url: "https://www.va.gov/disability/" };
const unrelated = { title: "Unrelated regulation", url: "https://www.ecfr.gov/current/title-38/section-21.86" };

test("retains only complete cited URLs from retrieved sources, deduplicated", () => {
  assert.deepEqual(sourcesCitedInAnswer(`See [VA](${cited.url}).`, [unrelated, cited, cited]), [cited]);
  assert.deepEqual(sourcesCitedInAnswer(`${cited.url}other`, [cited]), []);
  assert.deepEqual(sourcesCitedInAnswer("https://www.va.gov.evil.example/disability/", [cited]), []);
  assert.deepEqual(sourcesCitedInAnswer("No links remain after safety withholding.", [cited]), []);
  assert.deepEqual(sourcesCitedInAnswer("https://invented.example/", [cited]), []);
});

test("preserves query/fragment identity and balanced URL parentheses; rejects unsafe or malformed URLs", () => {
  const source = { url: "https://example.org/a_(b)?section=1#part" };
  assert.deepEqual(sourcesCitedInAnswer(`[source](${source.url}).`, [source]), [source]);
  assert.deepEqual(sourcesCitedInAnswer("https://example.org/a_(b)?section=2#part", [source]), []);
  assert.deepEqual(sourcesCitedInAnswer("javascript:alert(1) https://user:pass@example.org/", [{url:"javascript:alert(1)"}, {url:"https://user:pass@example.org/"}, {url:"invalid"}]), []);
});

test("recorded H-C regression excludes the irrelevant regulation but retains delivered citations", () => {
  const runs = JSON.parse(readFileSync("docs/taylor-health-advisor-upgrade/evaluation/quality-regression-20261020/original-runtime-results.json", "utf8"));
  const run = runs.find((item: { scenarioId: string }) => item.scenarioId === "health-veterans-original");
  const turn = run.results.find((item: { turnId: string }) => item.turnId === "research-in-context");
  const original = JSON.stringify(turn);
  assert.ok(turn.researchSources.some((source: {url: string}) => source.url.includes("21.86")));
  const selected = sourcesCitedInAnswer(turn.response, turn.researchSources);
  assert.equal(selected.length, 3);
  assert.ok(selected.every(source => !source.url.includes("21.86")));
  assert.equal(JSON.stringify(turn), original);
});

test("live and restored Health conversation adapters both filter against their displayed answer", () => {
  const source = readFileSync("src/app/dashboard/health/HealthAdvisorWorkspace.tsx", "utf8");
  assert.match(source, /sourcesCitedInAnswer\(content.text, runtime\?\.researchSources \|\| \[\]\)/);
  assert.match(source, /sourcesCitedInAnswer\(runtime.result.response, runtime.result.researchSources\)/);
});

 test("legacy saved answers filter against rendered prose without mutating persisted evidence", () => {
  const saved = { answer: unrelated.url, generalInformation: "No links here.", possibleExplanations: `See ${cited.url}`, questionsForClinician: "Ask your clinician.", externalSources: [unrelated, cited] };
  const before = JSON.stringify(saved);
  assert.deepEqual(withCitedHealthSources(saved).externalSources, [cited]);
  assert.equal(JSON.stringify(saved), before);
  assert.deepEqual(withCitedHealthSources({...saved, generalInformation: "", answer: cited.url, possibleExplanations: ""}).externalSources, [cited]);
  assert.match(readFileSync("src/app/dashboard/health/HealthAdvisorWorkspace.tsx", "utf8"), /answer: withCitedHealthSources\(content.answer as HealthAdvisorQuestionAnswer\)/);
});
