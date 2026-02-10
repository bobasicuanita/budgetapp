-- Migration: Add include_in_balance column to wallets table
-- Description: Adds a boolean field to track if a wallet should be included in available balance calculations

-- Add the column with a default value of true
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS include_in_balance BOOLEAN NOT NULL DEFAULT true;

-- Update comment for the table
COMMENT ON COLUMN wallets.include_in_balance IS 'Whether this wallet should be included in available balance calculations';
