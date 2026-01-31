-- Add email verification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;

-- Create index on verification token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
