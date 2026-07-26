import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminEcosystemRelationKinds,
  buildBeastAdminEcosystemMap,
  filterBeastAdminEcosystemNodes,
  getBeastAdminEcosystemConnectedNodeId,
  getBeastAdminEcosystemConnections,
  getBeastAdminEcosystemRelationKind,
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

test("BA-120 traverses every architecture relationship in either direction", () => {
  const map = buildBeastAdminEcosystemMap();

  for (const edge of map.edges) {
    assert.equal(
      getBeastAdminEcosystemConnectedNodeId(edge, edge.from),
      edge.to,
      edge.id
    );
    assert.equal(
      getBeastAdminEcosystemConnectedNodeId(edge, edge.to),
      edge.from,
      edge.id
    );
    assert.equal(
      getBeastAdminEcosystemConnectedNodeId(edge, "unconnected-node"),
      null,
      edge.id
    );
  }
});

test("BA-120 connected architecture navigates in place and preserves focus controls", () => {
  const workspace = readFileSync(
    "src/app/dashboard/admin/ecosystem/BeastAdminEcosystemVisualizationWorkspace.tsx",
    "utf8"
  );

  assert.match(workspace, /navigateToConnectedNode/);
  assert.match(workspace, /data-architecture-navigation-target/);
  assert.match(workspace, /aria-label={`Navigate to/);
  assert.match(workspace, /setSelectedNodeId\(nodeId\)/);
  assert.match(workspace, /setNavigationRequest/);
  assert.match(workspace, /targetNode\.scrollIntoView/);
  assert.match(workspace, /behavior: reduceMotion \? "auto" : "smooth"/);
  assert.match(workspace, /block: "nearest"/);
  assert.match(workspace, /inline: "center"/);
  assert.match(workspace, /selected \|\| !hasFocus/);
  assert.match(workspace, /without changing[\s\S]*search or layer focus/);
  assert.doesNotMatch(
    workspace,
    /router\.(push|replace)|window\.location|location\.href/
  );
});

test("BA-121 gives every architecture node one concise responsibility statement", () => {
  const map = buildBeastAdminEcosystemMap();

  for (const node of map.nodes) {
    assert.equal(node.purpose.trim(), node.purpose, node.label);
    assert.equal(node.purpose.endsWith("."), true, node.label);
    assert.equal(
      node.purpose.match(/[.!?](?:\s|$)/g)?.length,
      1,
      node.label
    );
    assert.equal(node.purpose.includes("\n"), false, node.label);
  }

  assert.equal(
    map.nodes.find((node) => node.id === "platform-beastos")?.purpose,
    "The shared operating platform connecting identity, permissions, services, applications, and professional collaboration."
  );
  assert.equal(
    map.nodes.find((node) => node.id === "fusion-beastfusion")?.purpose,
    "Coordinates approved collaboration without becoming a super-agent."
  );
  assert.equal(
    map.nodes.find(
      (node) => node.id === "professional-beastmoney.money-coach"
    )?.purpose,
    "Provides long-term financial guidance while remaining the owner of financial reasoning and financial records."
  );
  assert.equal(
    filterBeastAdminEcosystemNodes(map, {
      query: "evolving understanding of the learner",
    })[0]?.id,
    "professional-beasteducation.guidance-counselor"
  );
});

test("BA-122 explains every layer and visually differentiates arrow meanings", () => {
  const map = buildBeastAdminEcosystemMap();
  const kinds = new Set(
    map.edges.map((edge) =>
      getBeastAdminEcosystemRelationKind(edge.relation)
    )
  );
  assert.deepEqual(
    Array.from(kinds).sort(),
    Array.from(beastAdminEcosystemRelationKinds).sort()
  );
  assert.equal(getBeastAdminEcosystemRelationKind("owns"), "ownership");
  assert.equal(
    getBeastAdminEcosystemRelationKind("authorizes"),
    "authorization"
  );
  assert.equal(getBeastAdminEcosystemRelationKind("informs"), "context");
  assert.equal(getBeastAdminEcosystemRelationKind("routes"), "contribution");

  const workspace = readFileSync(
    "src/app/dashboard/admin/ecosystem/BeastAdminEcosystemVisualizationWorkspace.tsx",
    "utf8"
  );
  for (const copy of [
    "Owns shared platform contracts.",
    "Coordinates approved collaboration.",
    "Provide reusable platform capabilities.",
    "Own domain reasoning.",
    "Own business logic and user experience.",
    "Arrow meaning",
    "Ownership",
    "Authorization",
    "Context",
    "Contribution",
  ]) {
    assert.match(workspace, new RegExp(copy.replace(/[.]/g, "\\.")), copy);
  }
  assert.match(workspace, /Arrowheads point[\s\S]*receiving the relationship/);
  assert.match(workspace, /strokeDasharray={relationship\.dasharray}/);
  assert.match(workspace, /ecosystem-arrow-ownership/);
  assert.match(workspace, /ecosystem-arrow-authorization/);
  assert.match(workspace, /ecosystem-arrow-context/);
  assert.match(workspace, /ecosystem-arrow-contribution/);
  assert.match(workspace, /selectedNode\.purpose/);
  assert.doesNotMatch(workspace, /selectedNode\.description/);
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
  assert.match(workspace, /does not inspect live\s+member data/);
  assert.match(shell, /Ecosystem Map/);
  assert.match(navigation, /Ecosystem Map/);
  assert.doesNotMatch(workspace, /createClient|fetch\(|\.rpc\(/);
  assert.doesNotMatch(workspace, /\.(insert|update|delete|upsert)\(/);
});
