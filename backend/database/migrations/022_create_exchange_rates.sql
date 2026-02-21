-- Migration: Create exchange_rates table
-- Description: Stores daily USD-based exchange rates for all currencies

-- ============================================
-- 1. Create exchange_rates table
-- ============================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  rate DECIMAL(20, 10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_date_currency UNIQUE (date, currency_code),
  CONSTRAINT currency_code_length CHECK (LENGTH(currency_code) = 3)
);

-- ============================================
-- 2. Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(date DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(currency_code);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date_currency ON exchange_rates(date, currency_code);

-- ============================================
-- 3. Add comments
-- ============================================

COMMENT ON TABLE exchange_rates IS 'Daily exchange rates with USD as base currency';
COMMENT ON COLUMN exchange_rates.date IS 'Date of the exchange rate (no timestamp)';
COMMENT ON COLUMN exchange_rates.currency_code IS 'Target currency code (ISO 4217)';
COMMENT ON COLUMN exchange_rates.rate IS 'Exchange rate from USD to target currency';
