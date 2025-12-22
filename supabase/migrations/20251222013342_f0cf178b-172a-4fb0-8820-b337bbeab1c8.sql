-- Add quiet_mode column to leads table
ALTER TABLE public.leads ADD COLUMN quiet_mode BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering quiet mode leads
CREATE INDEX idx_leads_quiet_mode ON public.leads(quiet_mode) WHERE quiet_mode = true;