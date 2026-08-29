export type BeastRoadmapPackageIdentity = {
  roadmapId: string;
  historicalRoadmapIds: readonly string[];
  capability: string;
  artifacts: readonly string[];
  migrationFilenames: readonly string[];
};

export type BeastRoadmapIdentityCollision = {
  identifier: string;
  capabilities: string[];
  roadmapIds: string[];
  artifacts: string[];
};

export type BeastRoadmapIdentityAudit = {
  packageCount: number;
  canonicalCollisions: BeastRoadmapIdentityCollision[];
  historicalCollisions: BeastRoadmapIdentityCollision[];
  warningCount: number;
};

const packageIdentity = (
  roadmapId: string,
  historicalRoadmapIds: readonly string[],
  capability: string,
  artifacts: readonly string[],
  migrationFilenames: readonly string[] = []
): BeastRoadmapPackageIdentity => ({
  roadmapId,
  historicalRoadmapIds,
  capability,
  artifacts,
  migrationFilenames,
});

/**
 * Canonical identities describe roadmap packages without rewriting their
 * historical artifacts. Legacy identifiers remain available for provenance.
 */
export const beastRoadmapPackageRegistry = [
  packageIdentity(
    "BHM-002",
    [],
    "Photo-to-Home-Inventory V1 and Safe Member Availability",
    ["docs/BHM-002-PHOTO-HOME-INVENTORY.md", "supabase/migrations/20260829040000_add_beast_home_inventory.sql"],
    ["20260829040000_add_beast_home_inventory.sql"]
  ),
  packageIdentity(
    "BE-301",
    [],
    "BeastEducation AI Tutor and Homework Helper",
    [
      "docs/BEASTEDUCATION_AI_TUTOR.md",
      "supabase/migrations/20260829033929_add_tutor_outcome_telemetry.sql",
    ],
    ["20260829033929_add_tutor_outcome_telemetry.sql"]
  ),
  packageIdentity(
    "AP-RUN-100",
    ["AP-100"],
    "AI-Native Digital Staff Runtime",
    ["docs/AP-100-AI-NATIVE-DIGITAL-STAFF-RUNTIME.md"]
  ),
  packageIdentity(
    "AP-KNW-104",
    ["AP-104"],
    "Historical Digital Staff Knowledge Reconciliation",
    ["docs/AP-104-HISTORICAL-DIGITAL-STAFF-KNOWLEDGE-RECONCILIATION.md"]
  ),
  packageIdentity(
    "AP-PER-105",
    ["AP-105"],
    "Digital Staff Response Experience",
    ["docs/AP-105-DIGITAL-STAFF-RESPONSE-EXPERIENCE.md"]
  ),
  packageIdentity(
    "BA-AUT-101",
    ["BA-101"],
    "Member and Authentication Data Audit",
    ["docs/BA-101-MEMBER-AUTH-DATA-AUDIT.md"]
  ),
  packageIdentity(
    "BA-RDM-101",
    ["BA-102"],
    "Product Roadmap",
    ["supabase/migrations/20260726000000_add_beast_admin_product_roadmap.sql"],
    ["20260726000000_add_beast_admin_product_roadmap.sql"]
  ),
  packageIdentity(
    "BA-ANA-101",
    ["BA-103"],
    "AI Analytics",
    ["supabase/migrations/20260726000100_add_beast_admin_ai_analytics.sql"],
    ["20260726000100_add_beast_admin_ai_analytics.sql"]
  ),
  packageIdentity(
    "BA-TML-101",
    ["BA-104"],
    "Member Timeline",
    ["supabase/migrations/20260726000200_add_beast_admin_member_timeline.sql"],
    ["20260726000200_add_beast_admin_member_timeline.sql"]
  ),
  packageIdentity(
    "BA-FBK-101",
    ["BA-105"],
    "Beta Feedback",
    ["supabase/migrations/20260726000300_add_beast_admin_beta_feedback.sql"],
    ["20260726000300_add_beast_admin_beta_feedback.sql"]
  ),
  packageIdentity(
    "BA-FLG-101",
    ["BA-106"],
    "Feature Flags",
    ["supabase/migrations/20260726000400_add_beast_admin_feature_flags.sql"],
    ["20260726000400_add_beast_admin_feature_flags.sql"]
  ),
  packageIdentity(
    "BA-PWD-101",
    ["BA-106"],
    "Password Recovery Deployment",
    ["docs/BA-106-PASSWORD-RECOVERY-DEPLOYMENT.md"]
  ),
  packageIdentity(
    "BA-PRM-101",
    ["BA-107"],
    "Prompt Library",
    ["supabase/migrations/20260726000500_add_beast_admin_prompt_library.sql"],
    ["20260726000500_add_beast_admin_prompt_library.sql"]
  ),
  packageIdentity(
    "BA-AUTH-101",
    ["BA-107"],
    "Authentication Email Workflows",
    [
      "docs/BA-107-AUTH-EMAIL-WORKFLOWS.md",
      "supabase/migrations/20260726001100_add_beast_auth_email_workflows.sql",
    ],
    ["20260726001100_add_beast_auth_email_workflows.sql"]
  ),
  packageIdentity(
    "BA-REL-101",
    ["BA-108"],
    "Release Center",
    ["supabase/migrations/20260726000600_add_beast_admin_release_center.sql"],
    ["20260726000600_add_beast_admin_release_center.sql"]
  ),
  packageIdentity(
    "BA-INV-101",
    ["BA-108"],
    "Controlled Member Invitations",
    [
      "docs/BA-108-CONTROLLED-MEMBER-INVITATIONS.md",
      "supabase/migrations/20260726001200_add_beast_admin_member_invitations.sql",
    ],
    ["20260726001200_add_beast_admin_member_invitations.sql"]
  ),
  packageIdentity(
    "BA-ACC-101",
    ["BA-109"],
    "Account Access History",
    [
      "docs/BA-109-ACCOUNT-ACCESS-HISTORY.md",
      "supabase/migrations/20260726001300_add_beast_admin_account_access_history.sql",
    ],
    ["20260726001300_add_beast_admin_account_access_history.sql"]
  ),
  packageIdentity(
    "BA-MET-101",
    ["BA-110"],
    "Executive Metrics",
    ["supabase/migrations/20260726000700_add_beast_admin_executive_metrics.sql"],
    ["20260726000700_add_beast_admin_executive_metrics.sql"]
  ),
  packageIdentity(
    "BA-AUD-101",
    ["BA-110"],
    "Immutable Account Audit Log",
    [
      "docs/BA-110-IMMUTABLE-ACCOUNT-AUDIT-LOG.md",
      "supabase/migrations/20260726001400_add_immutable_beast_admin_account_audit_log.sql",
    ],
    ["20260726001400_add_immutable_beast_admin_account_audit_log.sql"]
  ),
  packageIdentity(
    "BA-KNO-101",
    ["BA-112"],
    "Knowledge Inspector",
    ["supabase/migrations/20260726000800_add_beast_admin_knowledge_inspector.sql"],
    ["20260726000800_add_beast_admin_knowledge_inspector.sql"]
  ),
  packageIdentity(
    "BA-MIG-101",
    ["BA-119"],
    "Migration Status",
    ["supabase/migrations/20260726001500_add_beast_admin_migration_status.sql"],
    ["20260726001500_add_beast_admin_migration_status.sql"]
  ),
  packageIdentity(
    "BA-MEM-101",
    ["BA-102"],
    "Authoritative Member Directory",
    [
      "docs/BA-102-OWNER-MEMBER-DIRECTORY.md",
      "supabase/migrations/20260726000900_add_authoritative_beast_admin_member_directory.sql",
    ],
    ["20260726000900_add_authoritative_beast_admin_member_directory.sql"]
  ),
  packageIdentity(
    "BA-IAM-101",
    ["BA-103"],
    "Member Account Editing",
    [
      "docs/BA-103-MEMBER-ACCOUNT-EDITING.md",
      "docs/BA-103-MIGRATION-DEPENDENCY-REPAIR.md",
      "supabase/migrations/20260726000950_ensure_beast_admin_updated_at_trigger.sql",
      "supabase/migrations/20260726001000_add_beast_admin_member_account_editing.sql",
    ],
    [
      "20260726000950_ensure_beast_admin_updated_at_trigger.sql",
      "20260726001000_add_beast_admin_member_account_editing.sql",
    ]
  ),
  packageIdentity(
    "BA-USG-101",
    ["BA-128"],
    "Member Usage Summary",
    ["supabase/migrations/20260726001600_add_beast_admin_member_usage_summary.sql"],
    ["20260726001600_add_beast_admin_member_usage_summary.sql"]
  ),
  packageIdentity(
    "BA-MSG-101",
    ["BA-129"],
    "Private Admin Messaging",
    [
      "supabase/migrations/20260726001700_add_beast_admin_private_messaging.sql",
      "supabase/migrations/20260726001800_harden_beast_admin_private_messaging.sql",
    ],
    [
      "20260726001700_add_beast_admin_private_messaging.sql",
      "20260726001800_harden_beast_admin_private_messaging.sql",
    ]
  ),
  packageIdentity(
    "BA-VER-101",
    ["BA-130"],
    "Email Verification Outreach",
    [
      "supabase/migrations/20260726001900_add_email_verification_outreach_policy.sql",
    ],
    ["20260726001900_add_email_verification_outreach_policy.sql"]
  ),
  packageIdentity(
    "BA-ID-101",
    ["BA-131"],
    "Roadmap Identity Integrity",
    ["docs/BA-131-ROADMAP-IDENTITY-AUDIT.md"]
  ),
  packageIdentity(
    "BA-NAV-101",
    ["BA-131"],
    "BeastAdmin Navigation Cleanup",
    [
      "src/app/dashboard/admin/BeastAdminShell.tsx",
      "src/lib/moduleNavigation.ts",
      "tests/beastAdminNavigationCleanup.test.ts",
    ]
  ),
  packageIdentity(
    "BA-MSQL-101",
    ["BA-132"],
    "Migration SQL Explorer",
    [
      "src/lib/beastAdminMigrationSqlExplorer.ts",
      "src/app/api/admin/migration-sql-explorer/route.ts",
      "src/app/dashboard/admin/migrations/explorer/BeastAdminMigrationSqlExplorerWorkspace.tsx",
      "tests/beastAdminMigrationSqlExplorer.test.ts",
    ]
  ),
  packageIdentity(
    "BA-HDR-101",
    ["BA-132"],
    "BeastAdmin Workspace Headers",
    [
      "src/app/dashboard/admin/BeastAdminShell.tsx",
      "tests/beastAdminPageHeaders.test.ts",
    ]
  ),
  packageIdentity(
    "BA-MIGAUD-101",
    ["BA-133"],
    "Supabase Migration Reconciliation Audit",
    [
      "src/lib/beastAdminMigrationStatus.ts",
      "tests/beastAdminMigrationStatus.test.ts",
    ]
  ),
  packageIdentity(
    "BA-IA-101",
    ["BA-133"],
    "BeastAdmin Information Architecture",
    [
      "docs/BA-133-BEASTADMIN-INFORMATION-ARCHITECTURE.md",
      "src/lib/moduleNavigation.ts",
      "src/app/dashboard/layout.tsx",
      "tests/beastAdminInformationArchitecture.test.ts",
    ]
  ),
  packageIdentity(
    "BA-CMD-001A",
    ["BA-CMD-001A"],
    "BeastFusion Canonical Projection Ingestion and Immutable Read Model",
    [
      "docs/BA-CMD-001A-CANONICAL-PROJECTION-INGESTION.md",
      "src/lib/beastFusionCommandProjection.ts",
      "src/lib/beastAdminCanonicalProjection.ts",
      "src/app/api/admin/beastfusion-projection/route.ts",
      "supabase/migrations/20260821000500_add_beastfusion_command_projection.sql",
      "supabase/migrations/20260821000600_pin_beastfusion_oidc_subject.sql",
      "tests/beastAdminCanonicalProjection.test.ts",
    ],
    ["20260821000500_add_beastfusion_command_projection.sql", "20260821000600_pin_beastfusion_oidc_subject.sql"]
  ),
  packageIdentity(
    "BA-REC-134",
    ["BA-134"],
    "Forward-only Migration Reconciliation",
    [
      "supabase/migrations/20260726002000_reconcile_beast_auth_email_workflows.sql",
      "supabase/migrations/20260726002100_reconcile_beast_admin_member_invitations.sql",
      "supabase/migrations/20260726002200_reconcile_beast_admin_account_access_history.sql",
    ],
    [
      "20260726002000_reconcile_beast_auth_email_workflows.sql",
      "20260726002100_reconcile_beast_admin_member_invitations.sql",
      "20260726002200_reconcile_beast_admin_account_access_history.sql",
    ]
  ),
  packageIdentity(
    "BA-LYT-101",
    ["BA-134"],
    "BeastAdmin Layout Standard",
    [
      "docs/BA-134-BEASTADMIN-LAYOUT-STANDARD.md",
      "tests/beastAdminLayoutStandard.test.ts",
    ]
  ),
  packageIdentity(
    "DB-AUD-001",
    ["DB-001"],
    "SQL, Migration, and Database Integrity Audit",
    [
      "docs/DB-001_DATABASE_INTEGRITY_AUDIT.md",
      "supabase/seed.sql",
      "tests/databaseIntegrityAudit.test.ts",
    ]
  ),
  packageIdentity(
    "AP-107",
    ["AP-107"],
    "Digital Staff Proposal Approval",
    [
      "src/app/api/digital-staff/runtime/route.ts",
      "src/lib/digitalStaffRuntime/persistence.ts",
      "supabase/migrations/20260809000100_restore_member_health_record_rls.sql",
      "tests/digitalStaffPersistence.test.ts",
      "tests/guidedHistoricalReview.test.ts",
    ],
    ["20260809000100_restore_member_health_record_rls.sql"]
  ),
  packageIdentity(
    "BH-REL-01",
    ["BH-REL-01"],
    "BeastHealth General-Member Release Readiness",
    [
      "supabase/migrations/20260809000200_prepare_member_health_rls.sql",
      "tests/healthReleaseReadiness.test.ts",
    ],
    ["20260809000200_prepare_member_health_rls.sql"]
  ),
  packageIdentity(
    "BO-600",
    ["BO-600"],
    "Beast-wide age-based member entitlements",
    [
      "src/lib/memberAgeEntitlements.ts",
      "src/lib/memberAgeServer.ts",
      "src/middleware.ts",
      "supabase/migrations/20260809000300_define_member_age_entitlements.sql",
      "tests/memberAgeEntitlements.test.ts",
    ],
    ["20260809000300_define_member_age_entitlements.sql"]
  ),
  packageIdentity(
    "BM-FND-033",
    ["BM-33"],
    "Funding Rules",
    ["docs/BM-33-FUNDING-RULES.md", "docs/BM-33-COMPLETION.md"]
  ),
  packageIdentity(
    "BM-RET-034",
    ["BM-34"],
    "Retirement Assumptions",
    ["docs/BM-34-COMPLETION.md"]
  ),
  packageIdentity(
    "BM-RET-035",
    ["BM-35"],
    "Retirement Timeline",
    ["docs/BM-35-RETIREMENT-TIMELINE.md", "docs/BM-35-COMPLETION.md"]
  ),
  packageIdentity(
    "BM-PAY-309",
    ["BM-309"],
    "Payment Configuration",
    ["supabase/migrations/20260723000100_add_payment_configuration.sql"],
    ["20260723000100_add_payment_configuration.sql"]
  ),
  packageIdentity(
    "BM-BUG-002",
    ["BM-BUG-002"],
    "Funding Source Recommendation Audit",
    ["docs/BEASTMONEY_BM_BUG_002_RECOMMENDATION_AUDIT.md"]
  ),
  packageIdentity(
    "BM-DBT-037",
    ["BM-37"],
    "Money Coach Debt Awareness",
    [
      "docs/BM-37-MONEY-COACH-DEBT-AWARENESS.md",
      "supabase/migrations/20260801000300_track_debt_interest_changes.sql",
    ],
    ["20260801000300_track_debt_interest_changes.sql"]
  ),
  packageIdentity(
    "BM-VEL-040",
    ["BM-40", "BM-41"],
    "Velocity Banking and Paid-Off Debt Lifecycle",
    [
      "src/lib/debtLifecycle.ts",
      "src/app/dashboard/money/velocity/page.tsx",
      "supabase/migrations/20260808000100_add_debt_lifecycle.sql",
    ],
    ["20260808000100_add_debt_lifecycle.sql"]
  ),
  packageIdentity(
    "BO-501",
    ["BO-501"],
    "BeastOS Life Planning Hub",
    [
      "docs/BO-501-BEASTGOALS-LIFE-PLANNING-HUB.md",
      "src/lib/platform/lifePlanning.ts",
      "src/app/dashboard/goals/LifePlanningHub.tsx",
      "supabase/migrations/20260801000700_transform_beast_goals_life_planning_hub.sql",
    ],
    ["20260801000700_transform_beast_goals_life_planning_hub.sql"]
  ),
  packageIdentity(
    "BO-502",
    ["BO-502"],
    "Contextual Shared Workspaces and Education Planning Navigation",
    ["docs/BO-502-CONTEXTUAL-WORKSPACES.md"]
  ),
  packageIdentity(
    "BE-201",
    ["BE-201"],
    "Education and Career Intelligence",
    [
      "docs/BE-201-EDUCATION-CAREER-INTELLIGENCE.md",
      "src/lib/education/careerIntelligence.ts",
      "src/lib/education/documentExtraction.ts",
      "src/app/api/education/research/route.ts",
      "src/app/api/education/documents/[documentId]/extract/route.ts",
      "supabase/migrations/20260801000600_add_education_career_intelligence.sql",
    ],
    ["20260801000600_add_education_career_intelligence.sql"]
  ),
  packageIdentity(
    "BH-201",
    ["BH-201"],
    "BeastHealth Onboarding and Discovery",
    ["supabase/migrations/20260801000400_add_beast_health_discovery.sql"],
    ["20260801000400_add_beast_health_discovery.sql"]
  ),
  packageIdentity(
    "BH-204",
    ["BH-204"],
    "Intelligent Medical Records",
    [
      "src/lib/health/documentExtraction.ts",
      "src/app/api/health/documents/[documentId]/extract/route.ts",
      "supabase/migrations/20260801000500_add_health_document_extractions.sql",
    ],
    ["20260801000500_add_health_document_extractions.sql"]
  ),
  packageIdentity(
    "BA-ADS-201",
    ["BA-ADS-201"],
    "Revenue Center and AdSense Management",
    ["docs/BEASTADMIN_REVENUE_CENTER.md"]
  ),
  packageIdentity(
    "BA-ADS-202",
    ["BA-ADS-202"],
    "Google OAuth for Revenue Center",
    ["supabase/migrations/20260801000200_add_google_oauth_connections.sql"],
    ["20260801000200_add_google_oauth_connections.sql"]
  ),
  packageIdentity(
    "BO-405",
    ["BO-405"],
    "Shared Member Session Detection",
    [
      "docs/SHARED_MEMBER_SESSION_DETECTION.md",
      "tests/sharedMemberSessionDetection.test.ts",
    ]
  ),
  packageIdentity(
    "BO-503",
    ["BO-503"],
    "Digital Staff Director",
    [
      "docs/BO-503-DIGITAL-STAFF-DIRECTOR.md",
      "src/lib/director.ts",
      "src/app/api/director/conversations/route.ts",
      "src/app/dashboard/director/DirectorExperience.tsx",
      "tests/digitalStaffDirector.test.ts",
    ]
  ),
  packageIdentity(
    "BA-TEL-001",
    ["BA-TEL-001"],
    "First-Party Ecosystem Telemetry",
    [
      "docs/BA-TEL-001-FIRST-PARTY-TELEMETRY.md",
      "supabase/migrations/20260817000100_add_first_party_ecosystem_telemetry.sql",
    ],
    ["20260817000100_add_first_party_ecosystem_telemetry.sql"]
  ),
  packageIdentity(
    "SW-SEO-229",
    ["SW-SEO-229"],
    "SEANGWORLD Search Opportunity Intelligence",
    [
      "docs/SW-SEO-229-SEARCH-OPPORTUNITY-INTELLIGENCE.md",
      "src/lib/seangworldIntelligence.ts",
      "src/lib/server/seangworldGoogleProviders.ts",
      "src/app/dashboard/admin/intelligence/SeangworldIntelligenceWorkspace.tsx",
      "tests/seangworldIntelligence.test.ts",
      "tests/seangworldGoogleProviders.test.ts",
    ]
  ),
  packageIdentity(
    "SW-QTG-001",
    ["SW-QTG-001"],
    "SEANGWORLD Qualified Traffic Growth Intelligence",
    [
      "docs/SW-QTG-001-QUALIFIED-TRAFFIC-GROWTH.md",
      "src/lib/seangworldIntelligence.ts",
      "src/lib/server/seangworldGoogleProviders.ts",
      "src/app/dashboard/admin/intelligence/SeangworldIntelligenceWorkspace.tsx",
      "src/app/dashboard/admin/marketing/BeastMarketingWorkspace.tsx",
      "tests/qualifiedTrafficGrowth.test.ts",
      "tests/seangworldIntelligence.test.ts",
      "tests/seangworldGoogleProviders.test.ts",
    ]
  ),
  packageIdentity(
    "SEC-002",
    ["SEC-002"],
    "Supabase Public Schema Grant Review",
    [
      "supabase/migrations/20260823023000_restore_server_only_beast_admin_rpc_grants.sql",
      "tests/publicSchemaGrantReview.test.ts",
    ],
    ["20260823023000_restore_server_only_beast_admin_rpc_grants.sql"]
  ),
  packageIdentity(
    "BM-43",
    ["BM-43"],
    "Recurring Bill Occurrence Payment Integrity",
    [
      "supabase/migrations/20260827231649_add_bill_payment_occurrence_identity.sql",
      "src/lib/billPaymentOccurrences.ts",
      "tests/billPaymentOccurrences.test.ts",
    ],
    ["20260827231649_add_bill_payment_occurrence_identity.sql"]
  ),
] as const satisfies readonly BeastRoadmapPackageIdentity[];

