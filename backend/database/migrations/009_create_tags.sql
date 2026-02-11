-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS transaction_tags CASCADE;
DROP TABLE IF EXISTS category_tag_suggestions CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- Create tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_is_system ON tags(is_system);

-- Insert default system tags
INSERT INTO tags (name, is_system) VALUES
  -- Food & Dining related
  ('Breakfast', true),
  ('Lunch', true),
  ('Dinner', true),
  ('Drinks', true),
  ('Coffee', true),
  ('Fast Food', true),
  ('Restaurant', true),
  
  -- Entertainment related
  ('Movies', true),
  ('Concert', true),
  ('Sports Event', true),
  ('Games', true),
  ('Books', true),
  ('Streaming', true),
  
  -- Shopping related
  ('Clothing', true),
  ('Electronics', true),
  ('Home Decor', true),
  ('Furniture', true),
  
  -- Transportation related
  ('Fuel', true),
  ('Public Transit', true),
  ('Taxi/Uber', true),
  ('Parking', true),
  ('Car Maintenance', true),
  
  -- Social related
  ('Friends', true),
  ('Family', true),
  ('Date', true),
  ('Party', true),
  
  -- Work related
  ('Work', true),
  ('Business', true),
  ('Client', true),
  
  -- Health related
  ('Fitness', true),
  ('Pharmacy', true),
  ('Doctor', true),
  
  -- Other
  ('Urgent', true),
  ('Planned', true),
  ('Recurring', true),
  ('One-time', true);
