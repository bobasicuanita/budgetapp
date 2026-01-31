-- Create token blacklist table
CREATE TABLE IF NOT EXISTS blacklisted_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_token ON blacklisted_tokens(token);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_expires ON blacklisted_tokens(expires_at);