function collisionsFor(
  registry: readonly BeastRoadmapPackageIdentity[],
  identifiers: (entry: BeastRoadmapPackageIdentity) => readonly string[]
) {
  const matches = new Map<string, BeastRoadmapPackageIdentity[]>();
  for (const entry of registry) {
    for (const identifier of identifiers(entry)) {
      matches.set(identifier, [...(matches.get(identifier) || []), entry]);
    }
  }

  return Array.from(matches.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([identifier, entries]) => ({
      identifier,
      capabilities: entries.map((entry) => entry.capability).sort(),
      roadmapIds: entries.map((entry) => entry.roadmapId).sort(),
      artifacts: entries.flatMap((entry) => entry.artifacts).sort(),
    }))
    .sort((left, right) => left.identifier.localeCompare(right.identifier));
}

export function auditBeastRoadmapIdentities(
  registry: readonly BeastRoadmapPackageIdentity[] =
    beastRoadmapPackageRegistry
): BeastRoadmapIdentityAudit {
  const canonicalCollisions = collisionsFor(registry, (entry) => [
    entry.roadmapId,
  ]);
  const historicalCollisions = collisionsFor(
    registry,
    (entry) => entry.historicalRoadmapIds
  );

  return {
    packageCount: registry.length,
    canonicalCollisions,
    historicalCollisions,
    warningCount: canonicalCollisions.length + historicalCollisions.length,
  };
}

