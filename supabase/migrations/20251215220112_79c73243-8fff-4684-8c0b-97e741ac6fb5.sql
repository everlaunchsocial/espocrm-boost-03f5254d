
-- ============================================
-- PHASE 1: EverLaunch AI Affiliate Video Creator
-- Database Schema, RLS, Indexes, Seeds
-- ============================================

-- Create status enums
CREATE TYPE public.avatar_profile_status AS ENUM ('draft', 'uploading', 'training', 'ready', 'failed');
CREATE TYPE public.video_status AS ENUM ('draft', 'generating', 'ready', 'failed');
CREATE TYPE public.video_type AS ENUM ('recruitment', 'product', 'attorney', 'dentist', 'salon', 'plumber');
CREATE TYPE public.video_event_type AS ENUM ('view', 'phone_cta', 'chat_cta', 'voice_cta');

-- ============================================
-- Table: affiliate_avatar_profiles
-- ONE profile per affiliate (5 photos + voice)
-- ============================================
CREATE TABLE public.affiliate_avatar_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL UNIQUE REFERENCES public.affiliates(id) ON DELETE CASCADE,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  voice_audio_url TEXT,
  elevenlabs_voice_id TEXT,
  heygen_avatar_group_id TEXT,
  heygen_avatar_id TEXT,
  status avatar_profile_status NOT NULL DEFAULT 'draft',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for affiliate_avatar_profiles
