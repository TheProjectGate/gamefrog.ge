-- Migration to add display_order field to filter_groups table
-- This field controls the order in which filter groups are displayed
-- Note: The actual check for column existence is done in the migration script
ALTER TABLE filter_groups 
ADD COLUMN display_order INT DEFAULT 0 COMMENT 'Order for displaying filter groups (lower numbers appear first)';

-- Create index for faster sorting
CREATE INDEX idx_display_order ON filter_groups(display_order);

