-- Migration: Increase amount precision to support more decimal places
-- Changes DECIMAL(15, 2) to NUMERIC(21, 6) for all amount and balance columns
-- This allows for:
-- - 15 integer digits (max: 999,999,999,999,999)
-- - 6 decimal places (supports currencies with 0-4 decimal places per ISO 4217)
-- Note: NUMERIC(21, 6) means 21 total digits with 6 for decimals = 15 integer digits

-- Update wallets table
ALTER TABLE wallets
  ALTER COLUMN starting_balance TYPE NUMERIC(21, 6),
  ALTER COLUMN current_balance TYPE NUMERIC(21, 6);

-- Update transactions table
ALTER TABLE transactions
  ALTER COLUMN amount TYPE NUMERIC(21, 6),
  ALTER COLUMN base_currency_amount TYPE NUMERIC(21, 6);

-- Update exchange_rates table
ALTER TABLE exchange_rates
  ALTER COLUMN rate TYPE NUMERIC(20, 10);

COMMENT ON COLUMN wallets.starting_balance IS 'Initial balance with up to 6 decimal places (NUMERIC(21, 6))';
COMMENT ON COLUMN wallets.current_balance IS 'Current balance with up to 6 decimal places (NUMERIC(21, 6))';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount with up to 6 decimal places (NUMERIC(21, 6))';
COMMENT ON COLUMN transactions.base_currency_amount IS 'Amount in base currency with up to 6 decimal places (NUMERIC(21, 6))';
COMMENT ON COLUMN exchange_rates.rate IS 'Exchange rate with up to 10 decimal places for precision (NUMERIC(20, 10))';
