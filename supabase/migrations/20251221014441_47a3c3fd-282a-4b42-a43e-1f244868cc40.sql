-- Add webhook_url column to calendar_integrations for Zapier/CRM integration
ALTER TABLE calendar_integrations ADD COLUMN webhook_url TEXT;