import type {
  BeastAdminCapabilityObject,
  BeastAdminMigrationSchemaEvidence,
} from "./beastAdminMigrationStatus";
import type { BeastAdminMigrationSqlMetadata } from "./beastAdminMigrationSqlExplorer";

type OpenApiDocument = {
  paths?: Record<string, unknown>;
  definitions?: Record<
    string,
    {
      properties?: Record<string, unknown>;
    }
  >;
  components?: {
    schemas?: Record<
      string,
      {
        properties?: Record<string, unknown>;
      }
    >;
  };
};

type MigrationSource = {
  metadata: BeastAdminMigrationSqlMetadata;
  sql: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  );
}

function publicName(value: string) {
  return value.replace(/^public\./, "").replace(/^"|"$/g, "");
}

function extractAddedColumns(sql: string) {
  return unique(
    Array.from(
      sql.matchAll(
        /\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(public\.)?([a-zA-Z_][\w]*)[^;]*?\badd\s+column\s+(?:if\s+not\s+exists\s+)?("?[\w]+"?)/gi
      )
    ).map((match) => `${publicName(match[2])}.${publicName(match[3])}`)
  );
}

function relationNames(metadata: BeastAdminMigrationSqlMetadata) {
  return unique(
    metadata.createdObjects.flatMap((object) => {
      const match = object.match(/^(?:table|view)\s+(.+)$/);
      return match ? [publicName(match[1])] : [];
    })
  );
}

function authenticatedRpcNames(metadata: BeastAdminMigrationSqlMetadata) {
  return unique(
    metadata.rpcs.flatMap((rpc) => {
      const name = publicName(rpc);
      const granted = metadata.grants.some((statement) => {
        const normalized = statement.toLowerCase();
        return (
          normalized.includes("grant execute") &&
          normalized.includes(name.toLowerCase()) &&
          normalized.includes("authenticated")
        );
      });
      return granted ? [name] : [];
    })
  );
}

export function buildBeastAdminOpenApiInventory(value: unknown) {
  const document =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as OpenApiDocument)
      : {};
  const definitions =
    document.definitions || document.components?.schemas || {};
  const relations = new Set(Object.keys(definitions).map(publicName));
  const columns = new Set<string>();
  for (const [relation, definition] of Object.entries(definitions)) {
    for (const column of Object.keys(definition.properties || {})) {
      columns.add(`${publicName(relation)}.${publicName(column)}`);
    }
  }
  const paths = Object.keys(document.paths || {});
  for (const path of paths) {
    const relation = path.match(/^\/([^/]+)$/)?.[1];
    if (relation && relation !== "rpc") relations.add(publicName(relation));
  }
  const rpcs = new Set(
    paths.flatMap((path) => {
      const match = path.match(/^\/rpc\/([^/]+)$/);
      return match ? [publicName(match[1])] : [];
    })
  );

  return { relations, columns, rpcs };
}

export function buildBeastAdminMigrationSchemaEvidence(input: {
  migrations: MigrationSource[];
  openApi: unknown | null;
  diagnosticObjects: BeastAdminCapabilityObject[];
}) {
  const inventory = input.openApi
    ? buildBeastAdminOpenApiInventory(input.openApi)
    : null;
  const diagnosticRelations = new Set(
    input.diagnosticObjects.flatMap((object) =>
      object.exists && ["table", "view"].includes(object.kind)
        ? [publicName(object.name)]
        : []
    )
  );
  const diagnosticRpcs = new Set(
    input.diagnosticObjects.flatMap((object) =>
      object.exists && object.kind === "function"
        ? [publicName(object.name)]
        : []
    )
  );

  return Object.fromEntries(
    input.migrations.map(({ metadata, sql }) => {
      const expectedRelations = relationNames(metadata).map(
        (name) => `relation:${name}`
      );
      const expectedColumns = extractAddedColumns(sql).map(
        (name) => `column:${name}`
      );
      const expectedRpcs = authenticatedRpcNames(metadata).map(
        (name) => `rpc:${name}`
      );
      const expectedObjects = unique([
        ...expectedRelations,
        ...expectedColumns,
        ...expectedRpcs,
      ]);
      const presentObjects = expectedObjects.filter((object) => {
        const [kind, name] = object.split(":", 2);
        if (kind === "relation") {
          return (
            inventory?.relations.has(name) ||
            diagnosticRelations.has(name) ||
            false
          );
        }
        if (kind === "column") return inventory?.columns.has(name) || false;
        if (kind === "rpc") {
          return inventory?.rpcs.has(name) || diagnosticRpcs.has(name) || false;
        }
        return false;
      });
      const missingObjects = expectedObjects.filter(
        (object) => !presentObjects.includes(object)
      );
      const safeToExecute = ["safe", "configuration"].includes(
        metadata.safety.level
      );
      let status: BeastAdminMigrationSchemaEvidence["status"] = "unknown";
      let explanation =
        "This migration has no independently observable table, column, view, or authenticated RPC in the available read-only schema inventory.";

      if (!inventory && !input.diagnosticObjects.length) {
        explanation =
          "The live read-only schema inventory is unavailable for this environment.";
      } else if (expectedObjects.length && !missingObjects.length) {
        status = "fully_present";
        explanation = `All ${expectedObjects.length} independently observable live schema objects are present.`;
      } else if (presentObjects.length && missingObjects.length) {
        status = "partial";
        explanation = `${presentObjects.length} of ${expectedObjects.length} independently observable live schema objects are present.`;
      } else if (expectedObjects.length) {
        status = "missing";
        explanation = `None of the ${expectedObjects.length} independently observable live schema objects are present.`;
      }

      return [
        metadata.filename,
        {
          status,
          expectedObjects,
          presentObjects,
          missingObjects,
          safeToExecute,
          explanation,
        } satisfies BeastAdminMigrationSchemaEvidence,
      ];
    })
  );
}
