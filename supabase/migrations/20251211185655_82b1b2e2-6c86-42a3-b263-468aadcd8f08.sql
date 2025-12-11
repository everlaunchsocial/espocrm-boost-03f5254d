-- Create impersonation audit log table
CREATE TABLE public.impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  impersonated_affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  impersonated_username TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('start', 'end')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admins can view impersonation logs
CREATE POLICY "Super admins can view impersonation logs"
  ON public.impersonation_logs
  FOR SELECT
  USING (public.is_super_admin());

-- Anyone authenticated can insert (will be validated by edge function)
CREATE POLICY "Authenticated users can insert impersonation logs"
  ON public.impersonation_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for efficient querying
CREATE INDEX idx_impersonation_logs_admin ON public.impersonation_logs(admin_user_id);
CREATE INDEX idx_impersonation_logs_affiliate ON public.impersonation_logs(impersonated_affiliate_id);
CREATE INDEX idx_impersonation_logs_created ON public.impersonation_logs(created_at DESC);