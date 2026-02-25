-- Migration: 029_add_is_archived_to_wallets.sql
-- Description: Adds is_archived column to wallets table for archiving wallets

-- ============================================
-- 1. Add is_archived column to wallets table
-- ============================================

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_wallets_is_archived ON wallets(is_archived);

COMMENT ON COLUMN wallets.is_archived IS 'Whether this wallet has been archived (hidden from active wallets list)';
