export const beastAdminRepositoryMigrationFiles = [
  "20260531000000_dev_schema.sql",
  "20260602000000_add_assignment_columns.sql",
  "20260628000000_add_profiles.sql",
  "20260628000100_add_velocity_settings.sql",
  "20260702000000_add_subscriptions.sql",
  "20260702000100_subscription_billing_customer_updates.sql",
  "20260703000000_add_income_activity_flags.sql",
  "20260703000100_add_profile_identity_fields.sql",
  "20260704000000_add_beastlearning_private_beta.sql",
  "20260705000000_fix_learning_feedback_rls.sql",
  "20260706000000_add_learning_courses_and_activities.sql",
  "20260706000100_add_profile_learning_context.sql",
  "20260713000000_add_learning_session_outcomes.sql",
  "20260714000000_add_beast_goals.sql",
  "20260714000100_add_beast_goal_milestones.sql",
  "20260714000200_add_beast_documents.sql",
  "20260715000000_add_beast_goal_support_items.sql",
  "20260715000100_add_beast_goal_references.sql",
  "20260715000200_add_beast_goal_contributions.sql",
  "20260715000300_add_beast_goal_recommendations.sql",
  "20260715000400_add_beast_goal_lifecycle_events.sql",
  "20260715000500_add_beast_document_module_links.sql",
  "20260715000600_reconcile_canonical_runtime_schema.sql",
  "20260715000700_add_beast_document_storage_bucket.sql",
  "20260715000800_add_beast_document_organization.sql",
  "20260715000900_add_beast_document_access_grants.sql",
  "20260715001000_add_beast_document_calendar_links.sql",
  "20260718000100_add_retirement_scenarios.sql",
  "20260718000200_add_retirement_timeline_reports.sql",
  "20260721000100_add_payment_automation_preferences.sql",
  "20260721000200_link_velocity_to_canonical_debt.sql",
  "20260722000100_add_agent_conversations_and_memory.sql",
  "20260723000100_add_payment_configuration.sql",
  "20260724000000_add_learning_course_lifecycle.sql",
  "20260724000100_fix_learning_course_lifecycle_schema.sql",
  "20260724000200_add_education_profiles.sql",
  "20260724000300_add_guidance_discovery_profile_fields.sql",
  "20260726000000_add_beast_admin_product_roadmap.sql",
  "20260726000100_add_beast_admin_ai_analytics.sql",
  "20260726000200_add_beast_admin_member_timeline.sql",
  "20260726000300_add_beast_admin_beta_feedback.sql",
  "20260726000400_add_beast_admin_feature_flags.sql",
  "20260726000500_add_beast_admin_prompt_library.sql",
  "20260726000600_add_beast_admin_release_center.sql",
  "20260726000700_add_beast_admin_executive_metrics.sql",
  "20260726000800_add_beast_admin_knowledge_inspector.sql",
  "20260726000900_add_authoritative_beast_admin_member_directory.sql",
  "20260726000950_ensure_beast_admin_updated_at_trigger.sql",
  "20260726001000_add_beast_admin_member_account_editing.sql",
  "20260726001100_add_beast_auth_email_workflows.sql",
  "20260726001200_add_beast_admin_member_invitations.sql",
  "20260726001300_add_beast_admin_account_access_history.sql",
  "20260726001400_add_immutable_beast_admin_account_audit_log.sql",
  "20260726001500_add_beast_admin_migration_status.sql",
  "20260726001600_add_beast_admin_member_usage_summary.sql",
  "20260726001700_add_beast_admin_private_messaging.sql",
  "20260726001800_harden_beast_admin_private_messaging.sql",
] as const;

export type BeastAdminMigrationState =
  | "applied"
  | "pending"
  | "applied_out_of_order"
  | "database_only"
  | "duplicate_version"
  | "invalid_filename"
  | "unknown";

export type BeastAdminMigrationRow = {
  version: string | null;
  filename: string;
  name: string;
  repositoryStatus: "present" | "missing";
  databaseStatus: "applied" | "not_applied" | "unknown";
  appliedAt: string | null;
  state: BeastAdminMigrationState;
};

