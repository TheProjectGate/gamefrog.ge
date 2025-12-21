-- Add chat_bubbles_max_per_day column to ai_chat_settings table
-- This script can be run manually to add the new column

ALTER TABLE ai_chat_settings 
ADD COLUMN IF NOT EXISTS chat_bubbles_max_per_day INT DEFAULT 10;

-- Update existing rows to have default value
UPDATE ai_chat_settings 
SET chat_bubbles_max_per_day = 10 
WHERE chat_bubbles_max_per_day IS NULL;
