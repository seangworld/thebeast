import assert from "node:assert/strict";
import test from "node:test";
import {
  digitalProfessionals,
  digitalProfessionalStatuses,
  getDigitalProfessional,
  getDigitalProfessionalPortraitReference,
} from "../src/lib/digitalStaff";
import sitemap from "../src/app/sitemap";
import fs from "node:fs";

test("Digital Staff has accessible deterministic statuses and reporting relationships", () => {
  assert.deepEqual(digitalProfessionalStatuses, ["available", "limited", "unavailable", "inactive"]);
  assert.deepEqual(
    digitalProfessionals.map((professional) => professional.id),
    ["money-coach", "guidance-counselor", "health-advisor"]
  );
  assert.deepEqual(
    digitalProfessionals.map((professional) => professional.canonicalId),
    [
      "beastmoney.money-coach",
      "beasteducation.guidance-counselor",
      "beasthealth.health-advisor",
    ]
  );
  assert.ok(
    digitalProfessionals.every(
      (professional) =>
        professional.name &&
        professional.title &&
        professional.biography &&
        professional.mission &&
        professional.responsibilities.length &&
        professional.experience.length &&
        professional.reportsTo &&
        professional.statusLabel &&
        professional.version
    )
  );
  assert.ok(
    digitalProfessionals
      .filter((professional) => professional.reportsToId)
      .every((professional) =>
        digitalProfessionals.some(
          (candidate) => candidate.id === professional.reportsToId
        )
      )
  );
  assert.equal(getDigitalProfessional("health-advisor")?.releaseStatus, "active");
  assert.equal(getDigitalProfessional("health-advisor")?.status, "available");
});

test("Digital Staff portraits reference public assets and retain deterministic fallbacks", () => {
  for (const professional of digitalProfessionals) {
    const expectedUrl = `/digital-staff/${professional.id}.webp`;
    assert.equal(professional.portrait.portrait_url, expectedUrl);
    assert.equal(professional.portrait.avatar_url, expectedUrl);
    assert.equal(professional.portrait.source, "uploaded");
    assert.ok(fs.existsSync(`public${expectedUrl}`));
    assert.match(
      professional.portrait.placeholder_reference,
      new RegExp(`^digital-staff:${professional.id}:initials$`)
    );
    assert.equal(
      getDigitalProfessionalPortraitReference(professional, "portrait"),
      expectedUrl
    );
    assert.equal(
      getDigitalProfessionalPortraitReference(professional, "avatar"),
      expectedUrl
    );
  }

  const unavailablePortrait = {
    ...digitalProfessionals[0],
    portrait: {
      ...digitalProfessionals[0].portrait,
      portrait_url: null,
      avatar_url: null,
      source: "placeholder" as const,
    },
  };
  assert.equal(
    getDigitalProfessionalPortraitReference(unavailablePortrait, "portrait"),
    unavailablePortrait.portrait.placeholder_reference
  );
});

test("Money Coach and Guidance Counselor retain their safety boundaries", () => {
  assert.ok(getDigitalProfessional("money-coach")?.limitations.some((item) => /No payment execution/i.test(item)));
  assert.ok(getDigitalProfessional("guidance-counselor")?.limitations.some((item) => /Does not teach or grade coursework in Generation 1/i.test(item)));
  assert.equal(getDigitalProfessional("fusion-director"), undefined);
  assert.doesNotMatch(
    JSON.stringify(getDigitalProfessional("guidance-counselor")),
    /Tutor|Fusion Director/
  );
});

test("member profile cards expose professional context without internal implementation details", () => {
  const chart = fs.readFileSync(
    "src/app/dashboard/digital-staff/page.tsx",
    "utf8"
  );
  const card = fs.readFileSync(
    "src/app/dashboard/digital-staff/DigitalProfessionalCard.tsx",
    "utf8"
  );
  const profile = fs.readFileSync(
    "src/app/dashboard/digital-staff/[professionalId]/page.tsx",
    "utf8"
  );
  assert.match(chart, /Digital Staff\s*<\/h1>/);
  assert.match(
    chart,
    /Meet the Digital Professionals who guide and support/
  );
  assert.match(chart, /Your professionals/);
  assert.doesNotMatch(chart, /Fusion Director|Organization chart/);
  assert.doesNotMatch(chart, /Portrait asset framework/);
  assert.match(card, /Portrait fallback/);
  assert.match(card, /Reports to/);
  assert.match(card, /Collaborates with/);
  for (const label of [
    "About Me",
    "Mission",
    "Responsibilities",
    "Experience",
    "Reports to",
    "Collaborates With",
  ]) {
    assert.match(profile, new RegExp(label));
  }
  for (const internalLabel of [
    "Version",
    "Release status",
    "Portrait status",
    "placeholder_reference",
  ]) {
    assert.doesNotMatch(profile, new RegExp(internalLabel));
  }
});

test("sitemap includes public routes and excludes private application routes", () => {
  const urls = sitemap().map((entry) => entry.url);
  assert.deepEqual(urls, [
    "https://thebeast.seangworld.com",
    "https://thebeast.seangworld.com/release-notes",
  ]);
});
