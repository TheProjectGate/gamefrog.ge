-- Migration: Add show_frequency column to limited_time_offers table
-- This column controls how often the offer should be shown to users
-- Safe migration: checks if column exists before adding

SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'limited_time_offers' 
    AND COLUMN_NAME = 'show_frequency'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE limited_time_offers ADD COLUMN show_frequency ENUM(''once_per_day'', ''every_hour'', ''on_refresh'') DEFAULT ''once_per_day'' COMMENT ''How often to show the offer: once_per_day, every_hour, or on_refresh''',
    'SELECT ''Column show_frequency already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

