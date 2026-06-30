export type VelocityRiskLevel = "low" | "medium" | "high";

export type VelocityConfidence = "low" | "medium" | "high";

export type VelocityCandidateKind =
  | "minimum_only"
  | "highest_apr"
  | "lowest_balance"
  | "hold_cash";

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
  max_source_utilization_percent?: number | null;
  minimum_cash_after_payment?: number | null;
  monthly_recovery_capacity?: number | null;
  recovery_months?: number | null;
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
  kind?: VelocityCandidateKind;
  debt_id?: string;
  debt_name?: string;
  payment_amount: number;
  reason: string;
  risk_level: VelocityRiskLevel;
  score?: number;
  score_breakdown?: VelocityScoreBreakdown;
  rationale?: string[];
  assumptions?: string[];
  projected_cash_after_payment?: number;
};

export type VelocityRecommendation = {
  id: string;
  label: string;
  kind?: VelocityCandidateKind;
  debt_id?: string;
  debt_name?: string;
  payment_amount: number;
  reason: string;
  confidence: VelocityConfidence;
  score?: number;
  score_breakdown?: VelocityScoreBreakdown;
  rationale?: string[];
  assumptions?: string[];
  projected_cash_after_payment?: number;
};

export type VelocityScoreBreakdown = {
  interest_priority: number;
  liquidity_safety: number;
  strategy_alignment: number;
  risk_reduction: number;
  total: number;
};

export type VelocityCashflowProjection = {
  period_days: number;
  starting_cash: number;
  projected_income: number;
  projected_bills: number;
  projected_minimum_payments: number;
  projected_cash_before_velocity_payment: number;
  available_cash_above_buffer: number;
  assumptions: string[];
};

export type VelocityConstraintResult = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type VelocityCandidateEvaluation = {
  id: string;
  label: string;
  kind: VelocityCandidateKind;
  debt_id?: string;
  debt_name?: string;
  payment_amount: number;
  projected_cash_after_payment: number;
  risk_level: VelocityRiskLevel;
  is_viable: boolean;
  constraints: VelocityConstraintResult[];
  score: number;
  score_breakdown: VelocityScoreBreakdown;
  rationale: string[];
  assumptions: string[];
};

export type VelocityRiskSummary = {
  risk_level: VelocityRiskLevel;
  confidence: VelocityConfidence;
  reasons: string[];
  warnings: string[];
  assumptions?: string[];
};

export type VelocityChunkConstraint = {
  id:
    | "liquidity_floor"
    | "safe_source_capacity"
    | "recovery_window"
    | "target_balance"
    | "max_recommended_payment"
    | "positive_net_savings";
  label: string;
  value: number;
  passed: boolean;
  detail: string;
};

export type VelocityChunkRecommendation = {
  recommended_chunk: number;
  limiting_constraint_id: VelocityChunkConstraint["id"];
  limiting_constraint_label: string;
  hold_reason?: string;
  projected_net_savings: number;
  constraints: VelocityChunkConstraint[];
  rationale: string[];
};

export type VelocityRecoveryTimeline = {
  months_required: number | null;
  recovery_months: number;
  monthly_recovery_capacity: number;
  status: "Not Available" | "Within Guardrails" | "Exceeds Guardrails";
  completion_date: string;
};

export type VelocityInterestSavings = {
  baseline_total_interest: number;
  velocity_total_interest: number;
  gross_interest_saved: number;
  velocity_source_interest_cost: number;
  net_interest_saved: number;
  projected_interest_saved: number;
  months_compared: number;
  baseline_payoff_completed: boolean;
  velocity_payoff_completed: boolean;
  target_debt_id?: string;
  target_debt_name?: string;
  velocity_payment_amount: number;
  source_apr: number;
  source_starting_balance: number;
  source_balance_after_velocity_payment: number;
  monthly_source_repayment: number;
  source_repayment_months: number;
  source_repayment_completed: boolean;
  assumptions: string[];
};

export type VelocityEngineResult = {
  is_valid: boolean;
  available_cash_above_buffer: number;
  target_debt?: VelocityDebtSnapshot;
  recommendation?: VelocityRecommendation;
  alternatives: VelocityAlternative[];
  cashflow_projection?: VelocityCashflowProjection;
  chunk_recommendation?: VelocityChunkRecommendation;
  recovery_timeline?: VelocityRecoveryTimeline;
  interest_savings?: VelocityInterestSavings;
  constraints?: VelocityConstraintResult[];
  candidate_evaluations?: VelocityCandidateEvaluation[];
  rationale?: string[];
  assumptions?: string[];
  risk_summary: VelocityRiskSummary;
  validation_errors: string[];
};
