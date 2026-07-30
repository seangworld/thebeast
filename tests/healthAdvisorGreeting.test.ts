import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildHealthAdvisorDataState,
  buildHealthAdvisorGreeting,
  healthAdvisorIntroduction,
  resolveHealthAdvisorMemberName,
} from "../src/lib/health/healthAdvisorPresentation";

test("Health Advisor greets a named member from the authenticated profile", () => {
  const memberName = resolveHealthAdvisorMemberName(
    {
      preferred_name: "Sean Williams",
      display_name: "Different Display Name",
    },
    null
  );

  assert.equal(
    buildHealthAdvisorGreeting({
      memberName,
      now: new Date("2026-07-28T09:00:00.000Z"),
      timeZone: "UTC",
    }),
    "Good morning, Sean."
  );
});

test("Health Advisor greeting falls back safely when no usable name exists", () => {
  assert.equal(resolveHealthAdvisorMemberName({}, { user_metadata: {} }), null);
  assert.equal(
    buildHealthAdvisorGreeting({
      memberName: null,
      now: new Date("2026-07-28T09:00:00.000Z"),
      timeZone: "UTC",
    }),
    "Good morning."
  );
});

test("Health Advisor selects morning afternoon and evening in the member timezone", () => {
  assert.equal(
    buildHealthAdvisorGreeting({
      now: new Date("2026-07-28T09:00:00.000Z"),
      timeZone: "UTC",
    }),
    "Good morning."
  );
  assert.equal(
    buildHealthAdvisorGreeting({
      now: new Date("2026-07-28T14:00:00.000Z"),
      timeZone: "UTC",
    }),
    "Good afternoon."
  );
  assert.equal(
    buildHealthAdvisorGreeting({
      now: new Date("2026-07-28T20:00:00.000Z"),
      timeZone: "UTC",
    }),
    "Good evening."
  );
  assert.equal(
    buildHealthAdvisorGreeting({
      now: new Date("2026-07-28T14:00:00.000Z"),
      timeZone: "Pacific/Honolulu",
    }),
    "Good morning."
  );
});

test("Health Advisor empty state refuses inference and begins with conversation", () => {
  const dataState = buildHealthAdvisorDataState({
    totalRecords: 0,
    populatedAreas: 0,
    medicationCount: 0,
    appointmentCount: 0,
  });

  assert.match(dataState, /will not infer a health history/i);
  assert.match(dataState, /begin naturally through conversation/i);
  assert.doesNotMatch(dataState, /Health Profile|Medications|Appointments/);
});

test("Health Advisor populated state reports saved counts without unsupported claims", () => {
  const dataState = buildHealthAdvisorDataState({
    totalRecords: 5,
    populatedAreas: 4,
    medicationCount: 2,
    appointmentCount: 1,
  });

  assert.match(dataState, /5 saved health records across 4 health areas/);
  assert.match(dataState, /2 medications and 1 appointment/);
  assert.match(dataState, /saved records only/);
  assert.doesNotMatch(
    dataState,
    /improving|worsening|stable|healthy|normal|diagnosis|treatment/i
  );
});

test("Health Advisor renders the compact introduction before the executive briefing", () => {
  const source = readFileSync(
    "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
    "utf8"
  );

  assert.match(healthAdvisorIntroduction, /I’m your Health Advisor/);
  assert.match(healthAdvisorIntroduction, /understand your health history/);
  assert.ok(
    source.indexOf("healthAdvisorIntroduction") <
      source.indexOf("Executive Health Briefing")
  );
  assert.match(source, /preferred_name, display_name, full_name, username, timezone/);
  assert.doesNotMatch(source, /Health Advisor starting points/);
  assert.match(source, /Your saved health records are unavailable/);
});
