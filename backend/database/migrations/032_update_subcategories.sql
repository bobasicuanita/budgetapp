-- Migration: 032_update_subcategories.sql
-- Description: Update system subcategories as requested

DO $$
DECLARE
  cat_utilities UUID;
  cat_entertainment UUID;
  cat_healthcare UUID;
  cat_subscriptions UUID;
  cat_travel UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO cat_utilities FROM categories WHERE name = 'Utilities' AND is_system = true LIMIT 1;
  SELECT id INTO cat_entertainment FROM categories WHERE name = 'Entertainment' AND is_system = true LIMIT 1;
  SELECT id INTO cat_healthcare FROM categories WHERE name = 'Healthcare' AND is_system = true LIMIT 1;
  SELECT id INTO cat_subscriptions FROM categories WHERE name = 'Subscriptions' AND is_system = true LIMIT 1;
  SELECT id INTO cat_travel FROM categories WHERE name = 'Travel' AND is_system = true LIMIT 1;

  -- -----------------------------
  -- Utilities updates
  -- -----------------------------
  IF cat_utilities IS NOT NULL THEN
    -- Add new subcategory: Condo fees
    INSERT INTO subcategories (category_id, user_id, name)
    VALUES (cat_utilities, NULL, 'Condo fees')
    ON CONFLICT (user_id, category_id, name) DO NOTHING;

    -- Change "Gas" to "Heating"
    UPDATE subcategories
    SET name = 'Heating'
    WHERE category_id = cat_utilities AND name = 'Gas' AND user_id IS NULL;
  END IF;

  -- -----------------------------
  -- Entertainment updates
  -- -----------------------------
  IF cat_entertainment IS NOT NULL THEN
    -- Add/replace Drinks & Clubbing
    INSERT INTO subcategories (category_id, user_id, name)
    VALUES (cat_entertainment, NULL, 'Drinks & Clubbing')
    ON CONFLICT (user_id, category_id, name) DO NOTHING;
  END IF;

  -- -----------------------------
  -- Healthcare updates
  -- -----------------------------
  IF cat_healthcare IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name)
    VALUES (cat_healthcare, NULL, 'Hospital')
    ON CONFLICT (user_id, category_id, name) DO NOTHING;

    INSERT INTO subcategories (category_id, user_id, name)
    VALUES (cat_healthcare, NULL, 'Personal care')
    ON CONFLICT (user_id, category_id, name) DO NOTHING;
  END IF;

  -- -----------------------------
  -- Subscriptions updates
  -- -----------------------------
  IF cat_subscriptions IS NOT NULL THEN
    INSERT INTO subcategories (category_id, user_id, name)
    VALUES (cat_subscriptions, NULL, 'Gaming')
    ON CONFLICT (user_id, category_id, name) DO NOTHING;
  END IF;

  -- -----------------------------
  -- Travel updates
  -- -----------------------------
  IF cat_travel IS NOT NULL THEN
    -- Rename Flights to Transportation
    UPDATE subcategories
    SET name = 'Transportation'
    WHERE category_id = cat_travel AND name = 'Flights' AND user_id IS NULL;

    -- Add Daily Expenses
    INSERT INTO subcategories (category_id, user_id, name)
    VALUES (cat_travel, NULL, 'Daily Expenses')
    ON CONFLICT (user_id, category_id, name) DO NOTHING;
  END IF;

END $$;