-- Migration: Add phone and address fields to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50) AFTER avatar,
ADD COLUMN IF NOT EXISTS address TEXT AFTER phone;

