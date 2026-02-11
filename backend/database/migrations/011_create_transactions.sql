-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  to_wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE, -- For transfers only
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'opening_balance')),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_system BOOLEAN NOT NULL DEFAULT false, -- true for opening_balance transactions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: to_wallet_id should only be set for transfers
  CONSTRAINT check_transfer_wallet CHECK (
    (type = 'transfer' AND to_wallet_id IS NOT NULL) OR 
    (type != 'transfer' AND to_wallet_id IS NULL)
  ),
  
  -- Constraint: opening_balance must be system transaction
  CONSTRAINT check_opening_balance_system CHECK (
    (type = 'opening_balance' AND is_system = true) OR 
    (type != 'opening_balance')
  ),
  
  -- Constraint: category should be set for income/expense, not for transfer/opening_balance
  CONSTRAINT check_category_for_type CHECK (
    (type IN ('income', 'expense') AND category_id IS NOT NULL) OR 
    (type IN ('transfer', 'opening_balance') AND category_id IS NULL)
  )
);

-- Create indexes for faster lookups
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_to_wallet_id ON transactions(to_wallet_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_is_system ON transactions(is_system);

-- Create composite index for common queries (user + date)
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
