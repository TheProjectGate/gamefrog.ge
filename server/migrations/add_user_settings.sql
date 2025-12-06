-- Migration: Add user_settings table
-- This table stores user preferences including badge colors for notifications

CREATE TABLE IF NOT EXISTS user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    badge_color_order VARCHAR(20) DEFAULT 'green',
    badge_color_wishlist VARCHAR(20) DEFAULT 'pink',
    badge_color_general VARCHAR(20) DEFAULT 'red',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add default settings for existing admin user if exists
INSERT IGNORE INTO user_settings (user_email, badge_color_order, badge_color_wishlist, badge_color_general)
SELECT email, 'green', 'pink', 'red'
FROM users
WHERE email = 'admin@gmail.com';

