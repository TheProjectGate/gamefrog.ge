-- Fix image URLs to use correct paths for web serving
-- Change from 'src/img/...' to '/img/...'

UPDATE products 
SET image_url = REPLACE(image_url, 'src/img/', '/img/')
WHERE image_url LIKE 'src/img/%';

