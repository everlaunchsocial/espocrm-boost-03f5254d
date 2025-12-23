-- Create roles table for RBAC
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  seat_limit INTEGER NOT NULL DEFAULT 5,
  seats_used INTEGER NOT NULL DEFAULT 0,
  storage_limit_gb INTEGER NOT NULL DEFAULT 10,
  storage_used_gb NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_expires_at TIMESTAMP WITH TIME ZONE
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_active_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_limits table
CREATE TABLE public.usage_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL,
  limit_value INTEGER NOT NULL DEFAULT 0,
  current_usage INTEGER NOT NULL DEFAULT 0,
  reset_period TEXT NOT NULL DEFAULT 'monthly',
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, limit_type)
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- Roles policies (read for authenticated, manage for admins)
CREATE POLICY "roles_read_authenticated" ON public.roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "roles_admin_manage" ON public.roles
  FOR ALL USING (is_admin());

-- Organizations policies
CREATE POLICY "organizations_member_read" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "organizations_admin_all" ON public.organizations
  FOR ALL USING (is_admin());

-- Team members policies
CREATE POLICY "team_members_own_read" ON public.team_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "team_members_org_read" ON public.team_members
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "team_members_admin_all" ON public.team_members
  FOR ALL USING (is_admin());

-- Audit logs policies (admins only)
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Usage limits policies
CREATE POLICY "usage_limits_org_read" ON public.usage_limits
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "usage_limits_admin_all" ON public.usage_limits
  FOR ALL USING (is_admin());

-- Indexes
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_org ON public.team_members(organization_id);
CREATE INDEX idx_team_members_status ON public.team_members(status);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_usage_limits_org ON public.usage_limits(organization_id);

-- Insert default system roles
INSERT INTO public.roles (name, description, permissions, is_system_role) VALUES
('super_admin', 'Full system access with all permissions', 
  '["settings.organization", "settings.billing", "settings.integrations", "settings.team", "users.create", "users.read", "users.update", "users.delete", "users.invite", "users.suspend", "leads.create", "leads.read.all", "leads.update.all", "leads.delete", "leads.assign", "leads.export", "reports.create", "reports.read.all", "reports.export", "audit.read"]'::jsonb, 
  true),
('admin', 'Team management and settings access',
  '["settings.team", "settings.integrations", "users.create", "users.read", "users.update", "users.invite", "leads.create", "leads.read.all", "leads.update.all", "leads.delete", "leads.assign", "leads.export", "reports.create", "reports.read.all", "reports.export", "audit.read"]'::jsonb,
  true),
('manager', 'Team oversight and reporting',
  '["users.read", "leads.create", "leads.read.team", "leads.update.team", "leads.assign", "reports.create", "reports.read.team"]'::jsonb,
  true),
('sales_rep', 'Lead management and activities',
  '["leads.create", "leads.read.own", "leads.update.own", "reports.create", "reports.read.own"]'::jsonb,
  true),
('viewer', 'Read-only access',
  '["leads.read.own", "reports.read.own"]'::jsonb,
  true);

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members tm
    JOIN public.roles r ON r.id = tm.role_id
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND r.permissions ? p_permission
  )
  OR is_admin()
$$;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_details)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;