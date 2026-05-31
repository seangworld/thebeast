-- Add linked_debt_id to funding_sources table
-- This allows funding sources to represent debt accounts (like credit cards)
-- When set, the funding source balance is read from the linked debt balance
ALTER TABLE funding_sources 
ADD COLUMN IF NOT EXISTS linked_debt_id UUID REFERENCES debts(id);

-- Add comment explaining the relationship
COMMENT ON COLUMN funding_sources.linked_debt_id IS 'When set, this funding source represents a debt account. The balance should be read from the linked debt, not stored independently.';
