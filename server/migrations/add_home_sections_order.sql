-- Migration: Add home page sections order table
USE gamefrog_db;

CREATE TABLE IF NOT EXISTS home_sections_order (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_key VARCHAR(100) UNIQUE NOT NULL,
    display_order INT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default sections order
INSERT INTO home_sections_order (section_key, display_order, is_enabled) VALUES
('coinsExclusive', 1, TRUE),
('bundleDeals', 2, TRUE),
('newReleases', 3, TRUE),
('bestSellers', 4, TRUE),
('retroCorner', 5, TRUE),
('merch', 6, TRUE)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

