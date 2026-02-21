-- Migration: Add exchange rate tracking to transactions
-- Description: Store exchange rate information for multi-currency transactions

-- ============================================
-- 1. Add exchange rate columns to transactions
-- ============================================

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(20, 10),
ADD COLUMN IF NOT EXISTS manual_exchange_rate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS base_currency_amount DECIMAL(15, 2);

-- ============================================
-- 2. Create index for exchange rate lookups
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_exchange_rate_date 
ON transactions(exchange_rate_date);

-- ============================================
-- 3. Add comments
-- ============================================

COMMENT ON COLUMN transactions.exchange_rate_date IS 'Date of the exchange rate used for conversion';
COMMENT ON COLUMN transactions.exchange_rate_used IS 'Exchange rate applied (1 base currency = X transaction currency)';
COMMENT ON COLUMN transactions.manual_exchange_rate IS 'Whether exchange rate was manually entered by user';
COMMENT ON COLUMN transactions.base_currency_amount IS 'Transaction amount converted to user base currency';

-- ============================================
-- 4. Backfill existing transactions
-- ============================================

-- For existing transactions, base_currency_amount equals amount
-- (assuming they were all in base currency)
UPDATE transactions
SET base_currency_amount = amount
WHERE base_currency_amount IS NULL;
