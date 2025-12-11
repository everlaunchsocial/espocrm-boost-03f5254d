# EverLaunch Implementation Roadmap

## Executive Summary

**Status:** Base platform is functional with complete affiliate system, customer onboarding, voice AI integration, and billing.

**Goal:** Add training modules, AI-powered support systems, and polish features WITHOUT redesigning existing architecture.

**Philosophy:** Replace humans with AI in training and support functions wherever possible. Premium features require premium plans.

---

## Feature List Overview

| # | Feature Name | Priority | Est. Days | Status |
|---|--------------|----------|-----------|--------|
| | **CRITICAL FEATURES (Do First)** | | | |
| 1 | Lead Routing System | CRITICAL | 2 | ✅ COMPLETE |
| 2 | Income Disclaimers Component | CRITICAL | 1 | 🔄 IN PROGRESS |
| | **PHASE 1: Training Infrastructure (Days 1-3)** | | | |
| 3 | Training Module Database Schema | HIGH | 0.5 | ⬜ TODO |
| 4 | Affiliate Training Center Page | HIGH | 1 | ⬜ TODO |
| 5 | Customer Training Center Page | HIGH | 1 | ⬜ TODO |
| | **PHASE 2: AI Support System (Days 4-7)** | | | |
| 6 | Support Chat Widget Component | HIGH | 1.5 | ⬜ TODO |
| 7 | Support Chat Edge Function | HIGH | 1 | ⬜ TODO |
| 8 | AI Voice Support (Premium) | MEDIUM | 1 | ⬜ TODO |
| 9 | Support Knowledge Base Pages | MEDIUM | 1 | ⬜ TODO |
| | **PHASE 3: Agent Tuning System (Days 8-10)** | | | |
| 10 | Agent Tuning Chat Interface | HIGH | 1.5 | ⬜ TODO |
| 11 | Agent Tuning Edge Function | HIGH | 1 | ⬜ TODO |
| 12 | Call Quality Feedback System | MEDIUM | 1 | ⬜ TODO |
| | **PHASE 4: Advanced Prompt Architecture (Days 11-14)** | | | |
| 13 | Vertical Templates System | MEDIUM | 1.5 | ⬜ TODO |
| 14 | Customer Voice Controls Enhancement | MEDIUM | 1 | ⬜ TODO |
| 15 | Core System Prompt Management | LOW | 0.5 | ⬜ TODO |
| | **PHASE 5: Polish Features (Days 15-21)** | | | |
| 16 | Customer Affiliate Tab | MEDIUM | 1 | ⬜ TODO |
| 17 | Welcome Email System | HIGH | 0.5 | ⬜ TODO |
| 18 | Phone Number Release Feature | MEDIUM | 0.5 | ⬜ TODO |
| 19 | Chat Widget Embed Code | MEDIUM | 1.5 | ⬜ TODO |
| 20 | Admin Dashboard Enhancements | LOW | 1 | ⬜ TODO |
| | **FINAL TESTING & DOCUMENTATION** | | | |
| 21 | End-to-End Testing Checklist | HIGH | 2 | ⬜ TODO |
| 22 | Documentation & Knowledge Base | MEDIUM | 2 | ⬜ TODO |

---

## Detailed Feature Specifications

### Feature #1: Lead Routing System ✅ COMPLETE

**Priority:** CRITICAL | **Est. Days:** 2

**DATABASE:**
- Extended customer_profiles table with: notification_emails[], notification_phones[], business_hours (jsonb), after_hours_behavior, lead_sources_enabled (jsonb), lead_capture_enabled, sms_notifications_enabled

**SETTINGS PAGE:**
- Created /customer/settings/leads route (LeadCaptureSettings.tsx)
- Section 1: Lead Capture toggles for Voice AI calls, Web Chat, Forms, Callback requests
- Section 2: Notification Preferences with primary email, additional emails, primary phone for SMS
- Section 3: Business Hours with time picker, timezone selector, after-hours behavior dropdown
- Auto-save on toggle changes

**EDGE FUNCTION:**
- Created create-lead-and-notify edge function
- Handles all lead sources, sends emails via Resend, respects business hours

**INTEGRATION:**
- vapi-call-ended calls create-lead-and-notify for captured leads
- customer-preview-chat calls create-lead-and-notify for web chat leads

---

### Feature #2: Income Disclaimers Component

**Priority:** CRITICAL | **Est. Days:** 1

**COMPONENT:**
- Create src/components/EarningsDisclaimer.tsx with variants: inline, card, modal
- Props: variant, showFullLink (boolean)
- Short version: '* Earnings not guaranteed. Results vary. See full disclaimer.'
- Full disclaimer in modal with standard FTC-compliant language
- Checkbox variant for signup: 'I understand that earnings are not guaranteed and actual results may vary'

