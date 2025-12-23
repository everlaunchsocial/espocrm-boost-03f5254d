-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cold_outreach', 'follow_up', 'demo_invite', 'nurture', 'reactivation', 'closing')),
  subject_line TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_plain TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  performance_score DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_variants table for A/B testing
CREATE TABLE public.email_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL DEFAULT 'A',
  subject_line TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_plain TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_sends table for tracking
CREATE TABLE public.email_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.email_templates(id),
  variant_id UUID REFERENCES public.email_variants(id),
  lead_id UUID REFERENCES public.leads(id),
  subject_line TEXT NOT NULL,
  body_html TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  bounced BOOLEAN NOT NULL DEFAULT false,
  unsubscribed BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates
CREATE POLICY "email_templates_admin_all" ON public.email_templates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "email_templates_authenticated_select" ON public.email_templates
  FOR SELECT USING (auth.uid() IS NOT NULL AND (is_global = true OR created_by = auth.uid()));

CREATE POLICY "email_templates_user_insert" ON public.email_templates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "email_templates_user_update" ON public.email_templates
  FOR UPDATE USING (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- RLS policies for email_variants
CREATE POLICY "email_variants_admin_all" ON public.email_variants
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "email_variants_authenticated_select" ON public.email_variants
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "email_variants_user_manage" ON public.email_variants
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    template_id IN (SELECT id FROM public.email_templates WHERE created_by = auth.uid())
  );

-- RLS policies for email_sends
CREATE POLICY "email_sends_admin_all" ON public.email_sends
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "email_sends_authenticated_select" ON public.email_sends
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "email_sends_authenticated_insert" ON public.email_sends
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_email_templates_category ON public.email_templates(category);
CREATE INDEX idx_email_templates_is_active ON public.email_templates(is_active);
CREATE INDEX idx_email_variants_template ON public.email_variants(template_id);
CREATE INDEX idx_email_sends_template ON public.email_sends(template_id);
CREATE INDEX idx_email_sends_lead ON public.email_sends(lead_id);
CREATE INDEX idx_email_sends_sent_at ON public.email_sends(sent_at);

