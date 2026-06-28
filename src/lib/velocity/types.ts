export type VelocityRiskLevel = "low" | "medium" | "high";

export type VelocityConfidence = "low" | "medium" | "high";

export type VelocityAccountSnapshot = {
  id?: string;
  name?: string;
  type?: "checking" | "savings" | "credit_card" | "heloc" | "ploc" | "cash" | "other";
  current_balance: number;
  credit_limit?: number | null;
  available_credit?: number | null;
  interest_rate?: number | null;
};

export type VelocityIncomeSnapshot = {
  id?: string;
  name?: string;
  amount: number;
  next_date?: string | null;
  frequency?: string | null;
};

export type VelocityBillSnapshot = {
  id?: string;
  name: string;
  amount: number;
  due_date?: number | null;
  next_due_date?: string | null;
  is_archived?: boolean | null;
};

export type VelocityDebtSnapshot = {
  id?: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
  due_date?: number | null;
  is_archived?: boolean | null;
};

export type VelocitySettingsSnapshot = {
  cash_buffer: number;
  max_recommended_payment?: number | null;
  minimum_cash_after_payment?: number | null;
  strategy?: "conservative" | "balanced" | "aggressive";
};

export type VelocityInputSnapshot = {
  as_of_date?: string;
  accounts: VelocityAccountSnapshot[];
  incomes: VelocityIncomeSnapshot[];
  bills: VelocityBillSnapshot[];
  debts: VelocityDebtSnapshot[];
  settings: VelocitySettingsSnapshot;
};

export type VelocityAlternative = {
  id: string;
  label: string;
  debt_id?: string;
  debt_name?: string;
  payment_amount: number;
  reason: string;
  risk_level: VelocityRiskLevel;
};

export type VelocityRecommendation = {
  id: string;
  label: string;
  debt_id?: string;
  debt_name?: string;
  payment_amount: number;
  reason: string;
  confidence: VelocityConfidence;
};

export type VelocityRiskSummary = {
  risk_level: VelocityRiskLevel;
  confidence: VelocityConfidence;
  reasons: string[];
  warnings: string[];
};

export type VelocityEngineResult = {
  is_valid: boolean;
  available_cash_above_buffer: number;
  target_debt?: VelocityDebtSnapshot;
  recommendation?: VelocityRecommendation;
  alternatives: VelocityAlternative[];
  risk_summary: VelocityRiskSummary;
  validation_errors: string[];
};
