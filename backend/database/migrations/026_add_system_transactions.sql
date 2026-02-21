-- Migration: Add system transaction support
-- Description: Adds system_type column to transactions for initial_balance and balance_adjustment transactions

-- ============================================
-- 1. Add system_type column to transactions
-- ============================================

ALTER TABLE transactions
ADD COLUMN system_type VARCHAR(50);

COMMENT ON COLUMN transactions.system_type IS 'Type of system transaction: initial_balance, balance_adjustment, or NULL for user transactions';

-- Create index for system transactions
CREATE INDEX IF NOT EXISTS idx_transactions_system_type ON transactions(system_type) WHERE system_type IS NOT NULL;

-- ============================================
-- 2. Create system categories
-- ============================================

-- Insert system category for Initial Balance (if it doesn't exist)
INSERT INTO categories (name, type, icon, is_system, user_id)
VALUES ('Initial Balance', 'income', '💰', true, NULL)
ON CONFLICT DO NOTHING;

-- Insert system category for Balance Adjustment (income version)
INSERT INTO categories (name, type, icon, is_system, user_id)
VALUES ('Balance Adjustment', 'income', '⚖️', true, NULL)
ON CONFLICT DO NOTHING;

-- Insert system category for Balance Adjustment (expense version)
INSERT INTO categories (name, type, icon, is_system, user_id)
VALUES ('Balance Adjustment', 'expense', '⚖️', true, NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. Add constraint to ensure system transactions have system_type
-- ============================================

-- Ensure that if is_system = true, system_type must be set
ALTER TABLE transactions
ADD CONSTRAINT check_system_transaction_type
CHECK (
  (is_system = false AND system_type IS NULL) OR
  (is_system = true AND system_type IS NOT NULL)
);

COMMENT ON TABLE transactions IS 'Transaction records including user transactions and system transactions (initial_balance, balance_adjustment)';
