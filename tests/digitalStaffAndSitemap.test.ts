import assert from "node:assert/strict";
import test from "node:test";
import {
  digitalProfessionals,
  digitalProfessionalStatuses,
  getDigitalProfessional,
} from "../src/lib/digitalStaff";
import sitemap from "../src/app/sitemap";

test("Digital Staff has accessible deterministic statuses and reporting relationships", () => {
  assert.deepEqual(digitalProfessionalStatuses, ["available", "limited", "unavailable", "inactive"]);
  assert.ok(digitalProfessionals.every((professional) => professional.statusLabel));
  assert.ok(digitalProfessionals.every((professional) => professional.reportsTo));
  assert.equal(getDigitalProfessional("health-advisor")?.releaseStatus, "planned");
  assert.equal(getDigitalProfessional("health-advisor")?.status, "inactive");
});

test("Money Coach and Guidance Counselor retain their safety boundaries", () => {
  assert.ok(getDigitalProfessional("money-coach")?.limitations.some((item) => /No payment execution/i.test(item)));
  assert.ok(getDigitalProfessional("guidance-counselor")?.limitations.some((item) => /Does not duplicate the Tutor/i.test(item)));
});

test("sitemap includes public routes and excludes private application routes", () => {
  const urls = sitemap().map((entry) => entry.url);
  assert.deepEqual(urls, [
    "https://thebeast.seangworld.com",
    "https://thebeast.seangworld.com/release-notes",
  ]);
});