export type BeastAdminMigrationSummary = {
  repositoryMigrations: number;
  applied: number;
  pending: number;
  outOfOrder: number;
  databaseOnly: number;
  duplicateVersions: number;
  invalidFilenames: number;
  latestRepositoryMigration: string | null;
  latestAppliedMigration: string | null;
};

export type BeastAdminMigrationEnvironment = {
  name: string;
  projectRef: string;
  projectLabel: string;
  siteOrigin: string;
  deploymentEnvironment: string;
  branch: string;
  databaseHost: string;
  expectedProjectRef: string | null;
  matchesExpectedProject: boolean | null;
};

export type BeastAdminDatabaseMigration = {
  version: string;
  name: string | null;
  appliedAt: string | null;
};

export type BeastAdminMigrationHistorySource = {
  schema: string;
  table: string;
  available: boolean;
  storesAppliedTimestamp: boolean;
};

export type BeastAdminCapabilityObject = {
  capabilityId: string;
  requiredMigration: string;
  objectId: string;
  kind: "function" | "table" | "view";
  schema: string;
  name: string;
  identity: string;
  exists: boolean;
  authenticatedExecute: boolean | null;
  rlsEnabled: boolean | null;
  policyCount: number | null;
};

export type BeastAdminCapabilityState =
  | "available"
  | "pending_migration"
  | "history_schema_mismatch"
  | "permission_failure"
  | "unknown";

export type BeastAdminCapabilityDiagnostic = {
  id: string;
  label: string;
  state: BeastAdminCapabilityState;
  requiredMigrations: string[];
  migrationStates: BeastAdminMigrationState[];
  objects: BeastAdminCapabilityObject[];
  actualError: {
    code: string | null;
    message: string;
    details: string | null;
    hint: string | null;
  } | null;
  conclusion: string;
};

export type BeastAdminMigrationStatusSnapshot = {
  generatedAt: string;
  environment: BeastAdminMigrationEnvironment;
  historySource: BeastAdminMigrationHistorySource;
  migrations: BeastAdminMigrationRow[];
  summary: BeastAdminMigrationSummary;
  pendingSequence: string[];
  capabilities: BeastAdminCapabilityDiagnostic[];
};

type RawDatabaseSnapshot = {
  historySource: BeastAdminMigrationHistorySource;
  migrations: BeastAdminDatabaseMigration[];
  objects: BeastAdminCapabilityObject[];
};

const migrationFilenamePattern = /^(\d{14})_([a-z0-9][a-z0-9_]*)\.sql$/;

const capabilityLabels: Record<string, string> = {
  executive_metrics: "Executive Metrics",
  member_administration: "Member Administration",
  feature_flags: "Feature Flags",
  release_center: "Release Center",
  beta_feedback: "Beta Feedback",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nullableString(value: unknown) {
  return value === null || value === undefined
    ? null
    : typeof value === "string"
      ? value.trim() || null
      : undefined;
}

function safeErrorString(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, 500)
    : "";
}

export function getBeastAdminMigrationEnvironment(input: {
  supabaseUrl?: string;
  siteOrigin: string;
  vercelEnvironment?: string;
  branch?: string;
  nodeEnvironment?: string;
}) {
  let databaseHost = "Not configured";
  let projectRef = "Not configured";
  try {
    if (input.supabaseUrl) {
      databaseHost = new URL(input.supabaseUrl).hostname;
      projectRef = databaseHost.endsWith(".supabase.co")
        ? databaseHost.slice(0, -".supabase.co".length)
        : databaseHost;
    }
  } catch {
    databaseHost = "Invalid Supabase URL";
    projectRef = "Invalid Supabase URL";
  }

  const deploymentEnvironment = input.vercelEnvironment?.trim() || "local";
  const environmentName =
    deploymentEnvironment === "production"
      ? "Production"
      : deploymentEnvironment === "preview"
        ? "Preview"
        : input.nodeEnvironment === "development"
          ? "Development"
          : "Local build";
  const expectedProjectRef =
    environmentName === "Production"
      ? "grpyzwvgqiwtxadfdtni"
      : environmentName === "Development" || environmentName === "Preview"
        ? "zvzcojwjgnedrouilovc"
        : null;

  return {
    name: environmentName,
    projectRef,
    projectLabel:
      projectRef === "grpyzwvgqiwtxadfdtni"
        ? "thebeast"
        : projectRef === "zvzcojwjgnedrouilovc"
          ? "the-beast-dev"
          : projectRef,
    siteOrigin: input.siteOrigin,
    deploymentEnvironment,
    branch: input.branch?.trim() || "Not available",
    databaseHost,
    expectedProjectRef,
    matchesExpectedProject: expectedProjectRef
      ? projectRef === expectedProjectRef
      : null,
  } satisfies BeastAdminMigrationEnvironment;
}

