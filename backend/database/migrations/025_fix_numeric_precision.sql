-- Migration: Fix numeric precision from NUMERIC(20,6) to NUMERIC(21,6)
-- This corrects the previous migration to properly support 15 integer digits
-- NUMERIC(21, 6) = 21 total digits - 6 decimal places = 15 integer digits max

-- Update wallets table
ALTER TABLE wallets
  ALTER COLUMN starting_balance TYPE NUMERIC(21, 6),
  ALTER COLUMN current_balance TYPE NUMERIC(21, 6);

-- Update transactions table
ALTER TABLE transactions
  ALTER COLUMN amount TYPE NUMERIC(21, 6),
  ALTER COLUMN base_currency_amount TYPE NUMERIC(21, 6);

-- Update comments to reflect correct precision
COMMENT ON COLUMN wallets.starting_balance IS 'Initial balance with up to 6 decimal places (NUMERIC(21, 6) = 15 integer digits max)';
COMMENT ON COLUMN wallets.current_balance IS 'Current balance with up to 6 decimal places (NUMERIC(21, 6) = 15 integer digits max)';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount with up to 6 decimal places (NUMERIC(21, 6) = 15 integer digits max)';
COMMENT ON COLUMN transactions.base_currency_amount IS 'Amount in base currency with up to 6 decimal places (NUMERIC(21, 6) = 15 integer digits max)';
