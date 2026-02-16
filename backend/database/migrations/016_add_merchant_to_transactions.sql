-- Add merchant column to transactions table (for expense transactions)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS merchant VARCHAR(80);

-- Add index for merchant searches
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant) 
WHERE merchant IS NOT NULL;
