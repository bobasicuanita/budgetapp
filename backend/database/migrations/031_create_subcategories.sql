-- Migration: 031_create_subcategories.sql
-- Description: Add subcategories to transactions
-- A subcategory always belongs to exactly one category
-- A transaction may have 0 or 1 subcategory (optional)
-- If a subcategory is present, it MUST belong to the same category as the transaction

-- ============================================
-- 1. Create subcategories table
-- ============================================

CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: (user_id, category_id, name)
  -- This allows system subcategories (user_id = NULL) and user subcategories to coexist
  CONSTRAINT unique_subcategory_per_user_category UNIQUE (user_id, category_id, name)
);

-- Create indexes for faster lookups
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_subcategories_user_id ON subcategories(user_id);
CREATE INDEX idx_subcategories_category_user ON subcategories(category_id, user_id);

COMMENT ON TABLE subcategories IS 'Subcategories for transactions - one level only, must belong to a category';
COMMENT ON COLUMN subcategories.user_id IS 'NULL for system subcategories, user_id for user-created subcategories';
COMMENT ON COLUMN subcategories.category_id IS 'The category this subcategory belongs to';

-- ============================================
-- 2. Add subcategory_id to transactions table
-- ============================================

ALTER TABLE transactions
ADD COLUMN subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_subcategory_id ON transactions(subcategory_id);

COMMENT ON COLUMN transactions.subcategory_id IS 'Optional subcategory - if present, must belong to the same category as the transaction';

-- ============================================
-- 3. Seed system subcategories
-- ============================================

-- First, get category IDs for seeding
-- We'll use DO block to insert subcategories dynamically

DO $$
DECLARE
  cat_utilities UUID;
  cat_food UUID;
  cat_transport UUID;
  cat_housing UUID;
  cat_entertainment UUID;
  cat_shopping UUID;
  cat_healthcare UUID;
  cat_education UUID;
  cat_subscriptions UUID;
  cat_travel UUID;
  cat_groceries UUID;
  cat_salary UUID;
  cat_freelance UUID;
  cat_business UUID;
  cat_investment UUID;
