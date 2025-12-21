-- Create demo_views table to track when leads watch demos
CREATE TABLE public.demo_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_id UUID NOT NULL REFERENCES public.demos(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  watch_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_views ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow public insert on demo_views" 
  ON public.demo_views FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public read on demo_views" 
  ON public.demo_views FOR SELECT 
  USING (true);

CREATE POLICY "Allow public update on demo_views" 
  ON public.demo_views FOR UPDATE 
  USING (true);

-- Create index for efficient lookups
CREATE INDEX idx_demo_views_lead_id ON public.demo_views(lead_id);
CREATE INDEX idx_demo_views_demo_id ON public.demo_views(demo_id);

-- Update the lead_timeline view to include demo_views
DROP VIEW IF EXISTS public.lead_timeline;

CREATE VIEW public.lead_timeline WITH (security_invoker = true) AS
-- Notes
SELECT 
  n.id,
  n.related_to_id as lead_id,
  'note'::text as event_type,
  n.content as summary,
  NULL::text as preview_content,
  n.created_at as event_at,
  jsonb_build_object('created_by', n.created_by) as metadata
FROM notes n
WHERE n.related_to_type = 'lead'

UNION ALL

-- Activities (calls, emails, meetings logged manually)
SELECT 
  a.id,
  a.related_to_id as lead_id,
  a.type as event_type,
  a.subject as summary,
  a.description as preview_content,
  a.created_at as event_at,
  jsonb_build_object('is_system_generated', a.is_system_generated) as metadata
FROM activities a
WHERE a.related_to_type = 'lead'

UNION ALL

-- Call logs (AI-assisted calls)
SELECT 
  cl.id,
  cl.lead_id,
  'voice_call'::text as event_type,
  COALESCE(cl.summary, 'Voice call recorded') as summary,
  LEFT(cl.transcript, 200) as preview_content,
  cl.created_at as event_at,
  jsonb_build_object(
    'duration_seconds', cl.duration_seconds,
    'suggested_status', cl.suggested_status,
    'action_items', cl.action_items
  ) as metadata
FROM call_logs cl
WHERE cl.lead_id IS NOT NULL

UNION ALL

-- Demo views (tracked watching of demos)
SELECT 
  dv.id,
  dv.lead_id,
  'demo_watched'::text as event_type,
  'Watched Demo' as summary,
  d.business_name as preview_content,
  dv.created_at as event_at,
  jsonb_build_object(
    'demo_id', dv.demo_id,
    'progress_percent', dv.progress_percent,
    'watch_duration_seconds', dv.watch_duration_seconds,
    'demo_status', d.status
  ) as metadata
FROM demo_views dv
JOIN demos d ON d.id = dv.demo_id
WHERE dv.lead_id IS NOT NULL
  AND d.email_sent_at IS NOT NULL
  AND dv.created_at > d.email_sent_at

UNION ALL

-- Demo status events (created, sent, engaged)
SELECT 
  d.id,
  d.lead_id,
  'demo_view'::text as event_type,
  CASE 
    WHEN d.converted_at IS NOT NULL THEN 'Demo converted to customer'
    WHEN d.last_viewed_at IS NOT NULL THEN 'Demo viewed'
    WHEN d.email_sent_at IS NOT NULL THEN 'Demo email sent'
    ELSE 'Demo created'
  END as summary,
  d.business_name as preview_content,
  COALESCE(d.last_viewed_at, d.email_sent_at, d.created_at) as event_at,
  jsonb_build_object(
    'view_count', d.view_count,
    'chat_interaction_count', d.chat_interaction_count,
    'voice_interaction_count', d.voice_interaction_count,
    'status', d.status
  ) as metadata
FROM demos d
WHERE d.lead_id IS NOT NULL

UNION ALL

-- Follow-up actions from learning log
SELECT 
  fl.id,
  fl.lead_id,
  'followup'::text as event_type,
  fl.suggestion_text as summary,
  NULL::text as preview_content,
  fl.recorded_at as event_at,
  jsonb_build_object(
    'suggestion_type', fl.suggestion_type,
    'accepted', fl.accepted,
    'confirmed', fl.confirmed
  ) as metadata
FROM followup_learning_log fl
WHERE fl.lead_id IS NOT NULL

ORDER BY event_at DESC;

COMMENT ON VIEW lead_timeline IS 'Aggregated timeline of all lead activities including demo watches - uses SECURITY INVOKER for proper RLS';