import { parseOptionalNumber } from "../formatters";

export type VelocitySourceType = "heloc" | "ploc" | "credit_card" | "other";

export type VelocitySettings = {
  selected_debt_id: string;
  velocity_source_type: VelocitySourceType;
  credit_limit: string;
  current_balance: string;
  source_apr: string;
  max_utilization_percent: string;
  recovery_months: string;
  emergency_reserve_amount: string;
  allow_super_velocity: boolean;
};

export const VELOCITY_SETTINGS_STORAGE_KEY = "beast_velocity_settings_v1";

export const DEFAULT_VELOCITY_SETTINGS: VelocitySettings = {
  selected_debt_id: "",
  velocity_source_type: "heloc",
  credit_limit: "",
  current_balance: "",
  source_apr: "",
  max_utilization_percent: "66",
  recovery_months: "6",
  emergency_reserve_amount: "",
  allow_super_velocity: false,
};

export function toInputString(value: unknown) {
  if (value == null) return "";
  return String(value);
}

export function mapVelocitySettingsRow(row: any): VelocitySettings {
  return {
    selected_debt_id: toInputString(row?.selected_debt_id),
    velocity_source_type:
      row?.velocity_source_type || DEFAULT_VELOCITY_SETTINGS.velocity_source_type,
    credit_limit: toInputString(row?.credit_limit),
    current_balance: toInputString(row?.current_balance),
    source_apr: toInputString(row?.source_apr),
    max_utilization_percent: toInputString(
      row?.max_utilization_percent ??
        DEFAULT_VELOCITY_SETTINGS.max_utilization_percent
    ),
    recovery_months: toInputString(
      row?.recovery_months ?? DEFAULT_VELOCITY_SETTINGS.recovery_months
    ),
    emergency_reserve_amount: toInputString(row?.emergency_reserve_amount),
    allow_super_velocity: Boolean(row?.allow_super_velocity),
  };
}

export function mergeStoredVelocitySettings(value: string | null) {
  if (!value) return null;

  try {
    return {
      ...DEFAULT_VELOCITY_SETTINGS,
      ...JSON.parse(value),
    } as VelocitySettings;
  } catch {
    return null;
  }
}

export function velocitySettingsToUpsertPayload(
  velocitySettings: VelocitySettings
) {
  return {
    selected_debt_id: velocitySettings.selected_debt_id || null,
    max_utilization_percent:
      parseOptionalNumber(velocitySettings.max_utilization_percent) ?? 66,
    recovery_months: parseOptionalNumber(velocitySettings.recovery_months) ?? 6,
    emergency_reserve_amount: parseOptionalNumber(
      velocitySettings.emergency_reserve_amount
    ),
    allow_super_velocity: velocitySettings.allow_super_velocity,
  };
}
