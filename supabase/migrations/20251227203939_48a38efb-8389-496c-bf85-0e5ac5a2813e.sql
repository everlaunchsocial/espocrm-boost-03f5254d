-- Create admin_roles table
CREATE TABLE public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system_role boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Create admin_permissions table
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Create admin_role_permissions junction table
CREATE TABLE public.admin_role_permissions (
  role_id uuid REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;

-- Create user_admin_roles table
CREATE TABLE public.user_admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES public.admin_roles(id) ON DELETE CASCADE NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone DEFAULT now(),
  notes text,
  UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE public.user_admin_roles ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX idx_user_admin_roles_user ON public.user_admin_roles(user_id);
CREATE INDEX idx_user_admin_roles_role ON public.user_admin_roles(role_id);

-- Insert system roles
INSERT INTO public.admin_roles (name, description, is_system_role) VALUES
('super_admin', 'Full system access - cannot be edited', true),
('admin', 'Standard admin access', true),
('support_agent', 'Customer support access', false),
('manager', 'Management reporting access', false);

-- Insert all permissions
INSERT INTO public.admin_permissions (code, name, description, category) VALUES
-- Customer permissions
('customers.view', 'View Customers', 'Can view customer list and details', 'customers'),
('customers.edit', 'Edit Customers', 'Can modify customer information', 'customers'),
('customers.delete', 'Delete Customers', 'Can delete customer accounts', 'customers'),
('customers.impersonate', 'Impersonate Customers', 'Can view as customer', 'customers'),
('customers.manage_subscription', 'Manage Subscriptions', 'Can change plans, grant complimentary access', 'customers'),
-- Affiliate permissions
('affiliates.view', 'View Affiliates', 'Can view affiliate list and details', 'affiliates'),
('affiliates.edit', 'Edit Affiliates', 'Can modify affiliate information', 'affiliates'),
('affiliates.delete', 'Delete Affiliates', 'Can delete affiliate accounts', 'affiliates'),
('affiliates.impersonate', 'Impersonate Affiliates', 'Can view as affiliate', 'affiliates'),
('affiliates.promote', 'Promote to Admin', 'Can give affiliates admin roles', 'affiliates'),
('affiliates.reassign', 'Reassign Sponsorships', 'Can move affiliates in tree', 'affiliates'),
-- Commission permissions
('commissions.view', 'View Commissions', 'Can view commission data', 'commissions'),
('commissions.approve', 'Approve Commissions', 'Can approve pending commissions', 'commissions'),
('commissions.adjust', 'Adjust Commissions', 'Can manually adjust amounts', 'commissions'),
-- Payout permissions
('payouts.view', 'View Payouts', 'Can view payout history', 'payouts'),
('payouts.process', 'Process Payouts', 'Can initiate payouts', 'payouts'),
-- Support permissions
('support.view_tickets', 'View Tickets', 'Can view support tickets', 'support'),
('support.respond', 'Respond to Tickets', 'Can reply to tickets', 'support'),
('support.close', 'Close Tickets', 'Can close/resolve tickets', 'support'),
-- Billing permissions
('billing.view_settings', 'View Billing Settings', 'Can view billing configuration', 'billing'),
('billing.edit_settings', 'Edit Billing Settings', 'Can change billing models', 'billing'),
-- Report permissions
('reports.view', 'View Reports', 'Can view analytics and reports', 'reports'),
('reports.export', 'Export Reports', 'Can export data', 'reports'),
-- System permissions
('system.manage_roles', 'Manage Roles', 'Can create/edit roles and permissions', 'system'),
('system.manage_users', 'Manage Users', 'Can add/remove admin users', 'system'),
('system.view_audit_logs', 'View Audit Logs', 'Can view system audit trail', 'system');

-- Grant super_admin ALL permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.name = 'super_admin';

-- Grant admin role a subset of permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.name = 'admin'
AND p.code NOT IN ('system.manage_roles', 'affiliates.promote', 'customers.delete', 'affiliates.delete');

-- Grant support_agent role permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.name = 'support_agent'
AND p.code IN ('customers.view', 'customers.edit', 'customers.impersonate', 
               'support.view_tickets', 'support.respond', 'support.close',
               'affiliates.view');

-- Grant manager role permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.name = 'manager'
AND p.code IN ('customers.view', 'affiliates.view', 'commissions.view', 
               'payouts.view', 'reports.view', 'reports.export');

-- Create user_has_permission function
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_permission_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admins have all permissions
  IF EXISTS (
    SELECT 1 FROM user_admin_roles uar
    JOIN admin_roles ar ON uar.role_id = ar.id
    WHERE uar.user_id = p_user_id AND ar.name = 'super_admin'
  ) THEN
    RETURN true;
  END IF;

  -- Check if user has specific permission through their roles
  RETURN EXISTS (
    SELECT 1
    FROM user_admin_roles uar
    JOIN admin_role_permissions arp ON uar.role_id = arp.role_id
    JOIN admin_permissions ap ON arp.permission_id = ap.id
    WHERE uar.user_id = p_user_id
    AND ap.code = p_permission_code
  );
END;
$$;

-- Create function to check if user is any kind of admin
CREATE OR REPLACE FUNCTION public.is_any_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_admin_roles
    WHERE user_id = p_user_id
  );
