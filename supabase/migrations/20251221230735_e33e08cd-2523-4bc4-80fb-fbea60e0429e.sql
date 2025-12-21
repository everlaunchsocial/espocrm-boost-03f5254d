-- Create summary_deliveries table to track daily summary deliveries
CREATE TABLE public.summary_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'push', 'voice')),
  summary_type TEXT NOT NULL DEFAULT 'daily' CHECK (summary_type IN ('daily', 'weekly', 'other')),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  summary_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_summary_deliveries_user_date ON public.summary_deliveries (user_id, delivered_at);
CREATE INDEX idx_summary_deliveries_status ON public.summary_deliveries (status);

-- Enable Row Level Security
ALTER TABLE public.summary_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can view their own deliveries
CREATE POLICY "Users can view their own deliveries"
ON public.summary_deliveries
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all deliveries
CREATE POLICY "Admins can view all deliveries"
ON public.summary_deliveries
FOR ALL
USING (is_admin());