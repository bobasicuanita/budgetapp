-- Add status column to transactions table
-- Status can be: 'actual', 'planned', 'scheduled'
-- Default is 'actual' for existing and new transactions

ALTER TABLE transactions
ADD COLUMN status VARCHAR(20) DEFAULT 'actual' CHECK (status IN ('actual', 'planned', 'scheduled'));

-- Set all existing transactions to 'actual'
UPDATE transactions SET status = 'actual' WHERE status IS NULL;
