-- Add channel, sync_status, and deployed_at columns to prompt_templates
ALTER TABLE prompt_templates
ADD COLUMN channel text NOT NULL DEFAULT 'universal',
ADD COLUMN sync_status text NOT NULL DEFAULT 'synced',
ADD COLUMN deployed_at timestamp with time zone;

-- Add a comment for clarity
COMMENT ON COLUMN prompt_templates.channel IS 'Target channel: phone, web_voice, chat, support, or universal (all channels)';
COMMENT ON COLUMN prompt_templates.sync_status IS 'Status: synced, pending, failed';
COMMENT ON COLUMN prompt_templates.deployed_at IS 'Last time this prompt was deployed to its channel(s)';