-- Migration: Create offer_products junction table for many-to-many relationship
-- This allows linking multiple products to a single offer

CREATE TABLE IF NOT EXISTS offer_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    offer_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_offer_product (offer_id, product_id),
    FOREIGN KEY (offer_id) REFERENCES limited_time_offers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_offer_id (offer_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

