-- Migration to add background_color field to limited_time_offers table
-- This field allows custom background color for offer sections on the Sale page

-- Add background_color field if it doesn't exist
-- This will be handled by the migration script with error handling
ALTER TABLE limited_time_offers
    ADD COLUMN background_color VARCHAR(7) DEFAULT '#FFFFFF' COMMENT 'Custom background color for offer section on sale page';

