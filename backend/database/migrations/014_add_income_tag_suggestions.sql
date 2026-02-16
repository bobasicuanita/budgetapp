-- Add tag suggestions for income categories

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
  AND t.name IN ('Work', 'Business', 'Client', 'One-time', 'Planned')
  AND t.is_system = true;

-- Business Income → business-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Business Income' AND c.is_system = true
  AND t.name IN ('Business', 'Client', 'Work', 'Recurring')
  AND t.is_system = true;

-- Investment Returns → investment-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Investment Returns' AND c.is_system = true
  AND t.name IN ('Recurring', 'Planned')
  AND t.is_system = true;

-- Rental Income → rental-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Rental Income' AND c.is_system = true
  AND t.name IN ('Recurring', 'Planned')
  AND t.is_system = true;

-- Gifts Received → social tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Gifts Received' AND c.is_system = true
  AND t.name IN ('Family', 'Friends', 'One-time')
  AND t.is_system = true;

-- Refunds → refund-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Refunds' AND c.is_system = true
  AND t.name IN ('One-time')
  AND t.is_system = true;

-- Other Income → general tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Other Income' AND c.is_system = true
  AND t.name IN ('One-time', 'Recurring')
  AND t.is_system = true;
