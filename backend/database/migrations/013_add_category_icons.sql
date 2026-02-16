-- Add icon column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(10);

-- Update system expense categories with icons
UPDATE categories SET icon = '🍽️' WHERE name = 'Food & Dining' AND is_system = true;
UPDATE categories SET icon = '🎬' WHERE name = 'Entertainment' AND is_system = true;
UPDATE categories SET icon = '🛍️' WHERE name = 'Shopping' AND is_system = true;
UPDATE categories SET icon = '🚗' WHERE name = 'Transportation' AND is_system = true;
UPDATE categories SET icon = '🏠' WHERE name = 'Housing' AND is_system = true;
UPDATE categories SET icon = '🏥' WHERE name = 'Healthcare' AND is_system = true;
UPDATE categories SET icon = '📚' WHERE name = 'Education' AND is_system = true;
UPDATE categories SET icon = '💇' WHERE name = 'Personal Care' AND is_system = true;
UPDATE categories SET icon = '💡' WHERE name = 'Utilities' AND is_system = true;
UPDATE categories SET icon = '✈️' WHERE name = 'Travel' AND is_system = true;
UPDATE categories SET icon = '📱' WHERE name = 'Subscriptions' AND is_system = true;
UPDATE categories SET icon = '🛡️' WHERE name = 'Insurance' AND is_system = true;
UPDATE categories SET icon = '🛒' WHERE name = 'Groceries' AND is_system = true;
UPDATE categories SET icon = '🎁' WHERE name = 'Gifts & Donations' AND is_system = true;
UPDATE categories SET icon = '📦' WHERE name = 'Other Expenses' AND is_system = true;

-- Update system income categories with icons
UPDATE categories SET icon = '💼' WHERE name = 'Salary' AND is_system = true;
UPDATE categories SET icon = '💻' WHERE name = 'Freelance' AND is_system = true;
UPDATE categories SET icon = '🏢' WHERE name = 'Business Income' AND is_system = true;
UPDATE categories SET icon = '📈' WHERE name = 'Investment Returns' AND is_system = true;
UPDATE categories SET icon = '🏡' WHERE name = 'Rental Income' AND is_system = true;
UPDATE categories SET icon = '🎁' WHERE name = 'Gifts Received' AND is_system = true;
UPDATE categories SET icon = '↩️' WHERE name = 'Refunds' AND is_system = true;
UPDATE categories SET icon = '💰' WHERE name = 'Other Income' AND is_system = true;
