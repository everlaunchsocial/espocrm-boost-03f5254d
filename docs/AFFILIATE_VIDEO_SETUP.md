# Affiliate Video Creator - Setup Guide

## Overview

The AI Affiliate Video Creator allows affiliates to create personalized video content using their own AI avatar. The system uses HeyGen for avatar/video generation and ElevenLabs for voice cloning.

## User Flow

### For Affiliates

1. **Navigate to Videos** (`/affiliate/videos`)
   - See profile status and existing videos
   
2. **Create Avatar Profile** (`/affiliate/create-profile`)
   - Step 1: Review photo requirements (5 photos needed)
   - Step 2: Upload 5 photos (different angles, expressions)
   - Step 3: Record or upload voice sample (30s-10min)
   - Step 4: Submit for processing
   - Wait for profile to reach "ready" status (~15-30 min)

3. **Generate Videos** (`/affiliate/create-video/:profileId`)
   - Select from admin-approved script templates
   - Preview script (non-editable)
   - Generate video (5-10 min processing)
   - Each video gets unique landing page slug

4. **Share Videos** (`/v/:slug`)
   - Copy shareable landing page URL
   - Track views and CTA clicks
   - CTAs route to demo pages with affiliate attribution

### For Super Admins

1. **Manage System** (`/admin/affiliate-videos`)
   - View all affiliate profiles and their status
   - View all generated videos
   - Create/edit/delete script templates
   - Monitor costs and usage

## Required API Keys

Add these secrets in Lovable Cloud → Settings → Secrets:

### HeyGen API
1. Sign up at https://app.heygen.com/
2. Go to Settings → API Keys
3. Generate an API key
4. Add secret: `HEYGEN_API_KEY=your_key_here`

### ElevenLabs API
1. Sign up at https://elevenlabs.io/
2. Go to Profile → API Keys
3. Generate an API key
4. Add secret: `ELEVENLABS_API_KEY=your_key_here`

### HeyGen Webhook Secret (Optional)
1. Get webhook URL: `https://mrcfpbkoulldnkqzzprb.supabase.co/functions/v1/heygen-webhook`
2. Register in HeyGen dashboard → Settings → Webhooks
3. Copy the webhook secret provided by HeyGen
4. Add secret: `HEYGEN_WEBHOOK_SECRET=your_secret_here`

## Storage Buckets

The following storage buckets are used:
- `affiliate-photos` - Private bucket for avatar training photos
- `affiliate-voices` - Private bucket for voice recordings

RLS policies restrict access to:
- Affiliates can only access their own files
- Admins can view all files

## Database Tables

### affiliate_avatar_profiles
Stores avatar profile data for each affiliate:
- `affiliate_id` - Owner affiliate
- `photo_urls` - Array of photo URLs
- `voice_audio_url` - Voice sample URL
- `heygen_avatar_id` - HeyGen avatar ID (after training)
- `elevenlabs_voice_id` - ElevenLabs voice ID (after cloning)
- `status` - draft | uploading | training | ready | failed

### affiliate_videos
Stores generated videos:
- `profile_id` - Reference to avatar profile
- `script_template_id` - Template used
- `heygen_video_id` - HeyGen video ID
- `heygen_video_url` - Final video URL
- `landing_page_slug` - Unique URL slug
- `status` - draft | generating | ready | failed

### video_script_templates
Admin-managed templates:
- `name` - Template name
- `video_type` - recruitment | attorney | dentist | salon | plumber | product_sales | testimonial
- `script_text` - The actual script (non-editable by affiliates)
- `is_active` - Show/hide in affiliate selection

### video_analytics
Tracks engagement:
- `video_id` - Video being tracked
- `event_type` - view | phone_cta | chat_cta | voice_cta
- `ip_address`, `user_agent`, `referrer` - Visitor data

## Edge Functions

### create-avatar-profile
- Uploads photos to HeyGen
- Creates avatar training group
- Clones voice with ElevenLabs
- Updates profile status

### generate-affiliate-video
- Validates profile is ready
- Enforces MAX_VIDEOS_PER_AFFILIATE limit (5)
- Calls HeyGen video generation
- Creates video record with draft status

### heygen-webhook
- Receives HeyGen completion notifications
- Updates video status to ready
- Generates unique landing page slug

### track-video-analytics
- Logs view and CTA click events
- Captures IP, user agent, referrer

## Cost Estimates

- Avatar profile creation: ~$15-30 one-time (HeyGen + ElevenLabs)
- Video generation: ~$2-5 per video (HeyGen)
- Default limit: 5 videos per affiliate

## Design Constraints

1. **ONE avatar profile per affiliate** - Trained once, used for all videos
2. **Videos are static templates** - NOT dynamically regenerated per prospect
3. **Templates are admin-approved** - Affiliates cannot edit scripts
4. **MAX 5 videos per affiliate** - Enforced server-side
5. **All CTAs route to existing demo pages** - With affiliate attribution

## Testing Checklist

- [ ] Storage buckets created with RLS policies
- [ ] API keys added to secrets
- [ ] Edge functions deployed
- [ ] Webhook registered in HeyGen (optional)
- [ ] Script templates seeded in database
- [ ] Test affiliate can access `/affiliate/videos`
- [ ] Test photo upload (5 photos)
- [ ] Test voice recording/upload
- [ ] Test avatar profile creation
- [ ] Test video generation
- [ ] Test landing page displays video
- [ ] Test CTAs link to demo pages
- [ ] Test analytics tracking
