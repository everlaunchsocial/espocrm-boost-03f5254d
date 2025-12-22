-- Create sequences table for messaging sequences
CREATE TABLE public.sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL DEFAULT 'email', -- email, sms, mixed
  steps_count INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_sequences table for tracking leads added to sequences
CREATE TABLE public.lead_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  scheduled_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, active, paused, completed, cancelled
  current_step INTEGER NOT NULL DEFAULT 0,
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sequences ENABLE ROW LEVEL SECURITY;

-- RLS policies for sequences - all authenticated users can view
CREATE POLICY "Authenticated users can view sequences"
ON public.sequences FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage sequences"
ON public.sequences FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS policies for lead_sequences
CREATE POLICY "Authenticated users can view lead sequences"
ON public.lead_sequences FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage lead sequences"
ON public.lead_sequences FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add indexes
CREATE INDEX idx_lead_sequences_lead_id ON public.lead_sequences(lead_id);
CREATE INDEX idx_lead_sequences_sequence_id ON public.lead_sequences(sequence_id);
CREATE INDEX idx_lead_sequences_status ON public.lead_sequences(status);

-- Trigger for updated_at
CREATE TRIGGER update_sequences_updated_at
BEFORE UPDATE ON public.sequences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_sequences_updated_at
BEFORE UPDATE ON public.lead_sequences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample sequences
INSERT INTO public.sequences (name, description, channel, steps_count) VALUES
('Welcome Series', 'Initial outreach for new leads', 'email', 3),
('Re-engagement', 'Follow up with cold leads', 'email', 2),
('Demo Follow-up', 'Post-demo nurturing sequence', 'mixed', 4),
('SMS Quick Touch', 'Quick SMS check-in sequence', 'sms', 2);