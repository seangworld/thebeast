import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBeastAdminEcosystemMap,
  filterBeastAdminEcosystemNodes,
  getBeastAdminEcosystemConnections,
  getBeastAdminEcosystemVisibleEdges,
} from "../src/lib/beastAdminEcosystemVisualization";
import { beastModuleRegistry } from "../src/lib/moduleRegistry";
import { professionalRelationshipDefinitions } from "../src/lib/platform/relationships";

test("BA-113 maps every canonical application and registered professional", () => {
  const map = buildBeastAdminEcosystemMap();
  const moduleNodes = map.nodes.filter((node) => node.category === "module");
  const professionalNodes = map.nodes.filter(
    (node) => node.category === "professional"
  );

  assert.deepEqual(
    moduleNodes.map((node) => node.id),
    beastModuleRegistry
      .filter((module) => module.id !== "beastos")
      .map((module) => `module-${module.id}`)
  );
  assert.deepEqual(
    professionalNodes.map((node) => node.id),
    professionalRelationshipDefinitions.map(
      (professional) => `professional-${professional.agentId}`
    )
  );
  assert.equal(
    map.nodes.some(
      (node) => node.id === "platform-beastos" && node.label === "BeastOS"
    ),
    true
  );
  assert.equal(
    map.nodes.some(
      (node) =>
        node.id === "fusion-beastfusion" && node.label === "BeastFusion"
    ),
    true
  );
});

test("BA-113 includes every requested shared architecture service", () => {
  const map = buildBeastAdminEcosystemMap();
  const services = map.nodes
    .filter((node) => node.category === "shared-service")
    .map((node) => node.label);

  assert.deepEqual(services, [
    "Identity",
    "Permissions",
    "Memory",
    "Notifications",
    "Search",
    "Documents",
    "Timeline",
  ]);
  for (const service of map.nodes.filter(
    (node) => node.category === "shared-service"
  )) {
    assert.equal(service.owner.includes("BeastOS"), true, service.label);
    assert.equal(service.boundaries.length > 0, true, service.label);
    assert.equal(service.sourceRefs.length > 0, true, service.label);
  }
});

test("BA-113 documents directional ownership and professional boundaries", () => {
  const map = buildBeastAdminEcosystemMap();
  const fusion = map.nodes.find((node) => node.id === "fusion-beastfusion");
  assert.ok(fusion);
  assert.match(fusion.boundaries.join(" "), /read-only/i);
  assert.match(fusion.boundaries.join(" "), /Cross-module writes are not allowed/i);
  assert.match(fusion.boundaries.join(" "), /no autonomous execution/i);

  for (const professional of professionalRelationshipDefinitions) {
    const professionalId = `professional-${professional.agentId}`;
    const connections = getBeastAdminEcosystemConnections(map, professionalId);
    assert.equal(
      connections.some(
        (edge) =>
          edge.from === "fusion-beastfusion" &&
          edge.relation === "coordinates"
      ),
      true,
      professional.role
    );
    assert.equal(
      connections.some(
        (edge) =>
          edge.from === "service-permissions" &&
          edge.relation === "authorizes"
      ),
      true,
      professional.role
    );
    assert.equal(
      connections.some(
        (edge) =>
          edge.from === "service-memory" && edge.relation === "informs"
      ),
      true,
      professional.role
    );
  }
});

test("BA-113 supports category search and relationship isolation", () => {
  const map = buildBeastAdminEcosystemMap();
  assert.deepEqual(
    filterBeastAdminEcosystemNodes(map, { category: "fusion" }).map(
      (node) => node.id
    ),
    ["fusion-beastfusion"]
  );
  assert.equal(
    filterBeastAdminEcosystemNodes(map, { query: "default-deny" })[0]?.id,
    "service-permissions"
  );

  const allNodeIds = new Set(map.nodes.map((node) => node.id));
  const selectedEdges = getBeastAdminEcosystemVisibleEdges(map, {
    visibleNodeIds: allNodeIds,
    selectedNodeId: "service-memory",
    showAllRelationships: false,
  });
  assert.equal(
    selectedEdges.every(
      (edge) =>
        edge.from === "service-memory" || edge.to === "service-memory"
    ),
    true
  );
  assert.equal(
    getBeastAdminEcosystemVisibleEdges(map, {
      visibleNodeIds: allNodeIds,
      selectedNodeId: "service-memory",
      showAllRelationships: true,
    }).length,
    map.edges.length
  );
});

test("BA-113 is an owner-shell documentation and debugging surface only", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/ecosystem/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/ecosystem/BeastAdminEcosystemVisualizationWorkspace.tsx",
    "utf8"
  );
  const shell = readFileSync(
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(page, /BeastAdminShell/);
  assert.match(page, /Ecosystem Visualization/);
  assert.match(workspace, /Interactive architecture map/);
  assert.match(workspace, /Show all relationships/);
  assert.match(workspace, /Find an architecture node/);
  assert.match(workspace, /Connected architecture/);
  assert.match(workspace, /Source registries/);
  assert.match(workspace, /role="button"/);
  assert.match(workspace, /event\.key === "Enter"/);
  assert.match(workspace, /does not inspect live member data/);
  assert.match(shell, /Ecosystem Map/);
  assert.match(navigation, /Ecosystem Map/);
  assert.doesNotMatch(workspace, /createClient|fetch\(|\.rpc\(/);
  assert.doesNotMatch(workspace, /\.(insert|update|delete|upsert)\(/);
});