-- Insert pre-built templates
INSERT INTO public.email_templates (name, category, subject_line, body_html, body_plain, variables, is_active, is_global, performance_score) VALUES
-- Cold Outreach Templates
('Problem-Solution', 'cold_outreach', 'Noticed {{company}} might be missing calls?', 
'<p>Hi {{first_name}},</p><p>I noticed {{company}} might be missing customer calls during peak hours.</p><p>{{industry}} businesses like yours typically lose 30-40% of calls during busy times. Our AI receptionist answers every call 24/7, books appointments, and never puts customers on hold.</p><p>Would you be open to a quick 15-minute demo?</p><p>Best,<br>{{sender_name}}</p>',
'Hi {{first_name}},\n\nI noticed {{company}} might be missing customer calls during peak hours.\n\n{{industry}} businesses like yours typically lose 30-40% of calls during busy times. Our AI receptionist answers every call 24/7, books appointments, and never puts customers on hold.\n\nWould you be open to a quick 15-minute demo?\n\nBest,\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'sender_name'], true, true, 85),

('Mutual Connection', 'cold_outreach', '{{connection}} suggested I reach out', 
'<p>Hi {{first_name}},</p><p>{{connection}} mentioned you might be interested in how we''re helping {{industry}} businesses handle more calls without hiring additional staff.</p><p>Our AI phone system is already helping businesses like {{company}} capture leads they were missing.</p><p>Would love to share a quick demo. Worth 15 minutes of your time?</p><p>Best,<br>{{sender_name}}</p>',
'Hi {{first_name}},\n\n{{connection}} mentioned you might be interested in how we''re helping {{industry}} businesses handle more calls without hiring additional staff.\n\nOur AI phone system is already helping businesses like {{company}} capture leads they were missing.\n\nWould love to share a quick demo. Worth 15 minutes of your time?\n\nBest,\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'connection', 'sender_name'], true, true, 78),

('Industry Insight', 'cold_outreach', 'How {{industry}} businesses are handling after-hours calls', 
'<p>Hi {{first_name}},</p><p>I''ve been researching how {{industry}} businesses handle the challenge of missed calls, especially after hours.</p><p>The top performers I''ve spoken with are using AI to capture every lead. One {{industry}} business increased their booked appointments by 40% just by having AI answer when they couldn''t.</p><p>Curious if this is something {{company}} has looked into?</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nI''ve been researching how {{industry}} businesses handle the challenge of missed calls, especially after hours.\n\nThe top performers I''ve spoken with are using AI to capture every lead. One {{industry}} business increased their booked appointments by 40% just by having AI answer when they couldn''t.\n\nCurious if this is something {{company}} has looked into?\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'sender_name'], true, true, 72),

('Direct Value', 'cold_outreach', 'Can we save {{company}} 10 hours/week?', 
'<p>Hi {{first_name}},</p><p>What if {{company}} could save 10+ hours per week on phone calls while never missing a lead?</p><p>Our AI receptionist handles incoming calls, answers questions, and books appointments - all without you lifting a finger.</p><p>Quick demo? I''ll show you exactly how it works for {{industry}} businesses.</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nWhat if {{company}} could save 10+ hours per week on phone calls while never missing a lead?\n\nOur AI receptionist handles incoming calls, answers questions, and books appointments - all without you lifting a finger.\n\nQuick demo? I''ll show you exactly how it works for {{industry}} businesses.\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'sender_name'], true, true, 80),

('Curiosity Hook', 'cold_outreach', 'Quick question about {{company}}', 
'<p>Hi {{first_name}},</p><p>Quick question - when a customer calls {{company}} after hours, what happens?</p><p>If the answer is voicemail or a missed call, you might be losing 30% of potential business.</p><p>I''d love to show you how our AI solves this in 15 minutes.</p><p>Worth a quick look?</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nQuick question - when a customer calls {{company}} after hours, what happens?\n\nIf the answer is voicemail or a missed call, you might be losing 30% of potential business.\n\nI''d love to show you how our AI solves this in 15 minutes.\n\nWorth a quick look?\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'sender_name'], true, true, 88),

-- Follow-Up Templates
('Demo Follow-Up Day 2', 'follow_up', 'Thoughts on the demo, {{first_name}}?', 
'<p>Hi {{first_name}},</p><p>Hope you had a chance to check out the demo I sent over for {{company}}.</p><p>Any questions I can answer? I''m happy to walk through anything that would help you make a decision.</p><p>Let me know!</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nHope you had a chance to check out the demo I sent over for {{company}}.\n\nAny questions I can answer? I''m happy to walk through anything that would help you make a decision.\n\nLet me know!\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'sender_name'], true, true, 90),

('Demo Follow-Up Day 7', 'follow_up', 'Still thinking about it?', 
'<p>Hi {{first_name}},</p><p>I wanted to circle back on the AI phone demo for {{company}}.</p><p>I know you''re busy, so I''ll keep this short: if you''re still interested in never missing another customer call, I''d love to answer any questions.</p><p>If timing isn''t right, just let me know and I''ll follow up in a few months.</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nI wanted to circle back on the AI phone demo for {{company}}.\n\nI know you''re busy, so I''ll keep this short: if you''re still interested in never missing another customer call, I''d love to answer any questions.\n\nIf timing isn''t right, just let me know and I''ll follow up in a few months.\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'sender_name'], true, true, 82),

('No Response Follow-Up', 'follow_up', 'Did I lose you, {{first_name}}?', 
'<p>Hi {{first_name}},</p><p>I haven''t heard back from you - hope everything''s okay!</p><p>I know {{industry}} gets hectic. If you''re still interested in seeing how AI can handle your calls, I''m here.</p><p>If not, no worries at all. Just wanted to make sure you have what you need.</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nI haven''t heard back from you - hope everything''s okay!\n\nI know {{industry}} gets hectic. If you''re still interested in seeing how AI can handle your calls, I''m here.\n\nIf not, no worries at all. Just wanted to make sure you have what you need.\n\n{{sender_name}}',
ARRAY['first_name', 'industry', 'sender_name'], true, true, 75),

('Break-Up Email', 'follow_up', 'Should I close your file?', 
'<p>Hi {{first_name}},</p><p>I''ve reached out a few times about our AI phone system for {{company}}, but haven''t heard back.</p><p>I don''t want to keep bothering you, so this will be my last email. If you ever want to revisit this, just reply and I''ll be here.</p><p>Wishing {{company}} all the best!</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nI''ve reached out a few times about our AI phone system for {{company}}, but haven''t heard back.\n\nI don''t want to keep bothering you, so this will be my last email. If you ever want to revisit this, just reply and I''ll be here.\n\nWishing {{company}} all the best!\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'sender_name'], true, true, 92),

('Post-Call Summary', 'follow_up', 'Great chatting, {{first_name}} - next steps', 
'<p>Hi {{first_name}},</p><p>Thanks for taking the time to chat today! Here''s a quick recap:</p><p><strong>What we discussed:</strong><br>{{call_summary}}</p><p><strong>Next steps:</strong><br>{{next_steps}}</p><p>Let me know if you have any questions!</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nThanks for taking the time to chat today! Here''s a quick recap:\n\nWhat we discussed:\n{{call_summary}}\n\nNext steps:\n{{next_steps}}\n\nLet me know if you have any questions!\n\n{{sender_name}}',
ARRAY['first_name', 'call_summary', 'next_steps', 'sender_name'], true, true, 94),

('Question-Based Re-Engagement', 'follow_up', 'One quick question, {{first_name}}', 
'<p>Hi {{first_name}},</p><p>I was just thinking about {{company}} and had a quick question:</p><p>What''s the biggest challenge you face with incoming calls right now?</p><p>I might have some ideas that could help, even if our AI isn''t the right fit.</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nI was just thinking about {{company}} and had a quick question:\n\nWhat''s the biggest challenge you face with incoming calls right now?\n\nI might have some ideas that could help, even if our AI isn''t the right fit.\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'sender_name'], true, true, 85),

-- Demo Invite Templates
('Personalized Demo Invite', 'demo_invite', 'Your personalized {{company}} demo is ready', 
'<p>Hi {{first_name}},</p><p>I created a personalized demo showing exactly how our AI would answer calls for {{company}}.</p><p><a href="{{demo_link}}">Click here to watch your demo</a></p><p>It takes about 3 minutes and shows real scenarios for {{industry}} businesses.</p><p>Let me know what you think!</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nI created a personalized demo showing exactly how our AI would answer calls for {{company}}.\n\n{{demo_link}}\n\nIt takes about 3 minutes and shows real scenarios for {{industry}} businesses.\n\nLet me know what you think!\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'demo_link', 'sender_name'], true, true, 88),

('Calendar Invite', 'demo_invite', 'Pick a time for your demo, {{first_name}}', 
'<p>Hi {{first_name}},</p><p>Ready to see how our AI can transform {{company}}''s phone experience?</p><p><a href="{{calendar_link}}">Pick a time that works for you</a></p><p>It''s just 15 minutes - I''ll show you exactly how it works for {{industry}} businesses.</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nReady to see how our AI can transform {{company}}''s phone experience?\n\n{{calendar_link}}\n\nIt''s just 15 minutes - I''ll show you exactly how it works for {{industry}} businesses.\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'calendar_link', 'sender_name'], true, true, 82),

-- Nurture Templates
('Value Content Share', 'nurture', '{{industry}} tip: How to capture more leads', 
'<p>Hi {{first_name}},</p><p>I came across this and thought of {{company}}:</p><p>{{industry}} businesses that respond to calls within 5 minutes are 21x more likely to convert the lead.</p><p>Our AI answers in under 3 seconds - just something to think about!</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nI came across this and thought of {{company}}:\n\n{{industry}} businesses that respond to calls within 5 minutes are 21x more likely to convert the lead.\n\nOur AI answers in under 3 seconds - just something to think about!\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'sender_name'], true, true, 70),

('Case Study Share', 'nurture', 'How another {{industry}} business increased bookings 40%', 
'<p>Hi {{first_name}},</p><p>Thought you might find this interesting - we recently helped a {{industry}} business similar to {{company}} increase their booked appointments by 40%.</p><p>The key? Never missing a single call, even during their busiest hours.</p><p>Happy to share more details if you''re curious!</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nThought you might find this interesting - we recently helped a {{industry}} business similar to {{company}} increase their booked appointments by 40%.\n\nThe key? Never missing a single call, even during their busiest hours.\n\nHappy to share more details if you''re curious!\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'sender_name'], true, true, 76),

-- Reactivation Templates
('We Miss You', 'reactivation', 'A lot has changed, {{first_name}}', 
'<p>Hi {{first_name}},</p><p>It''s been a while since we chatted about AI phone solutions for {{company}}.</p><p>Just wanted to let you know we''ve made some big improvements since then:</p><ul><li>Even smarter AI conversations</li><li>Better integrations</li><li>New features for {{industry}}</li></ul><p>Worth a fresh look?</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nIt''s been a while since we chatted about AI phone solutions for {{company}}.\n\nJust wanted to let you know we''ve made some big improvements since then:\n\n- Even smarter AI conversations\n- Better integrations\n- New features for {{industry}}\n\nWorth a fresh look?\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'sender_name'], true, true, 68),

('Special Offer', 'reactivation', 'Special offer for {{company}}', 
'<p>Hi {{first_name}},</p><p>Since you showed interest before, I wanted to reach out with a special offer for {{company}}.</p><p>We''re currently offering {{offer_details}} for {{industry}} businesses.</p><p>This won''t last long - interested in chatting?</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nSince you showed interest before, I wanted to reach out with a special offer for {{company}}.\n\nWe''re currently offering {{offer_details}} for {{industry}} businesses.\n\nThis won''t last long - interested in chatting?\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'offer_details', 'sender_name'], true, true, 74),

-- Closing Templates
('Ready to Start', 'closing', 'Ready to get {{company}} started?', 
'<p>Hi {{first_name}},</p><p>It seems like you''re ready to move forward with our AI phone system for {{company}}.</p><p>Here''s what happens next:</p><ol><li>Quick 10-minute setup call</li><li>We customize the AI for {{industry}}</li><li>You start capturing more leads!</li></ol><p>Ready to get started? Just reply "yes" and I''ll send over the details.</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nIt seems like you''re ready to move forward with our AI phone system for {{company}}.\n\nHere''s what happens next:\n\n1. Quick 10-minute setup call\n2. We customize the AI for {{industry}}\n3. You start capturing more leads!\n\nReady to get started? Just reply "yes" and I''ll send over the details.\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'industry', 'sender_name'], true, true, 86),

('Final Decision', 'closing', 'Final thoughts on {{company}}''s AI phone system?', 
'<p>Hi {{first_name}},</p><p>I know you''ve been considering our AI for {{company}}. Before you make a final decision, I wanted to address any last concerns.</p><p>What''s holding you back? I''m here to help make this easy.</p><p>{{sender_name}}</p>',
'Hi {{first_name}},\n\nI know you''ve been considering our AI for {{company}}. Before you make a final decision, I wanted to address any last concerns.\n\nWhat''s holding you back? I''m here to help make this easy.\n\n{{sender_name}}',
ARRAY['first_name', 'company', 'sender_name'], true, true, 80);