**PLACEMENT:**
- Add to /partner and /affiliate-signup pages (inline variant near plan pricing)
- Add to /affiliate/commissions page (card variant at top)
- Add to final signup step as required checkbox
- Add to customer portal /customer/affiliate tab (inline variant)

**STYLING:**
- Use existing design system colors and typography
- Gray text for disclaimer, blue link for 'full disclaimer'
- Modal should match existing modal patterns

---

### Feature #3: Training Module Database Schema

**Priority:** HIGH | **Est. Days:** 0.5

**TABLES:**

1. training_modules
   - id (uuid, primary key)
   - title (text)
   - description (text)
   - video_url (text)
   - duration_minutes (integer)
   - module_type (text: 'affiliate', 'customer', 'hybrid')
   - category (text: e.g., 'getting_started', 'product', 'comp_plan')
   - order_index (integer)
   - is_required (boolean)
   - thumbnail_url (text, optional)
   - created_at, updated_at

2. training_progress
   - id (uuid, primary key)
   - user_id (uuid, references profiles)
   - module_id (uuid, references training_modules)
   - completed_at (timestamp, nullable)
   - watched_seconds (integer, default 0)
   - quiz_score (integer, nullable)
   - created_at, updated_at
   - UNIQUE constraint on (user_id, module_id)

**RLS POLICIES:**
- training_modules: Public read access
- training_progress: Users can only view/update their own progress

**SEED DATA:**
- Insert placeholder modules (7 for affiliates, 8 for customers, 3 for hybrid)
- Use placeholder video URLs
- Set realistic durations (5-15 minutes per module)

---

### Feature #4: Affiliate Training Center Page

**Priority:** HIGH | **Est. Days:** 1

**LAYOUT:**
- Use existing affiliate dashboard layout (AffiliateLayout component)
- Hero section: 'Affiliate Training Center' with progress indicator
- Grid of training module cards (3 columns on desktop)

**MODULE CARDS:**
- Thumbnail image
- Title and duration
- Progress indicator (Not Started / In Progress / Completed)
- 'Required' badge if is_required=true
- Click to open video modal

**VIDEO MODAL:**
- Full-screen modal with video player (use HTML5 video or embedded Vimeo)
- Track watch progress every 10 seconds, update training_progress.watched_seconds
- Mark complete when watched_seconds >= (duration_minutes * 60 * 0.9)
- Next/Previous module buttons

**DATA HOOKS:**
- Create useTrainingModules hook to fetch modules filtered by module_type='affiliate' OR 'hybrid'
- Create useTrainingProgress hook to fetch/update user progress

---

### Feature #5: Customer Training Center Page

**Priority:** HIGH | **Est. Days:** 1

Follow same pattern as affiliate training center but:
- Use CustomerLayout component
- Filter modules by module_type='customer' OR 'hybrid'
- Hero: 'Learn How to Get the Most From Your AI'
- Same card grid and video modal functionality
- Same progress tracking logic

**INTEGRATION:**
- Add 'Training' link to customer navigation menu
- Show incomplete required modules count in nav badge

---

### Feature #6: Support Chat Widget Component

**Priority:** HIGH | **Est. Days:** 1.5

**COMPONENT:**
- Create src/components/SupportChatWidget.tsx
- Fixed position bottom-right corner (like Intercom)
- Collapsed state: Circular button with chat icon and 'Support' label
- Expanded state: Chat panel (350px wide, 500px tall)
- Header shows 'EverLaunch Support' with minimize button
- Message list with user messages (right-aligned, blue) and AI responses (left-aligned, gray)
- Input field with send button
- Auto-scroll to bottom on new messages

**BEHAVIOR:**
- Detect user role (affiliate, customer, admin) from auth context
- Pass role to support-chat edge function for context-aware responses
- Show typing indicator while AI responds
- Store conversation in localStorage for session persistence
- Show 'Start new conversation' button to clear history

**INTEGRATION:**
- Add to AffiliateLayout component (renders on all affiliate pages)
- Add to CustomerLayout component (renders on all customer pages)
- Add to AdminLayout component

---

### Feature #7: Support Chat Edge Function

**Priority:** HIGH | **Est. Days:** 1

**FUNCTION NAME:** support-chat

**PARAMETERS:**
- messages: Array of {role: 'user'|'assistant', content: string}
- user_role: 'affiliate'|'customer'|'admin'
- user_id: uuid

**LOGIC:**
1. Build system prompt based on user_role:
   - Affiliate: Include comp plan info, product details, demo help
   - Customer: Include voice tuning, lead routing, settings help
   - Admin: Include system troubleshooting
