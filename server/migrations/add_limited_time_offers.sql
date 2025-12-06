-- Migration: Add limited_time_offers table
-- This table stores limited time offers that appear when users enter the website

CREATE TABLE IF NOT EXISTS limited_time_offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title_en VARCHAR(255) NOT NULL COMMENT 'Offer title in English',
    title_ka VARCHAR(255) NOT NULL COMMENT 'Offer title in Georgian',
    description_en TEXT COMMENT 'Offer description in English',
    description_ka TEXT COMMENT 'Offer description in Georgian',
    badge_text_en VARCHAR(100) COMMENT 'Badge text in English',
    badge_text_ka VARCHAR(100) COMMENT 'Badge text in Georgian',
    headline_prefix_en VARCHAR(255) COMMENT 'Headline prefix in English',
    headline_prefix_ka VARCHAR(255) COMMENT 'Headline prefix in Georgian',
    headline_highlight VARCHAR(255) COMMENT 'Headline highlight (e.g., "60% OFF")',
    headline_suffix_en VARCHAR(255) COMMENT 'Headline suffix in English',
    headline_suffix_ka VARCHAR(255) COMMENT 'Headline suffix in Georgian',
    cta_text_en VARCHAR(100) DEFAULT 'Go To Offer' COMMENT 'Call to action button text in English',
    cta_text_ka VARCHAR(100) DEFAULT 'შეთავაზებაზე გადასვლა' COMMENT 'Call to action button text in Georgian',
    cta_hint_en VARCHAR(255) COMMENT 'CTA hint text in English',
    cta_hint_ka VARCHAR(255) COMMENT 'CTA hint text in Georgian',
    background_image_url VARCHAR(500) COMMENT 'Background image URL for the offer',
    discount_percent DECIMAL(5, 2) DEFAULT 0 COMMENT 'Discount percentage to display',
    ends_at DATETIME NOT NULL COMMENT 'When the offer ends',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether the offer is currently active',
    redirect_url VARCHAR(500) COMMENT 'URL to redirect to when CTA is clicked (optional)',
    product_id INT NULL COMMENT 'Product ID to open when CTA is clicked (optional, for sale products)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_ends_at (ends_at),
    INDEX idx_product_id (product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

