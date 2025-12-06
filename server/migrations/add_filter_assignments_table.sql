-- Migration to create filter_assignments table
-- This table stores filter group assignments (genre, platform, etc.)

CREATE TABLE IF NOT EXISTS filter_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_type VARCHAR(50) NOT NULL UNIQUE COMMENT 'Type of assignment (e.g., "genre", "platform")',
  group_id VARCHAR(255) NOT NULL COMMENT 'Reference to filter_groups.group_id',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assignment_type (assignment_type),
  INDEX idx_group_id (group_id),
  FOREIGN KEY (group_id) REFERENCES filter_groups(group_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

