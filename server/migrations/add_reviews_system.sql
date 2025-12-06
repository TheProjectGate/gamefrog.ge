-- ========================================
-- Reviews and Ratings System
-- ========================================

CREATE TABLE IF NOT EXISTS reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  comment TEXT,
  helpful_count INT DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_user_email (user_email),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at)
);

-- Table for tracking helpful votes
CREATE TABLE IF NOT EXISTS review_votes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  review_id INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_user_review (review_id, user_email),
  INDEX idx_review_id (review_id)
);

-- Add rating fields to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;

-- Create index for sorting by rating
CREATE INDEX IF NOT EXISTS idx_products_rating ON products (average_rating);

