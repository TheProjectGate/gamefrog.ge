-- Migration: Add payment settings table
USE gamefrog_db;

CREATE TABLE IF NOT EXISTS payment_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_provider VARCHAR(50) UNIQUE NOT NULL COMMENT 'Payment provider identifier (e.g., unipay, stripe, etc.)',
    is_enabled BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(100) NOT NULL COMMENT 'Display name for the payment provider',
    config JSON NOT NULL COMMENT 'JSON configuration with provider-specific settings',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payment_provider (payment_provider),
    INDEX idx_is_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default UniPay configuration (disabled by default)
INSERT INTO payment_settings (payment_provider, is_enabled, display_name, config) VALUES
('unipay', FALSE, 'UniPay', JSON_OBJECT(
    'merchantId', '',
    'secretKey', '',
    'merchantUser', '',
    'apiUrl', 'https://apiv2.unipay.com/custom/checkout/v1',
    'successUrl', '',
    'cancelUrl', '',
    'callbackUrl', ''
))
ON DUPLICATE KEY UPDATE 
    display_name = VALUES(display_name),
    config = VALUES(config);

