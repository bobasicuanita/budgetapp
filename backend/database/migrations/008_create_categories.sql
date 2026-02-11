-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS category_tag_suggestions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_is_system ON categories(is_system);

-- Insert default system categories for expenses
INSERT INTO categories (name, type, is_system) VALUES
  ('Food & Dining', 'expense', true),
  ('Entertainment', 'expense', true),
  ('Shopping', 'expense', true),
  ('Transportation', 'expense', true),
  ('Housing', 'expense', true),
  ('Healthcare', 'expense', true),
  ('Education', 'expense', true),
  ('Personal Care', 'expense', true),
  ('Utilities', 'expense', true),
  ('Travel', 'expense', true),
  ('Subscriptions', 'expense', true),
  ('Insurance', 'expense', true),
  ('Groceries', 'expense', true),
  ('Gifts & Donations', 'expense', true),
  ('Other Expenses', 'expense', true);

-- Insert default system categories for income
INSERT INTO categories (name, type, is_system) VALUES
  ('Salary', 'income', true),
  ('Freelance', 'income', true),
  ('Business Income', 'income', true),
  ('Investment Returns', 'income', true),
  ('Rental Income', 'income', true),
  ('Gifts Received', 'income', true),
  ('Refunds', 'income', true),
  ('Other Income', 'income', true);
