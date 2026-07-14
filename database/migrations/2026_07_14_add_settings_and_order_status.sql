-- SQL dialect: postgresql
-- Migration: Add `settings` table and extend orders.status check
-- Run this against your PostgreSQL database for WellDone

BEGIN;

-- Drop existing check if present and recreate with new allowed statuses
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE c.contype = 'c' AND t.relname = 'orders' AND c.conname = 'orders_status_check'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    END IF;
EXCEPTION WHEN undefined_table THEN
    -- orders table may not exist yet in fresh schema; ignore
END$$;

-- Recreate the constraint with added statuses
ALTER TABLE IF EXISTS orders
  ADD CONSTRAINT orders_status_check CHECK (status IN ('Pending','Delivered'));

-- Add service catalog columns if missing
ALTER TABLE IF EXISTS services ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
ALTER TABLE IF EXISTS services ADD COLUMN IF NOT EXISTS keywords TEXT;

-- Add delivery fields to orders if missing
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'Pickup';
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Create settings table if it does not exist
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(200),
  business_email VARCHAR(120),
  upi_id VARCHAR(100),
  phone VARCHAR(32),
  address TEXT,
  logo_url TEXT,
  receipt_footer TEXT,
  printer_settings JSONB,
  default_delivery_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