$$;

-- Create function to get user's admin roles
CREATE OR REPLACE FUNCTION public.get_user_admin_roles(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(role_id uuid, role_name text, is_system_role boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.id, ar.name, ar.is_system_role
  FROM user_admin_roles uar
  JOIN admin_roles ar ON uar.role_id = ar.id
  WHERE uar.user_id = p_user_id;
$$;

-- Create function to get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(permission_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- If super admin, return all permissions
  SELECT DISTINCT ap.code
  FROM admin_permissions ap
  WHERE EXISTS (
    SELECT 1 FROM user_admin_roles uar
    JOIN admin_roles ar ON uar.role_id = ar.id
    WHERE uar.user_id = p_user_id AND ar.name = 'super_admin'
  )
  UNION
  -- Otherwise return only assigned permissions
  SELECT DISTINCT ap.code
  FROM user_admin_roles uar
  JOIN admin_role_permissions arp ON uar.role_id = arp.role_id
  JOIN admin_permissions ap ON arp.permission_id = ap.id
  WHERE uar.user_id = p_user_id
  AND NOT EXISTS (
    SELECT 1 FROM user_admin_roles uar2
    JOIN admin_roles ar2 ON uar2.role_id = ar2.id
    WHERE uar2.user_id = p_user_id AND ar2.name = 'super_admin'
  );
$$;

-- RLS Policies for admin_roles
CREATE POLICY "admin_roles_admin_read" ON public.admin_roles
  FOR SELECT USING (is_admin());

CREATE POLICY "admin_roles_super_admin_all" ON public.admin_roles
  FOR ALL USING (is_super_admin());

-- RLS Policies for admin_permissions
CREATE POLICY "admin_permissions_admin_read" ON public.admin_permissions
  FOR SELECT USING (is_admin());

-- RLS Policies for admin_role_permissions
CREATE POLICY "admin_role_permissions_admin_read" ON public.admin_role_permissions
  FOR SELECT USING (is_admin());

CREATE POLICY "admin_role_permissions_super_admin_all" ON public.admin_role_permissions
  FOR ALL USING (is_super_admin());

-- RLS Policies for user_admin_roles
CREATE POLICY "user_admin_roles_admin_read" ON public.user_admin_roles
  FOR SELECT USING (is_admin());

CREATE POLICY "user_admin_roles_super_admin_all" ON public.user_admin_roles
  FOR ALL USING (is_super_admin());

-- Trigger for updated_at on admin_roles
CREATE TRIGGER update_admin_roles_updated_at
  BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();