-- ========================================
-- Performance Indexes Migration
-- ========================================
-- This migration adds indexes to improve query performance
-- Expected improvement: 5-10x faster queries

-- Products table indexes
-- Tags are frequently used for filtering (sale, bundle, new, etc)
CREATE INDEX IF NOT EXISTS idx_products_tags ON products (tags);

-- Genre is used for product categorization
CREATE INDEX IF NOT EXISTS idx_products_genre ON products (genre);

-- Platforms filtering (ps5, xbox, switch, etc)
CREATE INDEX IF NOT EXISTS idx_products_platforms ON products (platforms);

-- Coin exclusive products filtering
CREATE INDEX IF NOT EXISTS idx_products_coin_exclusive ON products (coin_exclusive);

-- Stock for low stock alerts
CREATE INDEX IF NOT EXISTS idx_products_stock ON products (stock);

-- Orders table indexes
-- User email for fetching user orders (very frequent query)
CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders (user_email);

-- Created at for sorting by date (recent orders)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

-- Order status for filtering (pending, completed, etc) - if you add this column later
-- CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

-- Messages table indexes
-- User email for fetching user messages
CREATE INDEX IF NOT EXISTS idx_messages_user_email ON messages (user_email);

-- Read status for unread count
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages (is_read);

-- Created at for sorting
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);

-- Composite index for common query: unread messages for user
CREATE INDEX IF NOT EXISTS idx_messages_user_unread ON messages (user_email, is_read, is_deleted);

-- Wishlist table indexes (already has user_email and product_id, but let's add created_at)
CREATE INDEX IF NOT EXISTS idx_wishlist_created_at ON wishlist (created_at);

-- Analytics: composite index for date range queries
-- CREATE INDEX IF NOT EXISTS idx_orders_date_range ON orders (created_at, user_email);

-- ========================================
-- Verify indexes were created
-- ========================================
-- Run this to see all indexes:
-- SELECT 
--   TABLE_NAME,
--   INDEX_NAME,
--   COLUMN_NAME,
--   INDEX_TYPE
-- FROM INFORMATION_SCHEMA.STATISTICS 
-- WHERE TABLE_SCHEMA = 'gamefrog_db'
-- ORDER BY TABLE_NAME, INDEX_NAME;

