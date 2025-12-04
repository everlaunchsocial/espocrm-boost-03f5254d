-- Create call_logs table for storing call transcripts and AI analysis
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'lead')),
  transcript TEXT NOT NULL,
  summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  suggested_email JSONB,
  suggested_status TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create media_library table for storing reusable media assets
CREATE TABLE public.media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video', 'document', 'image', 'link')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_logs (public access for now, same as other CRM tables)
CREATE POLICY "Allow public access on call_logs" ON public.call_logs
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for media_library (public access for now)
CREATE POLICY "Allow public access on media_library" ON public.media_library
  FOR ALL USING (true) WITH CHECK (true);

-- Add trigger for media_library updated_at
CREATE TRIGGER update_media_library_updated_at
  BEFORE UPDATE ON public.media_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_call_logs_contact_id ON public.call_logs(contact_id);
CREATE INDEX idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at DESC);
CREATE INDEX idx_media_library_type ON public.media_library(type);
CREATE INDEX idx_media_library_keywords ON public.media_library USING GIN(keywords);