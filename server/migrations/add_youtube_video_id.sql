-- Migration: Add youtube_video_id field to products table
-- This allows products to have an associated YouTube video that can be played in the product modal

-- Check if column exists before adding
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND COLUMN_NAME = 'youtube_video_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE products ADD COLUMN youtube_video_id VARCHAR(50) NULL DEFAULT NULL COMMENT ''YouTube video ID for product video display''',
    'SELECT ''Column youtube_video_id already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if index exists before creating
SET @index_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND INDEX_NAME = 'idx_products_youtube_video_id'
);

SET @sql = IF(@index_exists = 0,
    'CREATE INDEX idx_products_youtube_video_id ON products(youtube_video_id)',
    'SELECT ''Index idx_products_youtube_video_id already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

