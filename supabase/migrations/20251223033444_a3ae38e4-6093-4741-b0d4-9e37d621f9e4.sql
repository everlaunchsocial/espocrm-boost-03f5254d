-- Create competitors table
CREATE TABLE public.competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  website TEXT,
  category TEXT NOT NULL CHECK (category IN ('direct', 'indirect', 'alternative_solution')),
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  pricing_info JSONB DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create competitive_mentions table
CREATE TABLE public.competitive_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  mentioned_in TEXT NOT NULL CHECK (mentioned_in IN ('call_notes', 'email', 'demo_feedback', 'lost_reason')),
  context TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  mentioned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mentioned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create win_loss_analysis table
CREATE TABLE public.win_loss_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost')),
  competitor_id UUID REFERENCES public.competitors(id),
  primary_reason TEXT NOT NULL,
  detailed_notes TEXT,
  deal_value DECIMAL(12, 2),
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analyzed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create battle_cards table
CREATE TABLE public.battle_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE UNIQUE,
  card_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  auto_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_competitive_mentions_lead ON public.competitive_mentions(lead_id);
CREATE INDEX idx_competitive_mentions_competitor ON public.competitive_mentions(competitor_id);
CREATE INDEX idx_competitive_mentions_date ON public.competitive_mentions(mentioned_at);
CREATE INDEX idx_win_loss_lead ON public.win_loss_analysis(lead_id);
CREATE INDEX idx_win_loss_competitor ON public.win_loss_analysis(competitor_id);
CREATE INDEX idx_win_loss_outcome ON public.win_loss_analysis(outcome);
CREATE INDEX idx_battle_cards_competitor ON public.battle_cards(competitor_id);

-- Enable RLS
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitive_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.win_loss_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_cards ENABLE ROW LEVEL SECURITY;

-- Competitors policies (read-only for authenticated, admin can modify)
CREATE POLICY "competitors_authenticated_select" ON public.competitors
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "competitors_admin_all" ON public.competitors
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Competitive mentions policies
CREATE POLICY "competitive_mentions_authenticated_select" ON public.competitive_mentions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "competitive_mentions_authenticated_insert" ON public.competitive_mentions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "competitive_mentions_admin_all" ON public.competitive_mentions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Win/loss analysis policies
CREATE POLICY "win_loss_authenticated_select" ON public.win_loss_analysis
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "win_loss_authenticated_insert" ON public.win_loss_analysis
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "win_loss_admin_all" ON public.win_loss_analysis
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Battle cards policies
CREATE POLICY "battle_cards_authenticated_select" ON public.battle_cards
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "battle_cards_admin_all" ON public.battle_cards
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Pre-populate common competitors
INSERT INTO public.competitors (name, website, category, strengths, weaknesses) VALUES
  ('CallRail', 'https://callrail.com', 'direct', 
   ARRAY['Strong call tracking', 'Established brand', 'Good integrations'],
   ARRAY['No AI receptionist', 'Manual call handling required', 'Limited automation']),
  ('Dialpad', 'https://dialpad.com', 'direct',
   ARRAY['Unified communications', 'Good mobile app', 'AI transcription'],
   ARRAY['Complex pricing', 'Enterprise focus', 'Less small business friendly']),
  ('RingCentral', 'https://ringcentral.com', 'direct',
   ARRAY['Full phone system', 'Many integrations', 'Established player'],
   ARRAY['Expensive', 'Complex setup', 'No AI receptionist']),
  ('Grasshopper', 'https://grasshopper.com', 'indirect',
   ARRAY['Simple pricing', 'Easy setup', 'Good for solopreneurs'],
   ARRAY['Basic features', 'No AI', 'Limited scalability']),
  ('Ruby Receptionist', 'https://ruby.com', 'alternative_solution',
   ARRAY['Human receptionists', 'High touch service', 'Established brand'],
   ARRAY['Expensive per minute', 'Limited hours', 'Not scalable']);

-- Create initial battle cards for competitors
INSERT INTO public.battle_cards (competitor_id, card_content, auto_generated)
SELECT 
  id,
  jsonb_build_object(
    'competitor_overview', 'Competitor analysis pending',
    'our_advantages', '[]'::jsonb,
    'their_advantages', '[]'::jsonb,
    'landmines', '[]'::jsonb,
    'key_differentiators', '[]'::jsonb,
    'pricing_comparison', '{}'::jsonb,
    'trap_questions', '[]'::jsonb
  ),
  false
FROM public.competitors;