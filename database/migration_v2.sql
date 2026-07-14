-- SQL dialect: postgresql
-- Migration v2: UI Redesign support
-- Add item_name and notes to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add category and keywords to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
ALTER TABLE services ADD COLUMN IF NOT EXISTS keywords TEXT;

-- Update existing services with categories based on descriptive names
UPDATE services SET category = 'Wash & Iron' WHERE name ILIKE '%iron%';
UPDATE services SET category = 'Dry Cleaning' WHERE name ILIKE '%dry%';
UPDATE services SET category = 'Wash & Fold' WHERE name ILIKE '%wash%' AND category = 'General';
UPDATE services SET category = 'Specialty' WHERE category = 'General';

-- Update order status constraint to new workflow
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('Pending', 'Delivered'));

-- Migrate any legacy workflow statuses into the new simplified Pending/Delivered model
UPDATE orders SET status = 'Pending' WHERE status IN ('Received', 'Washing', 'Ready');

-- Simplify payment status to Paid/Unpaid only
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('Paid', 'Unpaid'));

-- Migrate Partially Paid -> Unpaid
UPDATE orders SET payment_status = 'Unpaid' WHERE payment_status = 'Partially Paid';
