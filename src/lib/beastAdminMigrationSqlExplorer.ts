import type {
  BeastAdminMigrationEnvironment,
  BeastAdminMigrationState,
} from "./beastAdminMigrationStatus";
import { getBeastMigrationRoadmapIdentity } from "./beastRoadmapIdentity";

export const beastAdminMigrationSafetyLevels = [
  "safe",
  "configuration",
  "data_migration",
  "destructive",
] as const;

export type BeastAdminMigrationSafetyLevel =
  (typeof beastAdminMigrationSafetyLevels)[number];

export type BeastAdminMigrationSafetyAssessment = {
  level: BeastAdminMigrationSafetyLevel;
  irreversible: boolean;
  summary: string;
  signals: string[];
};

export type BeastAdminMigrationSqlMetadata = {
  version: string;
  filename: string;
  roadmapId: string;
  historicalRoadmapId: string | null;
  purpose: string;
  capability: string;
  environmentState: BeastAdminMigrationState;
  expectedObjects: string[];
  createdObjects: string[];
  tables: string[];
  rpcs: string[];
  policies: string[];
  grants: string[];
  triggers: string[];
  safety: BeastAdminMigrationSafetyAssessment;
};

export type BeastAdminMigrationSqlRecord =
  BeastAdminMigrationSqlMetadata & {
    sql: string;
    sourceUrl: string;
  };

export type BeastAdminMigrationSqlExplorerSnapshot = {
  generatedAt: string;
  environment: BeastAdminMigrationEnvironment;
  environmentStatusAvailable: boolean;
  environmentStatusMessage: string;
  migrations: BeastAdminMigrationSqlMetadata[];
  selectedMigration: BeastAdminMigrationSqlRecord;
};

const filenamePattern = /^(\d{14})_([a-z0-9][a-z0-9_]*)\.sql$/;
const roadmapIdPattern =
  /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+\b/;

function unique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));
}

function readableSlug(slug: string) {
  return slug
    .split("_")
    .filter(Boolean)
    .map((word) => {
      const knownTerms: Record<string, string> = {
        ai: "AI",
        api: "API",
        auth: "Authentication",
        rls: "RLS",
        rpc: "RPC",
        sql: "SQL",
      };
      return (
        knownTerms[word] ||
        `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`
      );
    })
    .join(" ");
}

function extractPurpose(sql: string, fallback: string) {
  const leadingComments: string[] = [];
  for (const line of sql.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (leadingComments.length) break;
      continue;
    }
    if (!trimmed.startsWith("--")) break;
    const comment = trimmed
      .replace(/^--\s?/, "")
      .replace(roadmapIdPattern, "")
      .replace(/^:\s*/, "")
      .trim();
    if (
      comment &&
      !/^safe:/i.test(comment) &&
      !/^replace <.+>/i.test(comment)
    ) {
      leadingComments.push(comment);
    }
  }

  return leadingComments.slice(0, 3).join(" ").trim() || fallback;
}

function stripCommentsStringsAndBodies(sql: string) {
  let result = "";
  let index = 0;

  while (index < sql.length) {
    if (sql.startsWith("--", index)) {
      const end = sql.indexOf("\n", index);
      index = end === -1 ? sql.length : end;
      result += "\n";
      continue;
    }
    if (sql.startsWith("/*", index)) {
      const end = sql.indexOf("*/", index + 2);
      index = end === -1 ? sql.length : end + 2;
      result += " ";
      continue;
    }
    if (sql[index] === "'") {
      index += 1;
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2;
          continue;
        }
        if (sql[index] === "'") {
          index += 1;
          break;
        }
        index += 1;
      }
      result += "''";
      continue;
    }
    if (sql[index] === "$") {
      const delimiter = sql.slice(index).match(/^\$[a-zA-Z0-9_]*\$/)?.[0];
      if (delimiter) {
        const end = sql.indexOf(delimiter, index + delimiter.length);
        index = end === -1 ? sql.length : end + delimiter.length;
        result += `${delimiter}${delimiter}`;
        continue;
      }
    }
    result += sql[index];
    index += 1;
  }

  return result;
}

