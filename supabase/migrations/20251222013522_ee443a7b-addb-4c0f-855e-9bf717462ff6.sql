-- Add assigned_to_user_id column to leads table
ALTER TABLE public.leads ADD COLUMN assigned_to_user_id UUID;

-- Add index for filtering by assigned user
CREATE INDEX idx_leads_assigned_to_user_id ON public.leads(assigned_to_user_id);

-- Create a view for CRM team members (users who can access CRM)
CREATE OR REPLACE VIEW public.crm_team_members AS
SELECT 
  p.user_id,
  p.global_role,
  COALESCE(
    (SELECT email FROM auth.users WHERE id = p.user_id),
    'Unknown'
  ) as email
FROM public.profiles p
WHERE p.global_role IN ('super_admin', 'admin', 'affiliate');

-- Grant access to the view
GRANT SELECT ON public.crm_team_members TO authenticated;