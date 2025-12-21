-- Add last_used_provider column to ai_chat_settings table
-- This tracks which provider was actually used in the last request

ALTER TABLE ai_chat_settings 
ADD COLUMN IF NOT EXISTS last_used_provider VARCHAR(50) DEFAULT NULL;

-- Update existing rows
UPDATE ai_chat_settings 
SET last_used_provider = provider 
WHERE last_used_provider IS NULL AND provider IS NOT NULL;