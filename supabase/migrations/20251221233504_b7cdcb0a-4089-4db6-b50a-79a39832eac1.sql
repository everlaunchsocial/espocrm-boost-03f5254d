-- Recreate view with SECURITY INVOKER to use querying user's permissions
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

-- Demo views
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

COMMENT ON VIEW lead_timeline IS 'Aggregated timeline of all lead activities - uses SECURITY INVOKER for proper RLS';