export function normalizeBeastAdminDatabaseMigrationSnapshot(
  value: unknown
): RawDatabaseSnapshot | null {
  if (
    !isRecord(value) ||
    !isRecord(value.historySource) ||
    !Array.isArray(value.migrations) ||
    !Array.isArray(value.objects)
  ) {
    return null;
  }

  const historySource = value.historySource;
  if (
    typeof historySource.schema !== "string" ||
    typeof historySource.table !== "string" ||
    typeof historySource.available !== "boolean" ||
    typeof historySource.storesAppliedTimestamp !== "boolean"
  ) {
    return null;
  }

  const migrations = value.migrations.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.version !== "string") return [];
    const name = nullableString(entry.name);
    const appliedAt = nullableString(entry.appliedAt);
    if (
      !/^\d{14}$/.test(entry.version) ||
      name === undefined ||
      appliedAt === undefined ||
      (appliedAt !== null && Number.isNaN(Date.parse(appliedAt)))
    ) {
      return [];
    }
    return [{ version: entry.version, name, appliedAt }];
  });

  const objects = value.objects.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.capabilityId !== "string" ||
      typeof entry.requiredMigration !== "string" ||
      typeof entry.objectId !== "string" ||
      !["function", "table", "view"].includes(String(entry.kind)) ||
      typeof entry.schema !== "string" ||
      typeof entry.name !== "string" ||
      typeof entry.identity !== "string" ||
      typeof entry.exists !== "boolean"
    ) {
      return [];
    }
    const authenticatedExecute =
      entry.authenticatedExecute === null ||
      typeof entry.authenticatedExecute === "boolean"
        ? entry.authenticatedExecute
        : undefined;
    const rlsEnabled =
      entry.rlsEnabled === null || typeof entry.rlsEnabled === "boolean"
        ? entry.rlsEnabled
        : undefined;
    const policyCount =
      entry.policyCount === null ||
      (typeof entry.policyCount === "number" &&
        Number.isInteger(entry.policyCount) &&
        entry.policyCount >= 0)
        ? entry.policyCount
        : undefined;
    if (
      authenticatedExecute === undefined ||
      rlsEnabled === undefined ||
      policyCount === undefined
    ) {
      return [];
    }
    return [
      {
        capabilityId: entry.capabilityId,
        requiredMigration: entry.requiredMigration,
        objectId: entry.objectId,
        kind: entry.kind as BeastAdminCapabilityObject["kind"],
        schema: entry.schema,
        name: entry.name,
        identity: entry.identity,
        exists: entry.exists,
        authenticatedExecute,
        rlsEnabled,
        policyCount,
      },
    ];
  });

  if (
    migrations.length !== value.migrations.length ||
    objects.length !== value.objects.length
  ) {
    return null;
  }

  return {
    historySource: {
      schema: historySource.schema,
      table: historySource.table,
      available: historySource.available,
      storesAppliedTimestamp: historySource.storesAppliedTimestamp,
    },
    migrations,
    objects,
  };
}

