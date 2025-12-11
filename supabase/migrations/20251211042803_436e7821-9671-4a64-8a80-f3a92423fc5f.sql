-- Add voice_id column to voice_settings table
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS voice_id TEXT;

-- Set default voice_id (Jacqueline) for existing records without voice_id
UPDATE voice_settings 
SET voice_id = '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc'
WHERE voice_id IS NULL;