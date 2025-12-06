-- Migration: Add text color fields to limited_time_offers table
-- This migration adds color columns for all text fields in the offer
-- Safe migration: checks if columns exist before adding

SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'limited_time_offers' 
    AND COLUMN_NAME = 'title_en_color'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE limited_time_offers
        ADD COLUMN title_en_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for title in English'',
        ADD COLUMN title_ka_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for title in Georgian'',
        ADD COLUMN description_en_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for description in English'',
        ADD COLUMN description_ka_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for description in Georgian'',
        ADD COLUMN badge_text_en_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for badge text in English'',
        ADD COLUMN badge_text_ka_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for badge text in Georgian'',
        ADD COLUMN headline_prefix_en_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for headline prefix in English'',
        ADD COLUMN headline_prefix_ka_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for headline prefix in Georgian'',
        ADD COLUMN headline_highlight_color VARCHAR(7) DEFAULT ''#FF3131'' COMMENT ''Text color for headline highlight'',
        ADD COLUMN headline_suffix_en_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for headline suffix in English'',
        ADD COLUMN headline_suffix_ka_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for headline suffix in Georgian'',
        ADD COLUMN cta_text_en_color VARCHAR(7) DEFAULT ''#FFFFFF'' COMMENT ''Text color for CTA button text in English'',
        ADD COLUMN cta_text_ka_color VARCHAR(7) DEFAULT ''#FFFFFF'' COMMENT ''Text color for CTA button text in Georgian'',
        ADD COLUMN cta_hint_en_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for CTA hint in English'',
        ADD COLUMN cta_hint_ka_color VARCHAR(7) DEFAULT ''#000000'' COMMENT ''Text color for CTA hint in Georgian''',
    'SELECT ''Color columns already exist'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
