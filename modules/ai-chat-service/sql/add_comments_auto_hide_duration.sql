-- Add comments_auto_hide_duration column to ai_chat_settings table
-- This controls how long (in seconds) a comment will be displayed before auto-hiding
-- Default: 10 seconds

ALTER TABLE ai_chat_settings 
ADD COLUMN IF NOT EXISTS comments_auto_hide_duration INT DEFAULT 10;

-- Update existing rows to have default value
UPDATE ai_chat_settings 
SET comments_auto_hide_duration = 10 
WHERE comments_auto_hide_duration IS NULL;