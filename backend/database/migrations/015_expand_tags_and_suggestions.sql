-- Add new tags to the system (only if they don't already exist)

-- Investment tags
INSERT INTO tags (name, is_system)
SELECT 'Stocks', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Stocks')
UNION ALL
SELECT 'Forex', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Forex')
UNION ALL
SELECT 'Cryptocurrency', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Cryptocurrency');

-- Education tags
INSERT INTO tags (name, is_system)
SELECT 'Courses', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Courses')
UNION ALL
SELECT 'School', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'School')
UNION ALL
SELECT 'University', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'University')
UNION ALL
SELECT 'Seminar', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Seminar')
UNION ALL
SELECT 'Online Learning', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Online Learning');

-- Grocery tags
INSERT INTO tags (name, is_system)
SELECT 'Supermarket', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Supermarket')
UNION ALL
SELECT 'Butchery', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Butchery')
UNION ALL
SELECT 'Bakery', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Bakery');

-- Healthcare tags
INSERT INTO tags (name, is_system)
SELECT 'Hospital', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Hospital')
UNION ALL
SELECT 'Health Examinations', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Health Examinations');

-- Housing tags
INSERT INTO tags (name, is_system)
SELECT 'Mortgage Payment', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Mortgage Payment')
UNION ALL
SELECT 'Renovations', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Renovations')
UNION ALL
SELECT 'Repairs', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Repairs')
UNION ALL
SELECT 'Services', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Services');

-- Insurance tags
INSERT INTO tags (name, is_system)
SELECT 'Car Insurance', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Car Insurance')
UNION ALL
SELECT 'Health Insurance', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Health Insurance')
UNION ALL
SELECT 'Housing Insurance', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Housing Insurance');

-- Other expenses tags
INSERT INTO tags (name, is_system)
SELECT 'Miscellaneous', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Miscellaneous')
UNION ALL
SELECT 'One-off', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'One-off')
UNION ALL
SELECT 'Unexpected', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Unexpected');

-- Subscription tags
INSERT INTO tags (name, is_system)
SELECT 'Netflix', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Netflix')
UNION ALL
SELECT 'Spotify', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Spotify')
UNION ALL
SELECT 'Gym', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Gym')
UNION ALL
SELECT 'iCloud', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'iCloud')
UNION ALL
SELECT 'Adobe', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Adobe');

-- Transportation tags
INSERT INTO tags (name, is_system)
SELECT 'Car Taxes', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Car Taxes');

-- Travel tags
INSERT INTO tags (name, is_system)
SELECT 'Flight', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Flight')
UNION ALL
SELECT 'Hotel', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Hotel')
UNION ALL
SELECT 'Accommodation', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Accommodation')
UNION ALL
SELECT 'Transport', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Transport')
UNION ALL
SELECT 'Car Rental', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Car Rental')
UNION ALL
SELECT 'Vacation', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Vacation')
UNION ALL
SELECT 'Weekend', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Weekend')
UNION ALL
SELECT 'Work Trip', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Work Trip')
UNION ALL
SELECT 'Abroad', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Abroad')
UNION ALL
SELECT 'Domestic', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Domestic');

-- Utilities tags
INSERT INTO tags (name, is_system)
SELECT 'Electricity', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Electricity')
UNION ALL
SELECT 'Water', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Water')
UNION ALL
SELECT 'Gas', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Gas')
UNION ALL
SELECT 'Internet', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Internet')
UNION ALL
SELECT 'Phone', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Phone')
UNION ALL
SELECT 'Trash/Waste', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Trash/Waste')
UNION ALL
SELECT 'Heating', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Heating')
UNION ALL
SELECT 'Cable/TV', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Cable/TV')
UNION ALL
SELECT 'Security', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Security')
UNION ALL
SELECT 'Sewer', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Sewer');

-- Personal care tags
INSERT INTO tags (name, is_system)
SELECT 'Haircut', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Haircut')
UNION ALL
SELECT 'Skincare', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Skincare')
UNION ALL
SELECT 'Cosmetics/Makeup', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Cosmetics/Makeup')
UNION ALL
SELECT 'Massage', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Massage')
UNION ALL
SELECT 'Spa', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Spa')
UNION ALL
SELECT 'Wellness', true
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Wellness');

-- ============================================
-- CLEAR EXISTING SUGGESTIONS AND REBUILD
-- ============================================

DELETE FROM category_tag_suggestions;

-- ============================================
-- INCOME CATEGORIES
-- ============================================

-- Salary → work-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Salary' AND c.is_system = true
  AND t.name IN ('Work', 'Recurring', 'Planned')
  AND t.is_system = true;

