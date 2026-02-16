-- Add 'Fees & Charges' expense category
INSERT INTO categories (name, type, is_system, icon)
SELECT 'Fees & Charges', 'expense', true, '💳'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'Fees & Charges' AND is_system = true
);

-- Add tag suggestions for 'Fees & Charges' category
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Fees & Charges' AND c.is_system = true
  AND t.name IN ('One-time', 'Recurring', 'Planned')
  AND t.is_system = true
  AND NOT EXISTS (
    SELECT 1 FROM category_tag_suggestions cts
    WHERE cts.category_id = c.id AND cts.tag_id = t.id
  );
