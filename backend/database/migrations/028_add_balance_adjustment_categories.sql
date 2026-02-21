-- Migration: Add Balance Adjustment categories
-- Description: Creates system categories for balance adjustments (income and expense versions)

-- Insert system category for Balance Adjustment (income version)
INSERT INTO categories (name, type, icon, is_system, user_id)
VALUES ('Balance Adjustment', 'income', '⚖️', true, NULL)
ON CONFLICT DO NOTHING;

-- Insert system category for Balance Adjustment (expense version)
INSERT INTO categories (name, type, icon, is_system, user_id)
VALUES ('Balance Adjustment', 'expense', '⚖️', true, NULL)
ON CONFLICT DO NOTHING;
