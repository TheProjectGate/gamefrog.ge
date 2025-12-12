-- Migration to add showIcons field to filter_groups table
-- This allows enabling/disabling icon display for filter groups

ALTER TABLE filter_groups 
ADD COLUMN IF NOT EXISTS show_icons BOOLEAN DEFAULT TRUE COMMENT 'Whether to show icons for filter items in this group';
