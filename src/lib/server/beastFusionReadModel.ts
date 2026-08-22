import {
  buildBeastAdminCanonicalReadModel,
  type BeastAdminCanonicalReadModel,
  type BeastFusionStoredSnapshot,
} from "../beastAdminCanonicalProjection";
import { validateBeastFusionCommandProjection } from "../beastFusionCommandProjection";
import { createBeastFusionPublicationClient } from "../supabase/service";

export type BeastFusionCanonicalLoadResult = {
  provider: BeastAdminCanonicalReadModel["provider"];
  canonical: BeastAdminCanonicalReadModel | null;
  status: 200 | 503;
};

export function beastFusionPublicationConfigured() {
  return Boolean(
    process.env.BEASTFUSION_OIDC_AUDIENCE?.trim() &&
      process.env.BEASTFUSION_OIDC_WORKFLOW_REF?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function parseStoredBeastFusionSnapshot(
  value: unknown
): BeastFusionStoredSnapshot | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const validation = validateBeastFusionCommandProjection(record.payload);
  if (!validation.ok) return null;
  if (
    record.payload_hash !== validation.payloadHash ||
    record.projection_id !== validation.projection.projectionId ||
    record.projection_version !== validation.projection.projectionVersion ||
    record.canonical_input_digest !== validation.canonicalInputDigest ||
    record.source_commit !== validation.projection.source.commit ||
    typeof record.accepted_at !== "string" ||
    typeof record.last_confirmed_at !== "string"
  ) {
    return null;
  }
  return {
    projectionId: validation.projection.projectionId,
    projectionVersion: validation.projection.projectionVersion,
    payloadHash: validation.payloadHash,
    canonicalInputDigest: validation.canonicalInputDigest,
    sourceCommit: validation.projection.source.commit,
    generatedAt: validation.projection.generatedAt,
    acceptedAt: record.accepted_at,
    lastConfirmedAt: record.last_confirmed_at,
    payload: validation.projection,
  };
}

export async function loadBeastFusionCanonicalReadModel({
  now = new Date(),
}: {
  now?: Date;
} = {}): Promise<BeastFusionCanonicalLoadResult> {
  const configured = beastFusionPublicationConfigured();
  if (!configured) {
    return {
      provider: {
        status: "not_configured",
        detail: "The server-only BeastFusion publication boundary is not configured.",
        projectionId: null,
        generatedAt: null,
        acceptedAt: null,
        lastConfirmedAt: null,
      },
      canonical: null,
      status: 503,
    };
  }

  try {
    const service = createBeastFusionPublicationClient();
    const result = await service.rpc("get_beastfusion_command_current");
    if (result.error) {
      return {
        provider: {
          status: "error",
          detail: "The canonical projection read model is unavailable.",
          projectionId: null,
          generatedAt: null,
          acceptedAt: null,
          lastConfirmedAt: null,
        },
        canonical: null,
        status: 503,
      };
    }
    if (!result.data) {
      return {
        provider: {
          status: "no_snapshot",
          detail: "No valid canonical BeastFusion projection has been accepted.",
          projectionId: null,
          generatedAt: null,
          acceptedAt: null,
          lastConfirmedAt: null,
        },
        canonical: null,
        status: 200,
      };
    }

    const snapshot = parseStoredBeastFusionSnapshot(result.data);
    if (snapshot) {
      const canonical = buildBeastAdminCanonicalReadModel(snapshot, {
        configured: true,
        now,
      });
      return { provider: canonical.provider, canonical, status: 200 };
    }

    const history = await service
      .from("beastfusion_command_snapshots")
      .select(
        "projection_id,projection_version,payload_hash,canonical_input_digest,source_commit,generated_at,accepted_at,payload"
      )
      .order("accepted_at", { ascending: false })
      .limit(10);
    const lastValid = Array.isArray(history.data)
      ? history.data
          .map((row) =>
            parseStoredBeastFusionSnapshot({
              ...row,
              last_confirmed_at: row.accepted_at,
            })
          )
          .find(
            (candidate): candidate is BeastFusionStoredSnapshot =>
              Boolean(candidate)
          )
      : null;
    if (!lastValid) {
      return {
        provider: {
          status: "drift_detected",
          detail:
            "The current stored snapshot failed identity validation and no prior valid snapshot is available.",
          projectionId: null,
          generatedAt: null,
          acceptedAt: null,
          lastConfirmedAt: null,
        },
        canonical: null,
        status: 503,
      };
    }
    const canonical = buildBeastAdminCanonicalReadModel(lastValid, {
      configured: true,
      now,
    });
    canonical.provider = {
      ...canonical.provider,
      status: "drift_detected",
      detail:
        "The current pointer failed validation; the last known valid immutable snapshot is retained.",
    };
    return { provider: canonical.provider, canonical, status: 503 };
  } catch {
    return {
      provider: {
        status: "error",
        detail: "The canonical projection provider could not be loaded.",
        projectionId: null,
        generatedAt: null,
        acceptedAt: null,
        lastConfirmedAt: null,
      },
      canonical: null,
      status: 503,
    };
  }
}
