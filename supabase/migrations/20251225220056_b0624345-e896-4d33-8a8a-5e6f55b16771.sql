-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'affiliate', 'customer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'customer',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can read their own role
CREATE POLICY "user_roles_self_select" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

-- RLS policy: Only admins can manage roles (via security definer functions)
-- No direct insert/update/delete policies - all changes go through functions

-- Create security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Create function for current user to get their own role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Backfill existing roles from profiles table
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    p.user_id,
    CASE 
        WHEN p.global_role = 'super_admin' THEN 'super_admin'::app_role
        WHEN p.global_role = 'admin' THEN 'admin'::app_role
        WHEN p.global_role = 'affiliate' THEN 'affiliate'::app_role
        ELSE 'customer'::app_role
    END,
    p.created_at
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
);

-- Update is_admin function to use user_roles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
  )
$$;

-- Update is_super_admin function to use user_roles table
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  )
$$;

-- Create function to set affiliate role (for affiliate signup)
CREATE OR REPLACE FUNCTION public.set_my_role_affiliate()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow setting to affiliate if user doesn't already have a higher role
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  ) THEN
    RETURN false;
  END IF;
  
  -- Upsert the role
  INSERT INTO public.user_roles (user_id, role, updated_at)
  VALUES (auth.uid(), 'affiliate', now())
  ON CONFLICT (user_id) 
  DO UPDATE SET role = 'affiliate', updated_at = now()
  WHERE user_roles.role NOT IN ('super_admin', 'admin');
  
  RETURN true;
END;
$$;

-- Create trigger to add default role for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Create public RPC for affiliate lookup by username (for attribution)
CREATE OR REPLACE FUNCTION public.get_affiliate_by_username(p_username text)
RETURNS TABLE(id uuid, username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.username
  FROM public.affiliates a
  WHERE a.username = lower(p_username)
  LIMIT 1
$$;