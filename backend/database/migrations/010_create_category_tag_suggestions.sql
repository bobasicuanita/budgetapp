-- Create category_tag_suggestions table
-- This table suggests which tags to show when a category is selected
CREATE TABLE IF NOT EXISTS category_tag_suggestions (
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (category_id, tag_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_category_tag_suggestions_category ON category_tag_suggestions(category_id);
CREATE INDEX idx_category_tag_suggestions_tag ON category_tag_suggestions(tag_id);

-- Insert default suggestions (linking categories to relevant tags)
-- Note: This will be populated after categories and tags are created
-- Food & Dining → food-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Food & Dining' AND c.is_system = true
  AND t.name IN ('Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Coffee', 'Fast Food', 'Restaurant', 'Friends', 'Family', 'Date')
  AND t.is_system = true;

-- Entertainment → entertainment-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Entertainment' AND c.is_system = true
  AND t.name IN ('Movies', 'Concert', 'Sports Event', 'Games', 'Books', 'Streaming', 'Friends', 'Family', 'Party')
  AND t.is_system = true;

-- Shopping → shopping-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Shopping' AND c.is_system = true
  AND t.name IN ('Clothing', 'Electronics', 'Home Decor', 'Furniture', 'Planned', 'One-time')
  AND t.is_system = true;

-- Transportation → transportation-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Transportation' AND c.is_system = true
  AND t.name IN ('Fuel', 'Public Transit', 'Taxi/Uber', 'Parking', 'Car Maintenance', 'Work', 'Recurring')
  AND t.is_system = true;

-- Groceries → food-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Groceries' AND c.is_system = true
  AND t.name IN ('Planned', 'Recurring', 'Family')
  AND t.is_system = true;

-- Healthcare → health-related tags
INSERT INTO category_tag_suggestions (category_id, tag_id)
SELECT c.id, t.id
FROM categories c, tags t
WHERE c.name = 'Healthcare' AND c.is_system = true
  AND t.name IN ('Fitness', 'Pharmacy', 'Doctor', 'Urgent', 'Planned')
  AND t.is_system = true;
