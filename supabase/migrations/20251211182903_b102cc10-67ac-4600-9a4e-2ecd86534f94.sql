-- Fix function search path and create training tables

-- Fix the admin check function with proper search_path
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND global_role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Training categories for organizing content
CREATE TABLE public.training_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training modules (courses/lessons)
CREATE TABLE public.training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.training_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'video' CHECK (content_type IN ('video', 'article', 'pdf', 'quiz')),
  content_url TEXT,
  content_body TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Track affiliate progress through training
CREATE TABLE public.training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_position_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(affiliate_id, module_id)
);

-- Enable RLS
ALTER TABLE public.training_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

-- Training categories: anyone can read, only admins can modify
CREATE POLICY "Anyone can view training categories"
  ON public.training_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage training categories"
  ON public.training_categories FOR ALL
  USING (public.is_admin_or_super_admin());

-- Training modules: anyone can read published, admins can manage all
CREATE POLICY "Anyone can view published training modules"
  ON public.training_modules FOR SELECT
  USING (is_published = true OR public.is_admin_or_super_admin());

CREATE POLICY "Admins can manage training modules"
  ON public.training_modules FOR ALL
  USING (public.is_admin_or_super_admin());

-- Training progress: affiliates see own, admins see all
CREATE POLICY "Affiliates can view own training progress"
  ON public.training_progress FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    OR public.is_admin_or_super_admin()
  );

CREATE POLICY "Affiliates can insert own training progress"
  ON public.training_progress FOR INSERT
  WITH CHECK (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "Affiliates can update own training progress"
  ON public.training_progress FOR UPDATE
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

-- Timestamp triggers
CREATE TRIGGER update_training_categories_updated_at
  BEFORE UPDATE ON public.training_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON public.training_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_progress_updated_at
  BEFORE UPDATE ON public.training_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial training categories
INSERT INTO public.training_categories (name, description, icon, sort_order) VALUES
  ('Getting Started', 'Essential training for new affiliates', 'rocket', 1),
  ('Sales Techniques', 'Master the art of selling EverLaunch AI', 'trending-up', 2),
  ('Product Knowledge', 'Deep dive into EverLaunch AI features', 'book-open', 3),
  ('Marketing & Outreach', 'Strategies for finding and converting leads', 'megaphone', 4),
  ('Advanced Strategies', 'Take your business to the next level', 'trophy', 5);