export function buildBeastAdminMigrationInventory(input: {
  repositoryFiles: readonly string[];
  databaseMigrations: BeastAdminDatabaseMigration[];
  historyAvailable: boolean;
}) {
  const repositoryRecords = input.repositoryFiles.map((filename) => {
    const match = filename.match(migrationFilenamePattern);
    return {
      filename,
      version: match?.[1] || null,
      name: match?.[2] || filename.replace(/\.sql$/, ""),
      valid: Boolean(match),
    };
  });
  const repositoryVersionCounts = new Map<string, number>();
  for (const record of repositoryRecords) {
    if (record.version) {
      repositoryVersionCounts.set(
        record.version,
        (repositoryVersionCounts.get(record.version) || 0) + 1
      );
    }
  }
  const databaseVersionCounts = new Map<string, number>();
  for (const record of input.databaseMigrations) {
    databaseVersionCounts.set(
      record.version,
      (databaseVersionCounts.get(record.version) || 0) + 1
    );
  }
  const databaseByVersion = new Map(
    input.databaseMigrations.map((record) => [record.version, record])
  );
  const validRepositoryVersions = new Set(
    repositoryRecords.flatMap((record) =>
      record.valid && record.version ? [record.version] : []
    )
  );

  const rows: BeastAdminMigrationRow[] = repositoryRecords.map((record) => {
    const databaseRecord = record.version
      ? databaseByVersion.get(record.version)
      : undefined;
    const duplicate =
      Boolean(record.version) &&
      ((repositoryVersionCounts.get(record.version || "") || 0) > 1 ||
        (databaseVersionCounts.get(record.version || "") || 0) > 1);
    let state: BeastAdminMigrationState = "unknown";
    if (!record.valid) state = "invalid_filename";
    else if (duplicate) state = "duplicate_version";
    else if (!input.historyAvailable) state = "unknown";
    else state = databaseRecord ? "applied" : "pending";

    return {
      version: record.version,
      filename: record.filename,
      name: record.name,
      repositoryStatus: "present",
      databaseStatus: !input.historyAvailable
        ? "unknown"
        : databaseRecord
          ? "applied"
          : "not_applied",
      appliedAt: databaseRecord?.appliedAt || null,
      state,
    };
  });

  for (const record of input.databaseMigrations) {
    if (!validRepositoryVersions.has(record.version)) {
      rows.push({
        version: record.version,
        filename: record.name
          ? `${record.version}_${record.name}.sql`
          : `${record.version}_database_only.sql`,
        name: record.name || "Database migration is missing from repository",
        repositoryStatus: "missing",
        databaseStatus: "applied",
        appliedAt: record.appliedAt,
        state:
          (databaseVersionCounts.get(record.version) || 0) > 1
            ? "duplicate_version"
            : "database_only",
      });
    }
  }

  const validRepositoryRows = rows
    .filter(
      (row) => row.repositoryStatus === "present" && row.version !== null
    )
    .sort((left, right) =>
      `${left.version}:${left.filename}`.localeCompare(
        `${right.version}:${right.filename}`
      )
    );
  let encounteredPending = false;
  for (const row of validRepositoryRows) {
    if (row.state === "pending") encounteredPending = true;
    else if (row.state === "applied" && encounteredPending) {
      row.state = "applied_out_of_order";
    }
  }

  rows.sort((left, right) =>
    `${left.version || "z"}:${left.filename}`.localeCompare(
      `${right.version || "z"}:${right.filename}`
    )
  );
  const pendingSequence = rows
    .filter((row) => row.state === "pending")
    .map((row) => row.filename);
  const appliedVersions = rows.flatMap((row) =>
    ["applied", "applied_out_of_order"].includes(row.state) && row.version
      ? [row.version]
      : []
  );
  const repositoryVersions = rows.flatMap((row) =>
    row.repositoryStatus === "present" && row.version ? [row.version] : []
  );

  return {
    migrations: rows,
    pendingSequence,
    summary: {
      repositoryMigrations: repositoryRecords.length,
      applied: rows.filter((row) =>
        ["applied", "applied_out_of_order"].includes(row.state)
      ).length,
      pending: pendingSequence.length,
      outOfOrder: rows.filter(
        (row) => row.state === "applied_out_of_order"
      ).length,
      databaseOnly: rows.filter((row) => row.state === "database_only").length,
      duplicateVersions: rows.filter(
        (row) => row.state === "duplicate_version"
      ).length,
      invalidFilenames: rows.filter(
        (row) => row.state === "invalid_filename"
      ).length,
      latestRepositoryMigration: repositoryVersions.sort().at(-1) || null,
      latestAppliedMigration: appliedVersions.sort().at(-1) || null,
    } satisfies BeastAdminMigrationSummary,
  };
}

