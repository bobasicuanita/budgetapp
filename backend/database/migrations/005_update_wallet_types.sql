-- Migration: Update wallet types constraint
-- Description: Removes credit_card, savings, investment from wallet types
--              Wallets are now only for currency accounts (cash, bank, digital_wallet)
--              Credit cards and investments will be separate features

-- ============================================
-- 1. Drop the old CHECK constraint
-- ============================================

ALTER TABLE wallets
DROP CONSTRAINT IF EXISTS wallets_type_check;

-- ============================================
-- 2. Add new CHECK constraint with updated types
-- ============================================

ALTER TABLE wallets
ADD CONSTRAINT wallets_type_check 
CHECK (type IN ('cash', 'bank', 'digital_wallet'));

-- ============================================
-- 3. Update comments
-- ============================================

COMMENT ON TABLE wallets IS 'User currency-based accounts (cash, banks, digital wallets)';
COMMENT ON COLUMN wallets.type IS 'Wallet type: cash, bank, digital_wallet';
