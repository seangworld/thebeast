-- Add assignment_horizon_months column to cache_settings table
ALTER TABLE cache_settings 
ADD COLUMN IF NOT EXISTS assignment_horizon_months INTEGER DEFAULT 6;

-- Add comment explaining the column
COMMENT ON COLUMN cache_settings.assignment_horizon_months IS 'Planning horizon in months for income/paycheck assignment dropdowns (separate from dashboard lookahead)';