export function buildBeastAdminCapabilityDiagnostics(input: {
  migrations: BeastAdminMigrationRow[];
  objects: BeastAdminCapabilityObject[];
  actualErrors?: Record<string, unknown>;
}) {
  const migrationByFilename = new Map(
    input.migrations.map((migration) => [migration.filename, migration])
  );

  return Object.entries(capabilityLabels).map(([id, label]) => {
    const objects = input.objects.filter(
      (object) => object.capabilityId === id
    );
    const requiredMigrations = Array.from(
      new Set(objects.map((object) => object.requiredMigration))
    );
    const migrationStates = requiredMigrations.map(
      (filename) => migrationByFilename.get(filename)?.state || "unknown"
    );
    const rawError = input.actualErrors?.[id];
    const errorRecord = isRecord(rawError) ? rawError : {};
    const message = safeErrorString(errorRecord.message);
    const actualError = rawError
      ? {
          code: safeErrorString(errorRecord.code) || null,
          message: message || "No structured API message was returned.",
          details: safeErrorString(errorRecord.details) || null,
          hint: safeErrorString(errorRecord.hint) || null,
        }
      : null;
    const migrationsApplied =
      migrationStates.length > 0 &&
      migrationStates.every((state) =>
        ["applied", "applied_out_of_order"].includes(state)
      );
    const missingObjects = objects.filter((object) => !object.exists);
    const permissionFailures = objects.filter(
      (object) =>
        object.kind === "function" &&
        object.exists &&
        object.authenticatedExecute === false
    );
    let state: BeastAdminCapabilityState = "unknown";
    let conclusion =
      "Migration history or object verification is not available for this capability.";
    if (
      migrationStates.some((migrationState) => migrationState === "pending")
    ) {
      state = "pending_migration";
      conclusion =
        "At least one required migration is not recorded as applied in this environment.";
    } else if (migrationsApplied && missingObjects.length > 0) {
      state = "history_schema_mismatch";
      conclusion =
        "Migration history reports the requirement as applied, but one or more expected database objects are missing.";
    } else if (permissionFailures.length > 0 || actualError?.code === "42501") {
      state = "permission_failure";
      conclusion =
        "The required object exists, but the authenticated owner request does not have the expected execution permission.";
    } else if (
      migrationsApplied &&
      objects.length > 0 &&
      missingObjects.length === 0 &&
      permissionFailures.length === 0 &&
      !actualError
    ) {
      state = "available";
      conclusion =
        "Migration history, expected objects, and owner execution grants agree.";
    } else if (migrationsApplied && actualError) {
      state = "history_schema_mismatch";
      conclusion =
        "Migration history is applied, but the live capability probe still returned an API error.";
    }

    return {
      id,
      label,
      state,
      requiredMigrations,
      migrationStates,
      objects,
      actualError,
      conclusion,
    } satisfies BeastAdminCapabilityDiagnostic;
  });
}

