-- Add password reset columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;

-- Create index on reset token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);