2. Call Lovable AI Gateway (google/gemini-2.5-flash model)
3. Response should be helpful, friendly, and role-specific
4. If query requires account access, fetch relevant data
5. Return AI response as text

**DATABASE:**
- Optionally log conversations to support_tickets table

---

### Feature #8: AI Voice Support (Premium)

**Priority:** MEDIUM | **Est. Days:** 1

**UI:**
- Add 'Request Voice Callback' button to support widget (only shows if user has premium plan)
- Modal: 'Our AI will call you in the next 5 minutes. Confirm your phone number.'
- Pre-fill phone from profile, allow edit
- Submit creates callback request

**EDGE FUNCTION:** request-voice-support
- Parameters: user_id, phone_number, issue_description
- Create Vapi call using support assistant
- Save call transcript to support_tickets table

**PLAN GATING:**
- Check user's plan (affiliates: Pro/Agency, customers: Growth/Professional)
- Show upgrade prompt if not premium

---

### Feature #9: Support Knowledge Base Pages

**Priority:** MEDIUM | **Est. Days:** 1

**PAGES:**
- /affiliate/support - Main support hub for affiliates
- /customer/support - Main support hub for customers

**LAYOUT:**
- Search bar at top
- Category cards: Getting Started, Product Info, Billing, Technical
- Popular articles list
- 'Still need help?' section with chat and voice callback buttons

**DATABASE:**
- support_articles table: id, title, slug, content (text), category, role_type, created_at
- Seed with 10-15 common help articles

---

### Feature #10: Agent Tuning Chat Interface

**Priority:** HIGH | **Est. Days:** 1.5

**LOCATION:**
- Add 'Tune My Agent' button to /customer/settings/voice page
- Opens full-screen modal with chat interface

**MODAL LAYOUT:**
- Left side: Chat conversation with tuning AI
- Right side: Live preview of current settings
- Bottom: 'Preview Changes' button
- Close button with 'Save' or 'Discard' options

**CHAT FLOW:**
1. AI introduces: 'I'm here to help tune your AI agent. What would you like to improve?'
2. User describes issue
3. AI asks clarifying questions
4. AI suggests specific changes
5. Changes reflect in right-side preview panel
6. User can accept, reject, or request more adjustments
7. When satisfied, click 'Save Changes' to apply

---

### Feature #11: Agent Tuning Edge Function

**Priority:** HIGH | **Est. Days:** 1

**FUNCTION NAME:** agent-tuning-chat

**PARAMETERS:**
- customer_id: uuid
- messages: Array of conversation messages
- current_settings: Current voice_settings and chat_settings objects

**LOGIC:**
1. System prompt includes current settings and available adjustments
2. AI responds with conversational guidance
3. When suggesting changes, return structured data: {response, suggested_changes}
4. Frontend applies suggested_changes to preview panel

**DATABASE:**
- Save session to agent_tuning_sessions: customer_id, conversation (jsonb), applied_changes (jsonb)

---

### Feature #12: Call Quality Feedback System

**Priority:** MEDIUM | **Est. Days:** 1

**UI CHANGES:**
- On /customer/leads page, add action buttons to each call row:
  - Thumbs up / Thumbs down icons
  - 'Leave Feedback' button
- Feedback modal with 1-5 star rating, quick tags, free-form text

**DATABASE:**
- call_quality_feedback table

**AUTOMATED ACTIONS:**
- If 3+ 'too fast' tags → Auto-reduce voice speed by 0.1x
- If 3+ 'too slow' tags → Auto-increase voice speed by 0.1x
- If average rating < 3.0 → Send email offering AI tune-up

---

### Feature #13: Vertical Templates System

**Priority:** MEDIUM | **Est. Days:** 1.5

**DATABASE:**
- vertical_templates table with prompt_template, typical_goals, vocabulary_preferences, do_list, dont_list

**SEED DATA:**
- Create 5 initial verticals: dentist, restaurant, roofer, plumber, attorney

**CUSTOMER ONBOARDING:**
- Add vertical selection to Step 1 (Business Profile)

**PROMPT ASSEMBLY:**
- Merge: Core prompt + Vertical template + Customer overlay

---

### Feature #14: Customer Voice Controls Enhancement

**Priority:** MEDIUM | **Est. Days:** 1

**NEW CONTROLS:**
1. Tone slider: Very Formal | Professional | Friendly | Warm & Casual
2. Energy slider: Calm | Neutral | High Energy
3. Responsiveness dropdown
4. Safety behavior dropdown
5. Max silence threshold slider

---

### Feature #15: Core System Prompt Management

**Priority:** LOW | **Est. Days:** 0.5

