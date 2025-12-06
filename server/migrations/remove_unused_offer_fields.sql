-- Migration to remove unused fields from limited_time_offers table
-- and add name field for admin identification

-- Add name field if it doesn't exist (MySQL doesn't support IF NOT EXISTS for ADD COLUMN)
-- This will be handled by the migration script with error handling
ALTER TABLE limited_time_offers
    ADD COLUMN name VARCHAR(255) DEFAULT NULL COMMENT 'Name for admin identification only';

-- Drop unused text fields
ALTER TABLE limited_time_offers
    DROP COLUMN IF EXISTS title_en,
    DROP COLUMN IF EXISTS title_ka,
    DROP COLUMN IF EXISTS description_en,
    DROP COLUMN IF EXISTS description_ka,
    DROP COLUMN IF EXISTS badge_text_en,
    DROP COLUMN IF EXISTS badge_text_ka,
    DROP COLUMN IF EXISTS headline_prefix_en,
    DROP COLUMN IF EXISTS headline_prefix_ka,
    DROP COLUMN IF EXISTS headline_highlight,
    DROP COLUMN IF EXISTS headline_suffix_en,
    DROP COLUMN IF EXISTS headline_suffix_ka,
    DROP COLUMN IF EXISTS cta_text_en,
    DROP COLUMN IF EXISTS cta_text_ka,
    DROP COLUMN IF EXISTS cta_hint_en,
    DROP COLUMN IF EXISTS cta_hint_ka;

-- Drop unused color fields
ALTER TABLE limited_time_offers
    DROP COLUMN IF EXISTS title_en_color,
    DROP COLUMN IF EXISTS title_ka_color,
    DROP COLUMN IF EXISTS description_en_color,
    DROP COLUMN IF EXISTS description_ka_color,
    DROP COLUMN IF EXISTS badge_text_en_color,
    DROP COLUMN IF EXISTS badge_text_ka_color,
    DROP COLUMN IF EXISTS headline_prefix_en_color,
    DROP COLUMN IF EXISTS headline_prefix_ka_color,
    DROP COLUMN IF EXISTS headline_highlight_color,
    DROP COLUMN IF EXISTS headline_suffix_en_color,
    DROP COLUMN IF EXISTS headline_suffix_ka_color,
    DROP COLUMN IF EXISTS cta_text_en_color,
    DROP COLUMN IF EXISTS cta_text_ka_color,
    DROP COLUMN IF EXISTS cta_hint_en_color,
    DROP COLUMN IF EXISTS cta_hint_ka_color;

-- Drop unused button and timer template fields
ALTER TABLE limited_time_offers
    DROP COLUMN IF EXISTS button_template,
    DROP COLUMN IF EXISTS button_bg_color,
    DROP COLUMN IF EXISTS button_border_color,
    DROP COLUMN IF EXISTS timer_template,
    DROP COLUMN IF EXISTS timer_bg_color,
    DROP COLUMN IF EXISTS timer_text_color,
    DROP COLUMN IF EXISTS timer_border_color;

