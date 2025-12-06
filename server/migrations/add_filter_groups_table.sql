-- Migration to create filter_groups table
-- This table stores filter group configurations for the admin panel

CREATE TABLE IF NOT EXISTS filter_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique identifier for the filter group (e.g., "genre", "platform")',
  label VARCHAR(255) NOT NULL COMMENT 'Display label for the filter group',
  items_json TEXT NOT NULL COMMENT 'JSON string containing filter items configuration',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_group_id (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

