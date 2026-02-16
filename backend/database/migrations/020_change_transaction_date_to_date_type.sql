-- Migration: Change transaction date from TIMESTAMP to DATE
-- Description: Transactions are day-based, not time-based. Users think in terms of "Feb 12" not timezones.
-- This simplifies future date filtering and eliminates timezone confusion for transaction dates.
-- created_at and updated_at remain TIMESTAMP WITH TIME ZONE for audit purposes.

-- Step 1: Convert existing timestamp data to date (preserves the date part, drops time)
ALTER TABLE transactions 
ALTER COLUMN date TYPE DATE USING date::date;

-- Step 2: Keep the NOT NULL constraint
ALTER TABLE transactions 
ALTER COLUMN date SET NOT NULL;

-- Step 3: Update default to CURRENT_DATE instead of NOW()
ALTER TABLE transactions 
ALTER COLUMN date SET DEFAULT CURRENT_DATE;

-- Add comment explaining the design decision
COMMENT ON COLUMN transactions.date IS 'Transaction date (DATE type, no time/timezone). Users think in days, not timestamps. Example: "Feb 12, 2026" is the same for all users regardless of timezone.';
