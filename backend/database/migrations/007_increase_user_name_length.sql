-- Migration: Increase user name field length
-- Description: Increases name field from VARCHAR(100) to VARCHAR(200) to accommodate longer names

ALTER TABLE users 
ALTER COLUMN name TYPE VARCHAR(200);

COMMENT ON COLUMN users.name IS 'User full name (max 200 characters)';
