-- Add ai_name column to voice_settings table
ALTER TABLE voice_settings ADD COLUMN ai_name text DEFAULT 'Ashley';