function normalizedIdentifier(value: string) {
  return value.replace(/^"|"$/g, "").replace(/[;,]$/, "");
}

function matches(sql: string, pattern: RegExp, group = 1) {
  return unique(
    Array.from(sql.matchAll(pattern)).flatMap((match) =>
      match[group] ? [normalizedIdentifier(match[group])] : []
    )
  );
}

function extractObjects(sql: string) {
  const tables = unique([
    ...matches(
      sql,
      /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z_][\w.]*|"[^"]+")/gi
    ),
    ...matches(
      sql,
      /\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([a-zA-Z_][\w.]*|"[^"]+")/gi
    ),
    ...matches(
      sql,
      /\b(?:insert\s+into|update|delete\s+from)\s+(?:only\s+)?([a-zA-Z_][\w.]*|"[^"]+")/gi
    ),
  ]);
  const createdTables = matches(
    sql,
    /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z_][\w.]*|"[^"]+")/gi
  );
  const rpcs = matches(
    sql,
    /\bcreate\s+(?:or\s+replace\s+)?function\s+([a-zA-Z_][\w.]*)\s*\(/gi
  );
  const views = matches(
    sql,
    /\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+([a-zA-Z_][\w.]*)/gi
  );
  const types = matches(
    sql,
    /\bcreate\s+type\s+([a-zA-Z_][\w.]*)/gi
  );
  const policies = unique(
    Array.from(
      sql.matchAll(
        /\bcreate\s+policy\s+("[^"]+"|[a-zA-Z_][\w]*)\s+on\s+([a-zA-Z_][\w.]*)/gi
      )
    ).map(
      (match) =>
        `${normalizedIdentifier(match[1])} on ${normalizedIdentifier(match[2])}`
    )
  );
  const triggers = unique(
    Array.from(
      sql.matchAll(
        /\bcreate\s+trigger\s+([a-zA-Z_][\w]*)[\s\S]*?\bon\s+([a-zA-Z_][\w.]*)/gi
      )
    ).map(
      (match) =>
        `${normalizedIdentifier(match[1])} on ${normalizedIdentifier(match[2])}`
    )
  );
  const grants = unique(
    Array.from(sql.matchAll(/\b(?:grant|revoke)\b[\s\S]*?;/gi)).map((match) =>
      match[0].replace(/\s+/g, " ").trim()
    )
  );
  const createdObjects = unique([
    ...createdTables.map((table) => `table ${table}`),
    ...rpcs.map((rpc) => `function ${rpc}`),
    ...views.map((view) => `view ${view}`),
    ...types.map((type) => `type ${type}`),
    ...policies.map((policy) => `policy ${policy}`),
    ...triggers.map((trigger) => `trigger ${trigger}`),
  ]);

  return {
    tables,
    rpcs,
    policies,
    grants,
    triggers,
    createdObjects,
  };
}

