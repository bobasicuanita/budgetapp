-- Add 'Recurring' tag suggestion to 'Other Expenses' category
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Other Expenses' AND c.is_system = true
  AND t.name = 'Recurring' AND t.is_system = true
  AND NOT EXISTS (
    SELECT 1 FROM category_tag_suggestions cts
    WHERE cts.category_id = c.id AND cts.tag_id = t.id
  );