export function validateFutureRoadmapIdentifier(
  identifier: string,
  registry: readonly BeastRoadmapPackageIdentity[] =
    beastRoadmapPackageRegistry
) {
  const normalized = identifier.trim().toLocaleUpperCase();
  const conflicts = registry.filter(
    (entry) =>
      entry.roadmapId === normalized ||
      entry.historicalRoadmapIds.includes(normalized)
  );

  return {
    identifier: normalized,
    available: /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+[A-Z]?$/.test(normalized) &&
      conflicts.length === 0,
    conflicts: conflicts.map((entry) => ({
      roadmapId: entry.roadmapId,
      capability: entry.capability,
    })),
    warning:
      conflicts.length > 0
        ? `${normalized} already identifies ${conflicts
            .map((entry) => entry.capability)
            .join(" and ")}. Choose a globally unique roadmap ID.`
        : null,
  };
}

export function getBeastMigrationRoadmapIdentity(
  filename: string,
  declaredRoadmapId?: string | null
) {
  const registered = beastRoadmapPackageRegistry.find((entry) =>
    entry.migrationFilenames.includes(filename)
  );
  if (registered) {
    return {
      roadmapId: registered.roadmapId,
      historicalRoadmapId:
        declaredRoadmapId || registered.historicalRoadmapIds[0] || null,
      capability: registered.capability,
    };
  }

  const version = filename.match(/^(\d{14})_/)?.[1] || "UNVERSIONED";
  return {
    roadmapId: `MIG-${version}`,
    historicalRoadmapId: declaredRoadmapId || null,
    capability: filename
      .replace(/^\d{14}_/, "")
      .replace(/\.sql$/, "")
      .split("_")
      .filter(Boolean)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(" "),
  };
}