export function assessBeastAdminMigrationSafety(
  sql: string
): BeastAdminMigrationSafetyAssessment {
  const executableSql = stripCommentsStringsAndBodies(sql);
  const destructiveSignals = [
    [/\bdrop\s+schema\b/i, "Drops a schema"],
    [/\bdrop\s+table\b/i, "Drops a table"],
    [/\bdrop\s+column\b/i, "Drops a column"],
    [/\btruncate\b/i, "Truncates stored data"],
    [/\bdelete\s+from\b/i, "Deletes stored rows"],
  ] as const;
  const dataSignals = [
    [/\binsert\s+into\b/i, "Inserts stored rows"],
    [/\bupdate\s+[a-zA-Z_]/i, "Updates stored rows"],
  ] as const;
  const configurationSignals = [
    [/\bcreate\s+policy\b/i, "Defines RLS policies"],
    [/\b(?:grant|revoke)\b/i, "Changes database grants"],
    [/\bcreate\s+trigger\b/i, "Defines database triggers"],
    [/\bcreate\s+extension\b/i, "Changes database extensions"],
  ] as const;

  const destructive = destructiveSignals.flatMap(([pattern, label]) =>
    pattern.test(executableSql) ? [label] : []
  );
  const data = dataSignals.flatMap(([pattern, label]) =>
    pattern.test(executableSql) ? [label] : []
  );
  const configuration = configurationSignals.flatMap(([pattern, label]) =>
    pattern.test(executableSql) ? [label] : []
  );

  if (destructive.length) {
    return {
      level: "destructive",
      irreversible: true,
      signals: unique([...destructive, ...data, ...configuration]),
      summary:
        "Contains top-level destructive SQL. Data loss may be irreversible; inspect and back up the target environment before manual execution.",
    };
  }
  if (data.length) {
    return {
      level: "data_migration",
      irreversible: false,
      signals: unique([...data, ...configuration]),
      summary:
        "Changes persisted rows without a detected destructive statement. Review affected records and rollback requirements before manual execution.",
    };
  }
  if (configuration.length) {
    return {
      level: "configuration",
      irreversible: false,
      signals: unique(configuration),
      summary:
        "Changes database configuration, access, or automation. No top-level destructive or data-changing statements were detected.",
    };
  }
  return {
    level: "safe",
    irreversible: false,
    signals: ["No top-level destructive or data-changing statements detected"],
    summary:
      "Appears additive or structural. Manual review is still required before execution in any environment.",
  };
}

export function inspectBeastAdminMigrationSql(input: {
  filename: string;
  sql: string;
  environmentState?: BeastAdminMigrationState;
  expectedObjects?: string[];
}): BeastAdminMigrationSqlMetadata {
  const filenameMatch = input.filename.match(filenamePattern);
  if (!filenameMatch) {
    throw new Error(`Invalid migration filename: ${input.filename}`);
  }
  const declaredRoadmapId = input.sql.match(roadmapIdPattern)?.[0] || null;
  const identity = getBeastMigrationRoadmapIdentity(
    input.filename,
    declaredRoadmapId
  );
  const title = readableSlug(filenameMatch[2]);
  const objects = extractObjects(input.sql);

  return {
    version: filenameMatch[1],
    filename: input.filename,
    roadmapId: identity.roadmapId,
    historicalRoadmapId: identity.historicalRoadmapId,
    purpose: extractPurpose(input.sql, title),
    capability: identity.capability,
    environmentState: input.environmentState || "unknown",
    expectedObjects: unique(
      input.expectedObjects?.length
        ? input.expectedObjects
        : objects.createdObjects
    ),
    ...objects,
    safety: assessBeastAdminMigrationSafety(input.sql),
  };
}

export function normalizeBeastAdminMigrationSqlExplorerSnapshot(
  value: unknown
): BeastAdminMigrationSqlExplorerSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as BeastAdminMigrationSqlExplorerSnapshot;
  if (
    typeof snapshot.generatedAt !== "string" ||
    !snapshot.environment ||
    typeof snapshot.environment.projectRef !== "string" ||
    typeof snapshot.environmentStatusAvailable !== "boolean" ||
    typeof snapshot.environmentStatusMessage !== "string" ||
    !Array.isArray(snapshot.migrations) ||
    !snapshot.selectedMigration ||
    typeof snapshot.selectedMigration.sql !== "string" ||
    !snapshot.migrations.every(
      (migration) =>
        typeof migration.filename === "string" &&
        typeof migration.roadmapId === "string" &&
        (migration.historicalRoadmapId === null ||
          typeof migration.historicalRoadmapId === "string") &&
        beastAdminMigrationSafetyLevels.includes(migration.safety?.level)
    )
  ) {
    return null;
  }
  return snapshot;
}