ALTER TABLE public.affiliate_avatar_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliates_own_profile_select" ON public.affiliate_avatar_profiles
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "affiliates_own_profile_insert" ON public.affiliate_avatar_profiles
  FOR INSERT WITH CHECK (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "affiliates_own_profile_update" ON public.affiliate_avatar_profiles
  FOR UPDATE USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "affiliates_own_profile_delete" ON public.affiliate_avatar_profiles
  FOR DELETE USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "admins_all_profiles" ON public.affiliate_avatar_profiles
  FOR ALL USING (is_admin());

-- Index
CREATE INDEX idx_avatar_profiles_affiliate ON public.affiliate_avatar_profiles(affiliate_id);

-- ============================================
-- Table: video_script_templates
-- Admin-managed templates (affiliates cannot edit)
-- ============================================
CREATE TABLE public.video_script_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  video_type video_type NOT NULL,
  script_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for video_script_templates
ALTER TABLE public.video_script_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_select_active_templates" ON public.video_script_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "admins_manage_templates" ON public.video_script_templates
  FOR ALL USING (is_admin());

-- Seed templates
INSERT INTO public.video_script_templates (name, video_type, script_text, is_active, sort_order) VALUES
(
  'Generic Business Owner Recruitment',
  'recruitment',
  'Hey there! I''m excited to share something that''s been a game-changer for my business. You know how we''re all looking for ways to grow our income without trading more hours? Well, I found it with EverLaunch AI.

This AI-powered system handles customer calls 24/7, books appointments, and captures leads while I sleep. And here''s the best part - I''m not just using it, I''m earning commissions by sharing it with other business owners like you.

Whether you own a dental practice, law firm, HVAC company, or any service business - this technology is transforming how we handle customer calls. No more missed opportunities, no more voicemail black holes.

Click below to see a live demo of exactly what your customers would experience when they call your business. I think you''ll be impressed.

Let''s connect and I''ll show you how this can work for your specific situation.',
  true,
  1
),
(
  'Attorney/Law Firm',
  'attorney',
  'If you''re running a law firm, you know that every missed call could be a potential client walking out the door. I''ve been helping attorneys solve this problem with EverLaunch AI.

Picture this: A potential client calls your office at 9 PM after getting in an accident. Instead of voicemail, they get a professional AI receptionist that gathers their case details, schedules a consultation, and sends you a complete summary - all while you''re at home with your family.

The AI is trained specifically for legal intake. It knows the right questions to ask, maintains confidentiality, and never makes your firm look unprofessional.

I''ve seen firms increase their client intake by 40% just by capturing those after-hours and overflow calls. Click below to experience exactly what your potential clients would hear. I think you''ll see why so many attorneys are making the switch.

Ready to stop losing clients to voicemail? Let''s talk.',
  true,
  2
),
(
  'Dentist/Dental Practice',
  'dentist',
  'Running a dental practice means you''re focused on patient care - not answering phones. But here''s the thing: when a new patient calls and gets voicemail, they''re calling the next dentist on their list.

That''s why I''ve been sharing EverLaunch AI with dental practices. It''s an AI receptionist that answers every call, schedules appointments directly into your calendar, and handles insurance questions - 24 hours a day, 7 days a week.

Your front desk staff can focus on the patients in your office while the AI handles the phone. And for those after-hours emergency calls? The AI knows exactly how to triage and respond appropriately.

Click below to hear exactly what your patients would experience. You''ll see why dental practices are loving this technology.

Let me show you how it would work for your specific practice.',
  true,
  3
),
(
  'Home Services/HVAC',
  'plumber',
  'In the home services business, speed wins. When someone''s AC goes out in July or their pipe bursts at midnight, they''re calling the first company that answers.

I''ve been helping HVAC, plumbing, and electrical companies capture every single one of those calls with EverLaunch AI. This AI receptionist answers instantly, gathers the job details, and books the appointment - even at 2 AM.

No more losing emergency calls to competitors. No more paying overtime for after-hours dispatchers. The AI handles it all professionally, just like your best employee would.

Click below to experience what your customers would hear when they call. I think you''ll see why this is becoming essential for home service companies.

Ready to never miss another service call? Let''s connect.',
  true,
  4
),
(
  'Salon/Spa',
  'salon',
  'Salon owners, I know your team is busy creating amazing experiences for clients. The last thing you need is to be tied to the phone all day.

That''s exactly why EverLaunch AI is perfect for salons and spas. This AI receptionist books appointments, answers questions about services and pricing, and even handles appointment confirmations and reminders - all without interrupting your stylists.

Imagine never missing a new client call because everyone was busy with appointments. The AI handles it gracefully, checks your availability, and books them right in.

Click below to hear exactly how the AI would represent your salon. It''s professional, friendly, and always available.

Let me show you how easy it is to set up for your business.',
  true,
  5
);

-- ============================================
-- Table: affiliate_videos
-- Up to 5 videos per affiliate from templates
-- ============================================
CREATE TABLE public.affiliate_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.affiliate_avatar_profiles(id) ON DELETE CASCADE,
  video_name TEXT NOT NULL,
  video_type video_type NOT NULL,
  script_template_id UUID NOT NULL REFERENCES public.video_script_templates(id),
  heygen_video_id TEXT,
  heygen_video_url TEXT,
  status video_status NOT NULL DEFAULT 'draft',
  error_message TEXT,
  landing_page_slug TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  estimated_cost_usd NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for affiliate_videos
ALTER TABLE public.affiliate_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliates_own_videos_select" ON public.affiliate_videos
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "affiliates_own_videos_insert" ON public.affiliate_videos
  FOR INSERT WITH CHECK (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "affiliates_own_videos_update" ON public.affiliate_videos
  FOR UPDATE USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "affiliates_own_videos_delete" ON public.affiliate_videos
  FOR DELETE USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "admins_all_videos" ON public.affiliate_videos
  FOR ALL USING (is_admin());

-- Indexes
CREATE INDEX idx_videos_affiliate ON public.affiliate_videos(affiliate_id);
CREATE INDEX idx_videos_profile ON public.affiliate_videos(profile_id);
CREATE INDEX idx_videos_slug ON public.affiliate_videos(landing_page_slug);

-- ============================================
-- Table: video_analytics
-- Track views and CTA clicks
-- ============================================
CREATE TABLE public.video_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.affiliate_videos(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  event_type video_event_type NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- RLS for video_analytics
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliates_own_analytics_select" ON public.video_analytics
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "public_insert_analytics" ON public.video_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admins_all_analytics" ON public.video_analytics
  FOR ALL USING (is_admin());

-- Indexes
CREATE INDEX idx_analytics_video ON public.video_analytics(video_id);
CREATE INDEX idx_analytics_affiliate ON public.video_analytics(affiliate_id);
CREATE INDEX idx_analytics_timestamp ON public.video_analytics(event_timestamp);

-- ============================================
-- Table: video_system_settings
-- Admin configurable settings (e.g., max videos)
-- ============================================
CREATE TABLE public.video_system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.video_system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_select_settings" ON public.video_system_settings
  FOR SELECT USING (true);

CREATE POLICY "admins_manage_settings" ON public.video_system_settings
  FOR ALL USING (is_admin());

-- Seed default settings
INSERT INTO public.video_system_settings (setting_key, setting_value) VALUES
('max_videos_per_affiliate', '5');

-- ============================================
-- Table: video_cost_log
-- Track HeyGen/ElevenLabs costs per operation
-- ============================================
CREATE TABLE public.video_cost_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  estimated_credits NUMERIC(10,2),
  estimated_cost_usd NUMERIC(10,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_cost_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_cost_log" ON public.video_cost_log
  FOR ALL USING (is_admin());

CREATE INDEX idx_cost_log_affiliate ON public.video_cost_log(affiliate_id);
CREATE INDEX idx_cost_log_created ON public.video_cost_log(created_at);

-- ============================================
-- Storage buckets for photos and voices
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('affiliate-photos', 'affiliate-photos', false),
  ('affiliate-voices', 'affiliate-voices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for affiliate-photos
CREATE POLICY "affiliates_insert_own_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'affiliate-photos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "affiliates_select_own_photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'affiliate-photos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "affiliates_delete_own_photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'affiliate-photos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for affiliate-voices
CREATE POLICY "affiliates_insert_own_voices" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'affiliate-voices' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "affiliates_select_own_voices" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'affiliate-voices' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "affiliates_delete_own_voices" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'affiliate-voices' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update trigger for timestamps
CREATE TRIGGER update_affiliate_avatar_profiles_updated_at
  BEFORE UPDATE ON public.affiliate_avatar_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_videos_updated_at
  BEFORE UPDATE ON public.affiliate_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