-- Freelance → freelance-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Freelance' AND c.is_system = true
  AND t.name IN ('Work', 'Business', 'Client', 'One-time', 'Planned', 'Recurring')
  AND t.is_system = true;

-- Business Income → business-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Business Income' AND c.is_system = true
  AND t.name IN ('Business', 'Client', 'Work', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Investment Returns → investment-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Investment Returns' AND c.is_system = true
  AND t.name IN ('Stocks', 'Forex', 'Cryptocurrency', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Rental Income → rental-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Rental Income' AND c.is_system = true
  AND t.name IN ('Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Gifts Received → social tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Gifts Received' AND c.is_system = true
  AND t.name IN ('Family', 'Friends', 'One-time', 'Planned')
  AND t.is_system = true;

-- Refunds → refund-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Refunds' AND c.is_system = true
  AND t.name IN ('One-time', 'Planned')
  AND t.is_system = true;

-- Other Income → general tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Other Income' AND c.is_system = true
  AND t.name IN ('One-time', 'Recurring', 'Planned', 'Miscellaneous')
  AND t.is_system = true;

-- ============================================
-- EXPENSE CATEGORIES
-- ============================================

-- Food & Dining → food-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Food & Dining' AND c.is_system = true
  AND t.name IN ('Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Coffee', 'Fast Food', 'Restaurant', 'Friends', 'Family', 'Date', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Groceries → grocery-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Groceries' AND c.is_system = true
  AND t.name IN ('Supermarket', 'Butchery', 'Bakery', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Transportation → transportation-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Transportation' AND c.is_system = true
  AND t.name IN ('Public Transit', 'Taxi/Uber', 'Fuel', 'Parking', 'Car Maintenance', 'Car Taxes', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Shopping → shopping-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Shopping' AND c.is_system = true
  AND t.name IN ('Clothing', 'Electronics', 'Furniture', 'Home Decor', 'Books', 'Games', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Entertainment → entertainment-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Entertainment' AND c.is_system = true
  AND t.name IN ('Movies', 'Concert', 'Sports Event', 'Games', 'Party', 'Friends', 'Family', 'Date', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Healthcare → healthcare-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Healthcare' AND c.is_system = true
  AND t.name IN ('Doctor', 'Pharmacy', 'Hospital', 'Health Examinations', 'Urgent', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Education → education-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Education' AND c.is_system = true
  AND t.name IN ('Courses', 'School', 'University', 'Seminar', 'Books', 'Online Learning', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Fitness → fitness-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Fitness' AND c.is_system = true
  AND t.name IN ('Gym', 'Fitness', 'Sports Event', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Personal Care → personal care-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Personal Care' AND c.is_system = true
  AND t.name IN ('Haircut', 'Skincare', 'Cosmetics/Makeup', 'Massage', 'Spa', 'Wellness', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Gifts & Donations → social tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Gifts & Donations' AND c.is_system = true
  AND t.name IN ('Family', 'Friends', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Travel → travel-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Travel' AND c.is_system = true
  AND t.name IN ('Flight', 'Hotel', 'Accommodation', 'Transport', 'Car Rental', 'Vacation', 'Business', 'Weekend', 'Work Trip', 'Abroad', 'Domestic', 'Planned', 'One-time')
  AND t.is_system = true;

-- Utilities → utility-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Utilities' AND c.is_system = true
  AND t.name IN ('Electricity', 'Water', 'Gas', 'Internet', 'Phone', 'Trash/Waste', 'Heating', 'Cable/TV', 'Security', 'Sewer', 'Recurring', 'Planned')
  AND t.is_system = true;

-- Housing → housing-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Housing' AND c.is_system = true
  AND t.name IN ('Mortgage Payment', 'Renovations', 'Repairs', 'Services', 'Furniture', 'Home Decor', 'Recurring', 'Planned', 'One-time')
  AND t.is_system = true;

-- Insurance → insurance-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Insurance' AND c.is_system = true
  AND t.name IN ('Car Insurance', 'Health Insurance', 'Housing Insurance', 'Recurring', 'Planned')
  AND t.is_system = true;

-- Subscriptions → subscription-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Subscriptions' AND c.is_system = true
  AND t.name IN ('Netflix', 'Spotify', 'Gym', 'iCloud', 'Adobe', 'Streaming', 'Recurring', 'Planned')
  AND t.is_system = true;

-- Other Expenses → general tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Other Expenses' AND c.is_system = true
  AND t.name IN ('Miscellaneous', 'One-off', 'Unexpected', 'One-time', 'Planned')
  AND t.is_system = true;
