import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";

import {
  auditBeastRoadmapIdentities,
  beastRoadmapPackageRegistry,
  getBeastMigrationRoadmapIdentity,
  validateFutureRoadmapIdentifier,
} from "../src/lib/beastRoadmapIdentity";
import { beastAdminRepositoryMigrationFiles } from "../src/lib/beastAdminMigrationStatus";

const root = process.cwd();
const declarationPattern =
  /^(?:#|--)\s*([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+)\b/m;

test("BA-131 assigns globally unique canonical roadmap package identities", () => {
  const audit = auditBeastRoadmapIdentities();

  assert.equal(audit.packageCount, beastRoadmapPackageRegistry.length);
  assert.deepEqual(audit.canonicalCollisions, []);
  assert.deepEqual(
    audit.historicalCollisions.map((collision) => collision.identifier),
    [
      "BA-102",
      "BA-103",
      "BA-106",
      "BA-107",
      "BA-108",
      "BA-110",
      "BA-131",
      "BA-132",
      "BA-133",
      "BA-134",
    ]
  );
});

test("BA-131 preserves historical collisions while disambiguating capabilities", () => {
  const executiveMetrics = getBeastMigrationRoadmapIdentity(
    "20260726000700_add_beast_admin_executive_metrics.sql",
    "BA-110"
  );
  const accountAudit = getBeastMigrationRoadmapIdentity(
    "20260726001400_add_immutable_beast_admin_account_audit_log.sql",
    "BA-110"
  );

  assert.deepEqual(executiveMetrics, {
    roadmapId: "BA-MET-101",
    historicalRoadmapId: "BA-110",
    capability: "Executive Metrics",
  });
  assert.deepEqual(accountAudit, {
    roadmapId: "BA-AUD-101",
    historicalRoadmapId: "BA-110",
    capability: "Immutable Account Audit Log",
  });
});

test("BA-131 treats multiple artifacts for one capability as one package", () => {
  const foundation = getBeastMigrationRoadmapIdentity(
    "20260726001700_add_beast_admin_private_messaging.sql",
    "BA-129"
  );
  const hardening = getBeastMigrationRoadmapIdentity(
    "20260726001800_harden_beast_admin_private_messaging.sql",
    "BA-129"
  );

  assert.equal(foundation.roadmapId, "BA-MSG-101");
  assert.equal(hardening.roadmapId, "BA-MSG-101");
  assert.equal(foundation.capability, hardening.capability);
});

test("BA-131 warns when a future package reuses any known identifier", () => {
  const historicalCollision = validateFutureRoadmapIdentifier("BA-110");
  const canonicalCollision = validateFutureRoadmapIdentifier("BA-MET-101");
  const available = validateFutureRoadmapIdentifier("BA-NEW-901");

  assert.equal(historicalCollision.available, false);
  assert.match(historicalCollision.warning || "", /already identifies/i);
  assert.equal(canonicalCollision.available, false);
  assert.equal(available.available, true);
  assert.equal(available.warning, null);
});

test("BA-131 registers every stored roadmap package declaration", () => {
  const registeredArtifacts = new Set(
    beastRoadmapPackageRegistry.flatMap((entry) => entry.artifacts)
  );
  const artifactDirectories = ["docs", "supabase/migrations"];
  const declaredArtifacts = artifactDirectories.flatMap((directory) =>
    readdirSync(join(root, directory))
      .filter((filename) => /\.(?:md|sql)$/.test(filename))
      .flatMap((filename) => {
        const relativePath = `${directory}/${filename}`;
        const source = readFileSync(join(root, relativePath), "utf8");
        return declarationPattern.test(source) ? [relativePath] : [];
      })
  );

  assert.deepEqual(
    declaredArtifacts.filter((artifact) => !registeredArtifacts.has(artifact)),
    []
  );
});

test("BA-131 gives every migration an exact stable diagnostic identity", () => {
  const identities = beastAdminRepositoryMigrationFiles.map((filename) => ({
    filename,
    ...getBeastMigrationRoadmapIdentity(filename),
  }));

  for (const identity of identities) {
    assert.match(identity.roadmapId, /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+$/);
    assert.equal(identity.capability.length > 0, true, identity.filename);
    assert.match(basename(identity.filename), /^\d{14}_.+\.sql$/);
  }
});

test("BA-131 removes ambiguous roadmap-only migration guidance from runtime UI", () => {
  const sourceRoots = ["src/app/dashboard/admin", "src/lib"];
  const sourceFiles = sourceRoots.flatMap((directory) => {
    const visit = (current: string): string[] =>
      readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
        const path = join(current, entry.name);
        if (entry.isDirectory()) return visit(path);
        return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
      });
    return visit(join(root, directory));
  });
  const ambiguousGuidance =
    /\b(?:apply|run|verify)(?:\s+or\s+verify)?\s+(?:the\s+)?BA-[A-Z0-9-]*\d+\s+(?:Supabase\s+)?migration\b/i;

  for (const file of sourceFiles) {
    assert.doesNotMatch(readFileSync(file, "utf8"), ambiguousGuidance, file);
  }
});