BEGIN
  -- Get category IDs for expenses
  SELECT id INTO cat_utilities FROM categories WHERE name = 'Utilities' AND is_system = true LIMIT 1;
  SELECT id INTO cat_food FROM categories WHERE name = 'Food & Dining' AND is_system = true LIMIT 1;
  SELECT id INTO cat_transport FROM categories WHERE name = 'Transportation' AND is_system = true LIMIT 1;
  SELECT id INTO cat_housing FROM categories WHERE name = 'Housing' AND is_system = true LIMIT 1;
  SELECT id INTO cat_entertainment FROM categories WHERE name = 'Entertainment' AND is_system = true LIMIT 1;
  SELECT id INTO cat_shopping FROM categories WHERE name = 'Shopping' AND is_system = true LIMIT 1;
  SELECT id INTO cat_healthcare FROM categories WHERE name = 'Healthcare' AND is_system = true LIMIT 1;
  SELECT id INTO cat_education FROM categories WHERE name = 'Education' AND is_system = true LIMIT 1;
  SELECT id INTO cat_subscriptions FROM categories WHERE name = 'Subscriptions' AND is_system = true LIMIT 1;
  SELECT id INTO cat_travel FROM categories WHERE name = 'Travel' AND is_system = true LIMIT 1;
  SELECT id INTO cat_groceries FROM categories WHERE name = 'Groceries' AND is_system = true LIMIT 1;
  
  -- Get category IDs for income
  SELECT id INTO cat_salary FROM categories WHERE name = 'Salary' AND is_system = true LIMIT 1;
  SELECT id INTO cat_freelance FROM categories WHERE name = 'Freelance' AND is_system = true LIMIT 1;
  SELECT id INTO cat_business FROM categories WHERE name = 'Business Income' AND is_system = true LIMIT 1;
  SELECT id INTO cat_investment FROM categories WHERE name = 'Investment Returns' AND is_system = true LIMIT 1;
  
  -- Insert subcategories for Utilities (if category exists)
  IF cat_utilities IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_utilities, NULL, 'Electricity'),
      (cat_utilities, NULL, 'Water'),
      (cat_utilities, NULL, 'Gas'),
      (cat_utilities, NULL, 'Internet'),
      (cat_utilities, NULL, 'Phone'),
      (cat_utilities, NULL, 'Trash');
  END IF;
  
  -- Insert subcategories for Food & Dining (if category exists)
  IF cat_food IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_food, NULL, 'Dining Out'),
      (cat_food, NULL, 'Breakfast'),
      (cat_food, NULL, 'Lunch'),
      (cat_food, NULL, 'Dinner'),
      (cat_food, NULL, 'Coffee & Tea'),
      (cat_food, NULL, 'Fast Food'),
      (cat_food, NULL, 'Fine Dining');
  END IF;
  
  -- Insert subcategories for Transportation (if category exists)
  IF cat_transport IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_transport, NULL, 'Fuel'),
      (cat_transport, NULL, 'Parking'),
      (cat_transport, NULL, 'Public Transit'),
      (cat_transport, NULL, 'Taxi & Ride Share'),
      (cat_transport, NULL, 'Maintenance'),
      (cat_transport, NULL, 'Tolls');
  END IF;
  
  -- Insert subcategories for Housing (if category exists)
  IF cat_housing IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_housing, NULL, 'Rent'),
      (cat_housing, NULL, 'Mortgage'),
      (cat_housing, NULL, 'Property Tax'),
      (cat_housing, NULL, 'Home Insurance'),
      (cat_housing, NULL, 'Repairs'),
      (cat_housing, NULL, 'Furniture'),
      (cat_housing, NULL, 'Appliances');
  END IF;
  
  -- Insert subcategories for Entertainment (if category exists)
  IF cat_entertainment IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_entertainment, NULL, 'Movies'),
      (cat_entertainment, NULL, 'Concerts'),
      (cat_entertainment, NULL, 'Sports Events'),
      (cat_entertainment, NULL, 'Books'),
      (cat_entertainment, NULL, 'Games'),
      (cat_entertainment, NULL, 'Hobbies');
  END IF;
  
  -- Insert subcategories for Shopping (if category exists)
  IF cat_shopping IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_shopping, NULL, 'Clothing'),
      (cat_shopping, NULL, 'Shoes'),
      (cat_shopping, NULL, 'Electronics'),
      (cat_shopping, NULL, 'Home Goods'),
      (cat_shopping, NULL, 'Gifts');
  END IF;
  
  -- Insert subcategories for Healthcare (if category exists)
  IF cat_healthcare IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_healthcare, NULL, 'Doctor Visits'),
      (cat_healthcare, NULL, 'Pharmacy'),
      (cat_healthcare, NULL, 'Dental'),
      (cat_healthcare, NULL, 'Vision'),
      (cat_healthcare, NULL, 'Health Insurance'),
      (cat_healthcare, NULL, 'Gym & Fitness');
  END IF;
  
  -- Insert subcategories for Education (if category exists)
  IF cat_education IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_education, NULL, 'Tuition'),
      (cat_education, NULL, 'Books & Supplies'),
      (cat_education, NULL, 'Courses'),
      (cat_education, NULL, 'Student Loans');
  END IF;
  
  -- Insert subcategories for Subscriptions (if category exists)
  IF cat_subscriptions IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_subscriptions, NULL, 'Streaming Services'),
      (cat_subscriptions, NULL, 'Music'),
      (cat_subscriptions, NULL, 'Software'),
      (cat_subscriptions, NULL, 'News & Magazines'),
      (cat_subscriptions, NULL, 'Cloud Storage');
  END IF;
  
  -- Insert subcategories for Travel (if category exists)
  IF cat_travel IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_travel, NULL, 'Flights'),
      (cat_travel, NULL, 'Hotels'),
      (cat_travel, NULL, 'Car Rental'),
      (cat_travel, NULL, 'Vacation'),
      (cat_travel, NULL, 'Business Travel');
  END IF;
  
  -- Insert subcategories for Groceries (if category exists)
  IF cat_groceries IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_groceries, NULL, 'Supermarket'),
      (cat_groceries, NULL, 'Organic Food'),
      (cat_groceries, NULL, 'Farmers Market'),
      (cat_groceries, NULL, 'Specialty Stores');
  END IF;
  
  -- Insert subcategories for Salary (if category exists)
  IF cat_salary IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_salary, NULL, 'Base Salary'),
      (cat_salary, NULL, 'Bonus'),
      (cat_salary, NULL, 'Overtime'),
      (cat_salary, NULL, 'Commission');
  END IF;
  
  -- Insert subcategories for Freelance (if category exists)
  IF cat_freelance IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_freelance, NULL, 'Consulting'),
      (cat_freelance, NULL, 'Project Work'),
      (cat_freelance, NULL, 'Contract Work');
  END IF;
  
  -- Insert subcategories for Business Income (if category exists)
  IF cat_business IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_business, NULL, 'Sales'),
      (cat_business, NULL, 'Services'),
      (cat_business, NULL, 'Products');
  END IF;
  
  -- Insert subcategories for Investment Returns (if category exists)
  IF cat_investment IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name) VALUES
      (cat_investment, NULL, 'Dividends'),
      (cat_investment, NULL, 'Interest'),
      (cat_investment, NULL, 'Capital Gains'),
      (cat_investment, NULL, 'Crypto Gains');
  END IF;
  
END $$;
