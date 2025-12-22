-- Add done_for_you column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS done_for_you BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_leads_done_for_you ON public.leads(done_for_you);