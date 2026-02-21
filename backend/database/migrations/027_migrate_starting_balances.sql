-- Migration: Convert existing starting_balance values to system transactions
-- Description: Creates initial_balance system transactions for all existing wallets

-- ============================================
-- 1. Create initial balance transactions for existing wallets
-- ============================================

-- Get the Initial Balance category ID
DO $$
DECLARE
  initial_balance_category_id UUID;
BEGIN
  -- Get the Initial Balance category
  SELECT id INTO initial_balance_category_id
  FROM categories
  WHERE name = 'Initial Balance' AND is_system = true
  LIMIT 1;

  -- If category doesn't exist, create it
  IF initial_balance_category_id IS NULL THEN
    INSERT INTO categories (name, type, icon, color, is_system, user_id)
    VALUES ('Initial Balance', 'income', 'IconCoin', 'gray', true, NULL)
    RETURNING id INTO initial_balance_category_id;
  END IF;

  -- Create initial balance transactions for all wallets that have starting_balance > 0
  -- and don't already have an initial_balance transaction
  INSERT INTO transactions (
    user_id,
    wallet_id,
    type,
    amount,
    currency,
    description,
    category_id,
    date,
    is_system,
    system_type,
    status,
    base_currency_amount,
    created_at
  )
  SELECT
    w.user_id,
    w.id as wallet_id,
    'income' as type,
    w.starting_balance as amount,
    w.currency,
    'Initial Balance' as description,
    initial_balance_category_id as category_id,
    w.created_at::date as date,  -- Use wallet creation date
    true as is_system,
    'initial_balance' as system_type,
    'actual' as status,
    w.starting_balance as base_currency_amount,  -- Will be recalculated later if needed
    w.created_at
  FROM wallets w
  WHERE w.starting_balance != 0
    AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.wallet_id = w.id
        AND t.system_type = 'initial_balance'
    );

  RAISE NOTICE 'Successfully created initial balance transactions for existing wallets';
END $$;

-- ============================================
-- 2. Update wallet current_balance if needed
-- ============================================

-- Note: current_balance should already be correct, but this ensures consistency
-- This recalculates current_balance from all transactions including the new initial balance ones
UPDATE wallets w
SET current_balance = COALESCE(
  (
    SELECT SUM(t.amount)
    FROM transactions t
    WHERE t.wallet_id = w.id
      AND t.status = 'actual'
  ),
  0
);

COMMENT ON COLUMN wallets.starting_balance IS 'Legacy field - balance is now calculated from transactions. Initial balance is stored as a system transaction with system_type=initial_balance';