export function buildBeastAdminMigrationStatusSnapshot(input: {
  databaseSnapshot: RawDatabaseSnapshot;
  environment: BeastAdminMigrationEnvironment;
  actualErrors?: Record<string, unknown>;
  generatedAt?: string;
  repositoryFiles?: readonly string[];
}) {
  const inventory = buildBeastAdminMigrationInventory({
    repositoryFiles:
      input.repositoryFiles || beastAdminRepositoryMigrationFiles,
    databaseMigrations: input.databaseSnapshot.migrations,
    historyAvailable: input.databaseSnapshot.historySource.available,
  });

  return {
    generatedAt: input.generatedAt || new Date().toISOString(),
    environment: input.environment,
    historySource: input.databaseSnapshot.historySource,
    migrations: inventory.migrations,
    summary: inventory.summary,
    pendingSequence: inventory.pendingSequence,
    capabilities: buildBeastAdminCapabilityDiagnostics({
      migrations: inventory.migrations,
      objects: input.databaseSnapshot.objects,
      actualErrors: input.actualErrors,
    }),
  } satisfies BeastAdminMigrationStatusSnapshot;
}

export function normalizeBeastAdminMigrationStatusSnapshot(
  value: unknown
): BeastAdminMigrationStatusSnapshot | null {
  if (!isRecord(value) || typeof value.generatedAt !== "string") return null;
  if (Number.isNaN(Date.parse(value.generatedAt))) return null;
  if (
    !isRecord(value.environment) ||
    !isRecord(value.historySource) ||
    !isRecord(value.summary) ||
    !Array.isArray(value.migrations) ||
    !Array.isArray(value.pendingSequence) ||
    !Array.isArray(value.capabilities)
  ) {
    return null;
  }

  const environment = value.environment as unknown as BeastAdminMigrationEnvironment;
  const historySource =
    value.historySource as unknown as BeastAdminMigrationHistorySource;
  const summary = value.summary as unknown as BeastAdminMigrationSummary;
  if (
    typeof environment.name !== "string" ||
    typeof environment.projectRef !== "string" ||
    typeof environment.projectLabel !== "string" ||
    typeof environment.siteOrigin !== "string" ||
    typeof environment.deploymentEnvironment !== "string" ||
    typeof environment.branch !== "string" ||
    typeof environment.databaseHost !== "string" ||
    !(
      environment.expectedProjectRef === null ||
      typeof environment.expectedProjectRef === "string"
    ) ||
    !(
      environment.matchesExpectedProject === null ||
      typeof environment.matchesExpectedProject === "boolean"
    ) ||
    typeof historySource.schema !== "string" ||
    typeof historySource.table !== "string" ||
    typeof historySource.available !== "boolean" ||
    typeof historySource.storesAppliedTimestamp !== "boolean" ||
    !Object.values(summary).every(
      (item) =>
        item === null ||
        typeof item === "string" ||
        (typeof item === "number" && Number.isInteger(item) && item >= 0)
    )
  ) {
    return null;
  }

  const allowedStates = new Set<BeastAdminMigrationState>([
    "applied",
    "pending",
    "applied_out_of_order",
    "database_only",
    "duplicate_version",
    "invalid_filename",
    "unknown",
  ]);
  if (
    !value.migrations.every(
      (row) =>
        isRecord(row) &&
        (row.version === null || typeof row.version === "string") &&
        typeof row.filename === "string" &&
        typeof row.name === "string" &&
        ["present", "missing"].includes(String(row.repositoryStatus)) &&
        ["applied", "not_applied", "unknown"].includes(
          String(row.databaseStatus)
        ) &&
        (row.appliedAt === null ||
          (typeof row.appliedAt === "string" &&
            !Number.isNaN(Date.parse(row.appliedAt)))) &&
        allowedStates.has(row.state as BeastAdminMigrationState)
    ) ||
    !value.pendingSequence.every((item) => typeof item === "string") ||
    !value.capabilities.every(
      (capability) =>
        isRecord(capability) &&
        typeof capability.id === "string" &&
        typeof capability.label === "string" &&
        [
          "available",
          "pending_migration",
          "history_schema_mismatch",
          "permission_failure",
          "unknown",
        ].includes(String(capability.state)) &&
        Array.isArray(capability.requiredMigrations) &&
        Array.isArray(capability.migrationStates) &&
        Array.isArray(capability.objects) &&
        typeof capability.conclusion === "string"
    )
  ) {
    return null;
  }

  return value as unknown as BeastAdminMigrationStatusSnapshot;
}
