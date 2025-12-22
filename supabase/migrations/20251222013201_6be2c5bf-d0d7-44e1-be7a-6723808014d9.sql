-- Add priority column to leads table
ALTER TABLE public.leads ADD COLUMN priority BOOLEAN NOT NULL DEFAULT false;

-- Add index for quick priority filtering
CREATE INDEX idx_leads_priority ON public.leads(priority) WHERE priority = true;