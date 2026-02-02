-- Migration: Add onboarding and wallets support
-- Description: Adds base_currency to users table and creates wallets table

-- ============================================
-- 1. Update users table with onboarding fields
-- ============================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP DEFAULT NULL;

COMMENT ON COLUMN users.base_currency IS 'User primary currency for reports (ISO 4217 code)';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed initial setup';

-- ============================================
-- 2. Create wallets table
-- ============================================

CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'savings', 'investment')),
  
  -- Financial Info
  currency VARCHAR(3) NOT NULL,  -- ISO 4217 code (EUR, USD, GBP, etc.)
  starting_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  
  -- Display Preferences
  icon VARCHAR(10) DEFAULT NULL,  -- Emoji like '💵', '🏦', '💳'
  color VARCHAR(20) DEFAULT 'blue',  -- UI color theme
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT wallet_currency_length CHECK (LENGTH(currency) = 3)
);

-- ============================================
-- 3. Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_active ON wallets(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(type);

-- ============================================
-- 4. Create trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_wallet_timestamp ON wallets;
CREATE TRIGGER trigger_update_wallet_timestamp
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION update_wallet_updated_at();

-- ============================================
-- 5. Add table comments
-- ============================================

COMMENT ON TABLE wallets IS 'User financial accounts (cash, banks, credit cards, savings)';
COMMENT ON COLUMN wallets.type IS 'Wallet type: cash, bank, credit_card, savings, investment';
COMMENT ON COLUMN wallets.starting_balance IS 'Initial balance when wallet was created (snapshot)';
COMMENT ON COLUMN wallets.current_balance IS 'Current balance (updated by transactions)';
COMMENT ON COLUMN wallets.icon IS 'Emoji icon for display';
COMMENT ON COLUMN wallets.color IS 'UI color theme (blue, green, red, etc.)';