**PAGE:** /admin/ai-settings

**CONTENT:**
- Text area for core system prompt (used by all customer AIs)
- Save button updates ai_core_prompts table
- Version history table
- Only super_admin can access

---

### Feature #16: Customer Affiliate Tab

**Priority:** MEDIUM | **Est. Days:** 1

**PAGE:** /customer/affiliate

**LAYOUT:**
- Hero: 'Earn By Referring Other Businesses'
- Referral link card with copy button
- Stats cards: Total Referrals, Active Customers, Total Earned
- Commission history table
- Include EarningsDisclaimer component

---

### Feature #17: Welcome Email System

**Priority:** HIGH | **Est. Days:** 0.5

**AFFILIATE WELCOME:**
- Triggered in affiliate-checkout-success edge function
- Content: Welcome message, dashboard link, first training module, referral link

**CUSTOMER WELCOME:**
- Triggered in stripe-webhook on checkout.session.completed
- Content: Thank you message, onboarding wizard link, support info

---

### Feature #18: Phone Number Release Feature

**Priority:** MEDIUM | **Est. Days:** 0.5

**UI:**
- Add 'Release Number' button on /customer/settings/deploy page
- Confirmation modal with warning

**EDGE FUNCTION:** release-phone-number
- Calls Vapi API DELETE endpoint
- Updates customer_phone_numbers.status = 'released'

---

### Feature #19: Chat Widget Embed Code

**Priority:** MEDIUM | **Est. Days:** 1.5

**WIDGET:**
- Standalone JavaScript file: widget.js
- Creates floating chat button bottom-right
- Connects to chat endpoint, passes customer_id

**EMBED CODE GENERATION:**
- On /customer/settings/deploy page, add 'Chat Widget' section
- Generate unique embed code
- Copy button for easy paste

---

### Feature #20: Admin Dashboard Enhancements

**Priority:** LOW | **Est. Days:** 1

**NEW SECTIONS:**
1. System Health Card (webhook status, Vapi connection, email status)
2. AI Usage Stats (total minutes, average voice speed, feedback tags)
3. Top Affiliates Card
4. Recent Activity Feed

---

### Feature #21: End-to-End Testing Checklist

**Priority:** HIGH | **Est. Days:** 2

Comprehensive testing of all new features for affiliates, customers, and admins.

---

### Feature #22: Documentation & Knowledge Base

**Priority:** MEDIUM | **Est. Days:** 2

Create comprehensive help articles for affiliates and customers. Seed support_articles table.

---

## Training Module Content

### Affiliate Training Modules (7 modules):
1. New Affiliate Fast Start (Day 1) - 10 min
2. Product Training: Voice AI & Chat AI - 15 min
3. Compensation Plan Overview - 12 min
4. How to Present EverLaunch - 8 min
5. Demo System Mastery - 10 min
6. Helping Businesses Get Results - 15 min
7. Advanced Recruiting Strategies - 12 min

### Customer Training Modules (8 modules):
1. Getting Started With Your AI - 8 min
2. Understanding AI Voice Behavior - 10 min
3. How To Tune Your Agent's Tone - 12 min
4. Adding Documents & Knowledge - 8 min
5. Improving Lead Flow - 10 min
6. Analyzing AI Call Results - 10 min
7. Calendar Integration Setup - 8 min
8. Installing Chat Widget & Phone Routing - 12 min

### Hybrid Training (Customer → Affiliate) (3 modules):
1. Earn With Your Affiliate Link - 5 min
2. Sharing EverLaunch With Other Businesses - 8 min
3. Understanding Your Commissions - 6 min

---

## Support Tiers Architecture

### Standard Tier (All Users):
- AI Chat Support (web-based)
- Help articles and documentation
- Community forum access
- Email support (48-hour response)

### Premium Tier (Pro/Agency Affiliates, Growth/Professional Customers):
- Priority AI Chat Support
- AI Voice Support (callback within 5 min)
- Phone support (limited hours, human fallback)
- Email support (4-hour response)
- Agent tuning assistance

---

## Cost Considerations

- AI Chat: ~$0.002-$0.02 per conversation (cheap, offer freely)
- AI Voice: ~$0.03-$0.10 per minute (more expensive, premium tier only)
- Human Phone: Reserve for premium plans, specific hours

---

## Implementation Strategy Best Practices

1. **One Feature at a Time** - Don't implement 5 features at once. Break it down.
2. **Extend, Don't Redesign** - Always specify: 'Do not redesign existing pages.'
3. **Reference Existing Patterns** - Point to similar features for consistency.
4. **Specify Database Changes** - Include table names and key fields.
5. **Test After Each Feature** - Test incrementally before stacking changes.
