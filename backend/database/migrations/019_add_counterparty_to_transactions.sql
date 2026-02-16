-- Add counterparty column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS counterparty VARCHAR(80);

-- Create index for counterparty (useful for searching)
CREATE INDEX IF NOT EXISTS idx_transactions_counterparty ON transactions(counterparty) WHERE counterparty IS NOT NULL;
