import assert from "node:assert/strict";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationsDirectory = join(root, "supabase", "migrations");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry) ? [path] : [];
  });
}

function canonicalSql() {
  return readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(migrationsDirectory, file), "utf8"))
    .join("\n");
}

function matches(source: string, pattern: RegExp, group = 1) {
  return Array.from(source.matchAll(pattern), (match) => match[group])
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/^public\./, ""));
}

test("DB-001 canonical migrations have unique ordered versions", () => {
  const files = readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const versions = files.map((file) => file.slice(0, 14));

  assert.equal(files.length, 93);
  assert.equal(new Set(versions).size, versions.length);
  assert.deepEqual(
    files,
    [...files].sort((left, right) => left.localeCompare(right))
  );
  for (const file of files) {
    assert.match(file, /^\d{14}_[a-z0-9_]+\.sql$/);
  }
});

test("DB-001 every canonical public table enables RLS", () => {
  const sql = canonicalSql();
  const createdTables = new Set(
    matches(
      sql,
      /\bcreate\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?([a-z0-9_]+)/gi
    )
  );
  const rlsTables = new Set(
    matches(
      sql,
      /\balter\s+table(?:\s+if\s+exists)?\s+(?:public\.)?([a-z0-9_]+)\s+enable\s+row\s+level\s+security/gi
    )
  );

  assert.equal(createdTables.size, 119);
  assert.deepEqual(
    Array.from(createdTables).filter((table) => !rlsTables.has(table)),
    []
  );
  assert.doesNotMatch(sql, /\busing\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(sql, /\bwith\s+check\s*\(\s*true\s*\)/i);
});

test("DB-001 public foreign-key targets exist in the canonical stream", () => {
  const sql = canonicalSql();
  const createdTables = new Set(
    matches(
      sql,
      /\bcreate\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?([a-z0-9_]+)/gi
    )
  );
  const referencedTables = new Set(
    matches(sql, /\breferences\s+public\.([a-z0-9_]+)\s*\(/gi)
  );

  assert.deepEqual(
    Array.from(referencedTables).filter((table) => !createdTables.has(table)),
    []
  );
});

test("DB-001 security-definer functions use an explicit search path", () => {
  const sql = canonicalSql();
  const functionBlocks = sql
    .split(/(?=create\s+(?:or\s+replace\s+)?function\s+)/i)
    .slice(1);
  const unsafeFunctions = functionBlocks.flatMap((block) => {
    const header = block.slice(0, 1400);
    if (!/security\s+definer/i.test(header)) return [];
    if (
      /set\s+search_path/i.test(header) ||
      /set_config\s*\(\s*'search_path'/i.test(header)
    ) {
      return [];
    }
    return [
      header.match(
        /function\s+(?:public\.)?([a-z0-9_]+)/i
      )?.[1] || "unknown",
    ];
  });

  assert.deepEqual(unsafeFunctions, []);
});

test("DB-001 application table and RPC literals exist in canonical migrations", () => {
  const sql = canonicalSql();
  const createdTables = new Set(
    matches(
      sql,
      /\bcreate\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?([a-z0-9_]+)/gi
    )
  );
  const createdFunctions = new Set(
    matches(
      sql,
      /\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)/gi
    )
  );
  const source = sourceFiles(join(root, "src"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const relationReferences = new Set([
    ...matches(
      source,
      /\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g
    ),
    ...matches(
      source,
      /\b[a-z0-9_]*DatabaseTableName\s*=\s*["'`]([^"'`]+)["'`]/gi
    ),
  ]);
  const rpcReferences = new Set(
    matches(source, /\.rpc\(\s*["'`]([^"'`]+)["'`]/g)
  );
  const storageBuckets = new Set(["beast-documents"]);

  assert.deepEqual(
    Array.from(relationReferences).filter(
      (relation) =>
        !createdTables.has(relation) && !storageBuckets.has(relation)
    ),
    []
  );
  assert.deepEqual(
    Array.from(rpcReferences).filter((rpc) => !createdFunctions.has(rpc)),
    []
  );
});

test("DB-001 legacy migration mirrors stay traceable and outside the CLI stream", () => {
  const legacyDirectory = join(root, "migrations");
  const canonicalFiles = readdirSync(migrationsDirectory);
  const legacyFiles = readdirSync(legacyDirectory).filter(
    (file) => /^\d{8}_.+\.sql$/.test(file)
  );

  assert.equal(legacyFiles.length, 22);
  for (const legacyFile of legacyFiles) {
    const canonicalFile = canonicalFiles.find(
      (candidate) =>
        candidate.startsWith(legacyFile.slice(0, 8)) &&
        candidate.replace(/^\d{14}_/, "") ===
          legacyFile.replace(/^\d{8}_/, "")
    );
    assert.ok(canonicalFile, `No canonical mirror for ${legacyFile}`);
    assert.equal(
      readFileSync(join(legacyDirectory, legacyFile), "utf8"),
      readFileSync(join(migrationsDirectory, canonicalFile), "utf8"),
      `${legacyFile} no longer matches ${canonicalFile}`
    );
  }
  assert.equal(
    canonicalFiles.includes("dev_seed_placeholders.sql"),
    false
  );
});

test("DB-001 local seed configuration has a safe canonical target", () => {
  const config = readFileSync(join(root, "supabase", "config.toml"), "utf8");
  const seed = readFileSync(join(root, "supabase", "seed.sql"), "utf8");

  assert.match(config, /\[db\.seed\][\s\S]*?enabled\s*=\s*true/);
  assert.match(config, /sql_paths\s*=\s*\["\.\/seed\.sql"\]/);
  assert.equal(existsSync(join(root, "supabase", "seed.sql")), true);
  assert.doesNotMatch(seed, /\binsert\s+into\b/i);
});

test("DB-001 service-role credentials remain server-only", () => {
  const clientSources = sourceFiles(join(root, "src")).filter((file) => {
    const source = readFileSync(file, "utf8");
    return /^\s*["']use client["'];/m.test(source);
  });

  for (const file of clientSources) {
    assert.doesNotMatch(
      readFileSync(file, "utf8"),
      /SUPABASE_SERVICE_ROLE_KEY/,
      file
    );
  }
});
