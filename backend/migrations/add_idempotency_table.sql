-- Migration: Add idempotency_keys table for persistent idempotency tracking
-- This prevents duplicate transactions even after server restarts

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(255) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Composite unique constraint
  UNIQUE(user_id, idempotency_key)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_key 
ON idempotency_keys(user_id, idempotency_key);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at 
ON idempotency_keys(expires_at);

-- Auto-cleanup function (removes expired entries)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Note: You can set up a scheduled job to run this periodically
-- For now, cleanup will happen opportunistically in the middleware
