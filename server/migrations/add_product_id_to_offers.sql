-- Migration: Add product_id column to limited_time_offers table
-- This allows linking offers to specific sale products

-- Add product_id column (if it doesn't exist, the script will check first)
ALTER TABLE limited_time_offers
ADD COLUMN product_id INT NULL COMMENT 'Product ID to open when CTA is clicked (optional, for sale products)';

-- Add index
ALTER TABLE limited_time_offers
ADD INDEX idx_product_id (product_id);

-- Add foreign key constraint
ALTER TABLE limited_time_offers
ADD CONSTRAINT fk_offers_product_id 
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE SET NULL;

