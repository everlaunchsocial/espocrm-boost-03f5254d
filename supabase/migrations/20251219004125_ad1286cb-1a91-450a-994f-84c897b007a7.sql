-- Create prompt_templates table for storing AI prompts by vertical
CREATE TABLE public.prompt_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'universal', -- vertical key or 'universal'
  use_case TEXT NOT NULL DEFAULT 'system_prompt', -- system_prompt, greeting, lead_capture, faq, escalation, wrap_up
  prompt_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- list of {{variable}} placeholders
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  parent_version_id UUID REFERENCES public.prompt_templates(id),
  research_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(prompt_content, '')), 'B')
  ) STORED
);

-- Create index for full-text search
CREATE INDEX idx_prompt_templates_search ON public.prompt_templates USING gin(search_vector);

-- Create index for category lookups
CREATE INDEX idx_prompt_templates_category ON public.prompt_templates(category);

-- Create index for use_case lookups
CREATE INDEX idx_prompt_templates_use_case ON public.prompt_templates(use_case);

-- Enable RLS
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- RLS policy for super admins
CREATE POLICY "prompt_templates_super_admin_all" ON public.prompt_templates
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();