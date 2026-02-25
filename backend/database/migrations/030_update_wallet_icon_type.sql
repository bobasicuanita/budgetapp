-- Migration: 030_update_wallet_icon_type.sql
-- Description: Change wallet icon column from VARCHAR(10) to TEXT to support base64 encoded images

-- ============================================
-- 1. Update icon column type in wallets table
-- ============================================

ALTER TABLE wallets
ALTER COLUMN icon TYPE TEXT;

COMMENT ON COLUMN wallets.icon IS 'Wallet icon - can be an emoji or base64 encoded image (SVG, PNG, JPEG)';
