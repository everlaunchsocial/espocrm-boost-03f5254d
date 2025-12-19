-- Add research_notes column to backlog_items for tracking research needs
ALTER TABLE public.backlog_items 
ADD COLUMN IF NOT EXISTS research_notes text DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.backlog_items.research_notes IS 'Notes about research needed for this item, including document references and external resources';