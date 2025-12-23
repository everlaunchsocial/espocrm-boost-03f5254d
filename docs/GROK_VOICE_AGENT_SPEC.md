# Grok Voice Agent Integration Specification
## For Replit Python/LiveKit Service

**Version:** 1.0  
**Date:** December 2024  
**Purpose:** Build a standalone Grok Voice Agent service that integrates with EverLaunch's Lovable CRM

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Current Lovable Voice Stack](#current-lovable-voice-stack)
4. [Database Schema](#database-schema)
5. [Webhook Endpoints](#webhook-endpoints)
6. [Tool Definitions](#tool-definitions)
7. [Prompt Building Logic](#prompt-building-logic)
8. [Voice Mapping](#voice-mapping)
9. [API Endpoints to Implement](#api-endpoints-to-implement)
10. [Environment Variables](#environment-variables)

---

## Executive Summary

This specification describes a **Python/LiveKit microservice** that provides Grok Voice Agent as an alternative voice provider for EverLaunch's CRM. This service:

- **Bypasses Vapi entirely** - Direct Grok speech-to-speech via LiveKit
- Provisions Twilio phone numbers with area code selection
- Manages real-time voice sessions via WebSocket
- Sends call transcripts, recordings, and leads back to Lovable's Supabase database
- Supports the same tool functions (send_email, schedule_callback, get_business_info)

**Cost Advantage:** Grok Voice Agent = $0.05/min all-inclusive vs Current Stack = ~$0.10/min

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    REPLIT PYTHON SERVICE                        │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │   Twilio    │  │   LiveKit    │  │    REST API           │  │
│  │  Numbers    │◄─┤   + Grok     │  │  (for Lovable CRM)    │  │
│  │  Provision  │  │   Plugin     │  │                       │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
│         │               │                      │               │
│         │   WebSocket   │         POST webhooks│               │
│         ▼               ▼                      ▼               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS/WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                LOVABLE CRM (Supabase Backend)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ vapi_calls   │  │ voice_settings│ │ customer_profiles     │ │
│  │ (store calls)│  │ (AI config)  │  │ (business info)       │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │call_analysis │  │vertical_     │  │customer_knowledge_    │ │
│  │(AI scoring)  │  │templates     │  │sources                │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Current Lovable Voice Stack

### Components (What Grok Replaces)
| Component | Current Provider | Grok Equivalent |
|-----------|-----------------|-----------------|
| **LLM** | DeepSeek (via Vapi) | Grok (built-in) |
| **STT** | Deepgram Nova-2 | Grok (built-in) |
| **TTS** | Cartesia | Grok (built-in) |
| **Orchestration** | Vapi | LiveKit + Grok Plugin |
| **Phone Numbers** | Vapi-managed Twilio | Direct Twilio |

### Current Cost Breakdown
- DeepSeek LLM: ~$0.02/min
- Deepgram STT: ~$0.01/min  
- Cartesia TTS: ~$0.03/min
- Vapi Platform: ~$0.04/min
- **Total: ~$0.10/min**

### Grok Voice Agent
- All-inclusive: **$0.05/min**
- 50% cost reduction

---

## Database Schema

### Primary Tables to POST Data To

#### 1. `vapi_calls` (Main Call Storage)

```sql
CREATE TABLE vapi_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_call_id TEXT,              -- Use: grok_call_{session_id}
  customer_id UUID,               -- From session metadata
  affiliate_id UUID,              -- From session metadata  
  demo_id UUID,                   -- From session metadata
  call_type TEXT DEFAULT 'customer', -- 'customer' | 'demo' | 'preview'
  caller_phone TEXT,              -- Caller's phone number
  transcript TEXT,                -- Full conversation transcript
  summary TEXT,                   -- AI-generated summary
  duration_seconds INTEGER DEFAULT 0,
  ended_reason TEXT,              -- 'completed' | 'hangup' | 'error'
  assistant_id TEXT,              -- Use: grok_assistant_{customer_id}
  recording_url TEXT,             -- URL to call recording
  cost_total NUMERIC DEFAULT 0,   -- Total cost in USD
  cost_llm NUMERIC DEFAULT 0,     -- LLM portion
  cost_stt NUMERIC DEFAULT 0,     -- STT portion
  cost_tts NUMERIC DEFAULT 0,     -- TTS portion
  cost_transport NUMERIC DEFAULT 0,
  cost_platform NUMERIC DEFAULT 0,
  call_metadata JSONB DEFAULT '{}',
  via_testing_line BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Payload Example for POST:**
```json
{
  "vapi_call_id": "grok_call_abc123",
  "customer_id": "uuid-of-customer",
  "affiliate_id": null,
  "demo_id": null,
  "call_type": "customer",
  "caller_phone": "+15551234567",
  "transcript": "AI: Hello, thank you for calling...\nCaller: Hi, I need...",
  "summary": "Customer called to inquire about pricing for roofing services.",
  "duration_seconds": 180,
  "ended_reason": "completed",
  "assistant_id": "grok_assistant_customer123",
  "recording_url": "https://storage.example.com/recordings/abc123.mp3",
  "cost_total": 0.15,
  "cost_llm": 0.05,
  "cost_stt": 0.05,
  "cost_tts": 0.05,
  "call_metadata": {
    "provider": "grok",
    "session_id": "abc123",
    "latency_avg_ms": 450
  },
  "via_testing_line": false
}
```

#### 2. `call_analysis` (AI Quality Scoring)

```sql
CREATE TABLE call_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES vapi_calls(id),
  customer_id UUID,
  transcript_summary TEXT,
  sentiment TEXT,                 -- 'positive' | 'neutral' | 'negative'
  overall_score NUMERIC,          -- 0-100
  score_clarity NUMERIC,
  score_tone NUMERIC,
  score_accuracy NUMERIC,
  score_completeness NUMERIC,
  score_speed NUMERIC,
  score_objection_handling NUMERIC,
  score_booking_success NUMERIC,
  call_category TEXT,             -- 'inquiry' | 'booking' | 'complaint' | 'followup'
  issue_tags TEXT[],
  suggestions JSONB,
  insights JSONB,
  analyzed_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. `service_usage` (Cost Tracking)

```sql
CREATE TABLE service_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,         -- 'grok' for this integration
  model TEXT,                     -- 'grok-voice-agent'
  usage_type TEXT NOT NULL,       -- 'phone_call'
  call_type TEXT,                 -- 'customer' | 'demo' | 'preview'
  customer_id UUID,
  affiliate_id UUID,
  demo_id UUID,
  duration_seconds INTEGER DEFAULT 0,
  cost_usd NUMERIC DEFAULT 0,
  cost_breakdown JSONB DEFAULT '{}',
  session_id TEXT,
  reference_id TEXT,              -- Links to vapi_calls.id
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tables to READ From

#### 4. `customer_profiles` (Business Info)

```sql
-- Key columns to fetch:
SELECT 
  id,
  user_id,
  business_name,
  website_url,
  contact_name,
  phone,
  business_type,           -- Links to vertical_templates
  lead_email,
  lead_sms_number,
  customer_timezone,
  business_hours           -- JSONB with day/time schedule
FROM customer_profiles
WHERE id = '{customer_id}';
```

#### 5. `voice_settings` (AI Personality)

```sql
SELECT 
  customer_id,
  ai_name,                  -- e.g., "Ashley", "Alex"
  voice_id,                 -- Cartesia voice ID (map to Grok equivalent)
  voice_gender,             -- 'male' | 'female'
  voice_speed,              -- 0.5 to 2.0 (default 1.0)
  voice_style,              -- 'professional' | 'friendly' | 'casual'
  greeting_text,            -- Custom greeting
  instructions              -- Additional behavior instructions
FROM voice_settings
WHERE customer_id = '{customer_id}';
```

#### 6. `vertical_templates` (Industry Prompts)

```sql
SELECT 
  vertical_key,             -- e.g., 'hvac', 'plumbing', 'dental'
  name,
  prompt_template,          -- Base system prompt with {business_name} placeholder
  typical_goals,            -- JSONB array of goals
  vocabulary_preferences,   -- JSONB: { use: [...], avoid: [...] }
  do_list,                  -- JSONB array of behaviors to follow
  dont_list                 -- JSONB array of behaviors to avoid
FROM vertical_templates
WHERE vertical_key = '{business_type}'
  AND is_active = true;
```

#### 7. `customer_knowledge_sources` (Knowledge Base)

```sql
SELECT 
  file_name,
  content_text              -- Extracted text from uploaded documents
FROM customer_knowledge_sources
WHERE customer_id = '{customer_id}'
  AND status = 'processed'
  AND content_text IS NOT NULL;
```

#### 8. `customer_phone_numbers` (Phone Mapping)

```sql
-- For looking up customer by phone number:
SELECT customer_id, phone_number, vapi_assistant_id
FROM customer_phone_numbers
WHERE phone_number = '{incoming_phone}'
  AND status = 'active';
```

---

## Webhook Endpoints

The Replit service must POST to these Lovable Supabase Edge Functions after each call:

### 1. `POST /functions/v1/grok-call-ended`

**When to call:** After every Grok voice session ends

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Payload:**
```json
{
  "message": {
    "call": {
      "id": "grok_session_abc123",
      "customer": {
        "number": "+15551234567"
      },
      "durationSeconds": 180,
      "startedAt": "2024-12-23T10:00:00Z",
      "endedAt": "2024-12-23T10:03:00Z",
      "assistantId": "grok_assistant_customer123",
      "recordingUrl": "https://storage.example.com/recordings/abc123.mp3",
      "metadata": {
        "customer_id": "uuid-of-customer",
        "affiliate_id": null,
        "demo_id": null,
        "call_type": "customer",
        "via_testing_line": false
      },
      "cost": 0.15,
      "costBreakdown": {
        "llm": 0.05,
        "stt": 0.05,
        "tts": 0.05,
        "transport": 0,
        "platform": 0
      }
    },
    "transcript": "AI: Hello, thank you for calling ABC Plumbing...\nCaller: Hi, I have a leaky faucet...",
    "summary": "Customer inquired about fixing a leaky faucet. Scheduled callback for tomorrow.",
    "endedReason": "completed"
  }
}
```

**Important:** The payload format matches Vapi's webhook format so we can reuse the existing `vapi-call-ended` Edge Function with minimal modifications.

### 2. `POST /functions/v1/voice-tool-handler`

**When to call:** When Grok needs to execute a tool during the call

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Payload:**
```json
{
  "tool_name": "send_email",
  "arguments": {
    "recipient_email": "customer@example.com",
    "subject": "Your Quote from ABC Plumbing",
    "content": "Thank you for your interest...",
    "caller_name": "John"
  },
  "businessInfo": {
    "businessName": "ABC Plumbing",
    "phones": ["+15559876543"],
    "emails": ["info@abcplumbing.com"],
    "address": "123 Main St, Boston, MA",
    "services": ["Emergency repairs", "Water heater installation"],
    "hours": "Mon-Fri 8am-6pm"
  }
}
```

### 3. `POST /functions/v1/analyze-call-quality`

**When to call:** After saving the call record (non-blocking, async)

**Payload:**
```json
{
  "call_id": "uuid-of-saved-call-record"
}
```

This triggers AI analysis of the call transcript and populates the `call_analysis` table.

### 4. `POST /functions/v1/create-lead-and-notify`

**When to call:** After a customer call (not demo/preview) completes

**Payload:**
```json
{
  "customer_id": "uuid-of-customer",
  "lead_data": {
    "first_name": "Caller",
    "last_name": "+15551234567",
    "phone": "+15551234567",
    "source": "voice",
    "message": "AI-generated call summary here"
  }
}
```

---

## Tool Definitions

Grok must support these three tools during voice conversations:

### 1. `send_email`

**Purpose:** Send follow-up emails during the call

```json
{
  "name": "send_email",
  "description": "Send an email to the caller with requested information",
  "parameters": {
    "type": "object",
    "properties": {
      "recipient_email": {
        "type": "string",
        "description": "The caller's email address"
      },
      "subject": {
        "type": "string",
        "description": "Email subject line"
      },
      "content": {
        "type": "string",
        "description": "Email body content"
      },
      "caller_name": {
        "type": "string",
        "description": "The caller's name if known"
      }
    },
    "required": ["recipient_email", "content"]
  }
}
```

### 2. `schedule_callback`

**Purpose:** Request a callback from a human

```json
{
  "name": "schedule_callback",
  "description": "Schedule a callback request for the business owner",
  "parameters": {
    "type": "object",
    "properties": {
      "caller_name": {
        "type": "string",
        "description": "The caller's name"
      },
      "phone_number": {
        "type": "string",
        "description": "Phone number to call back"
      },
      "preferred_time": {
        "type": "string",
        "description": "When they prefer to be called back"
      },
      "reason": {
        "type": "string",
        "description": "Reason for the callback"
      }
    },
    "required": ["phone_number"]
  }
}
```

### 3. `get_business_info`

**Purpose:** Retrieve business information during the call

```json
{
  "name": "get_business_info",
  "description": "Get specific business information to answer caller questions",
  "parameters": {
    "type": "object",
    "properties": {
      "info_type": {
        "type": "string",
        "enum": ["hours", "address", "services", "contact", "all"],
        "description": "Type of information to retrieve"
      }
    },
    "required": ["info_type"]
  }
}
```

---

## Prompt Building Logic

When starting a Grok session, build the system prompt using this logic:

```python
def build_system_prompt(
    business_name: str,
    website_url: str | None,
    vertical_template: dict | None,
    voice_instructions: str | None,
    ai_name: str,
    knowledge_content: str | None
) -> str:
    prompt = ""
    
    # 1. Start with vertical template if available
    if vertical_template:
        prompt = vertical_template["prompt_template"].replace(
            "{business_name}", business_name
        )
        
        # Add vocabulary preferences
        vocab = vertical_template.get("vocabulary_preferences", {})
        if vocab.get("use"):
            prompt += f"\n\nPreferred terminology: {', '.join(vocab['use'])}."
        if vocab.get("avoid"):
            prompt += f" Avoid using: {', '.join(vocab['avoid'])}."
        
        # Add do/don't lists
        do_list = vertical_template.get("do_list", [])
        if do_list:
            prompt += "\n\nGuidelines - Always do:\n"
            prompt += "\n".join(f"• {item}" for item in do_list)
        
        dont_list = vertical_template.get("dont_list", [])
        if dont_list:
            prompt += "\n\nGuidelines - Never do:\n"
            prompt += "\n".join(f"• {item}" for item in dont_list)
        
        # Add goals
        goals = vertical_template.get("typical_goals", [])
        if goals:
            prompt += f"\n\nYour primary goals are to: {', '.join(goals)}."
    else:
        # Fallback generic prompt
        prompt = f"""You are {ai_name}, a friendly and professional AI phone assistant for {business_name}. 
Your job is to answer calls, help customers with their questions, and provide excellent service.
Always be helpful, courteous, and concise. If you don't know something, offer to take a message or transfer to a human."""
    
    # 2. Add AI name context
    prompt = f"You are {ai_name}, the AI receptionist. " + prompt
    
    # 3. Add website context
    if website_url:
        prompt += f"\n\nThe business website is {website_url}."
    
    # 4. Add knowledge base content (max 8000 chars)
    if knowledge_content:
        truncated = knowledge_content[:8000] + "..." if len(knowledge_content) > 8000 else knowledge_content
        prompt += f"\n\n=== KNOWLEDGE BASE ===\nUse the following information to answer customer questions:\n{truncated}"
    
    # 5. Add custom instructions overlay
    if voice_instructions:
        prompt += f"\n\nAdditional instructions: {voice_instructions}"
    
    return prompt
```

---

## Voice Mapping

Map Lovable's Cartesia voices to Grok equivalents:

| Cartesia Voice ID | Name | Gender | Suggested Grok Equivalent |
|-------------------|------|--------|--------------------------|
| `a0e99841-438c-4a64-b679-ae501e7d6091` | Jacqueline | Female | Professional female |
| `9626c31c-bec5-4cca-baa8-f8ba9e84c8bc` | Sarah | Female | Friendly female |
| `d46abd1d-2d02-43e8-819f-51fb652c1c61` | David | Male | Professional male |
| `b7d50908-b17c-442d-ad8d-810c63997ed9` | Marcus | Male | Friendly male |

**Voice Speed:** Cartesia uses `voice_speed` (0.5-2.0, default 1.0). Apply same multiplier to Grok.

---

## API Endpoints to Implement

The Replit service must expose these REST endpoints for Lovable to call:

### 1. `POST /api/provision-number`

**Purpose:** Provision a new Twilio phone number for a customer

**Request:**
```json
{
  "customer_id": "uuid-of-customer",
  "area_code": "617"
}
```

**Response:**
```json
{
  "success": true,
  "phone_number": "+16175551234",
  "phone_id": "twilio_phone_id",
  "grok_assistant_id": "grok_assistant_customer123"
}
```

**Behavior:**
1. Fetch customer profile and voice settings from Lovable
2. Build system prompt using vertical template + knowledge base
3. Configure Grok agent with prompt and voice settings
4. Purchase Twilio phone number with requested area code
5. Link Twilio number to Grok agent for incoming calls
6. Return phone number to Lovable for storage

### 2. `POST /api/start-session`

**Purpose:** Start a web-based Grok voice session (for demos)

**Request:**
```json
{
  "customer_id": "uuid-of-customer",
  "demo_id": "uuid-of-demo",
  "affiliate_id": "uuid-of-affiliate",
  "business_info": {
    "businessName": "Demo Business",
    "services": ["Service 1", "Service 2"],
    "website": "https://example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "grok_session_abc123",
  "websocket_url": "wss://replit-service.com/ws/grok/abc123"
}
```

### 3. `POST /api/sync-knowledge`

**Purpose:** Sync knowledge base content for a customer

**Request:**
```json
{
  "customer_id": "uuid-of-customer"
}
```

**Response:**
```json
{
  "success": true,
  "sources_synced": 3,
  "total_chars": 15000
}
```

### 4. `GET /api/health`

**Purpose:** Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "grok_api": "connected",
  "twilio": "connected",
  "lovable_db": "connected",
  "active_sessions": 5
}
```

### 5. `POST /api/update-assistant`

**Purpose:** Update Grok agent when customer changes voice settings

**Request:**
```json
{
  "customer_id": "uuid-of-customer"
}
```

**Response:**
```json
{
  "success": true,
  "grok_assistant_id": "grok_assistant_customer123"
}
```

---

## Environment Variables

The Replit service needs these environment variables:

```env
# X.ai / Grok
XAI_API_KEY=your_xai_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Lovable CRM Supabase Connection
LOVABLE_SUPABASE_URL=https://mrcfpbkoulldnkqzzprb.supabase.co
LOVABLE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
LOVABLE_SUPABASE_SERVICE_KEY=your_service_role_key

# LiveKit (for WebRTC)
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_URL=wss://your-livekit-server.com

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn
```

---

## Implementation Notes

### Audio Format Handling

Twilio sends audio in **mulaw 8kHz** format. Grok expects **PCM16 24kHz**. 

The Replit service must:
1. Receive mulaw 8kHz from Twilio
2. Transcode to PCM16 24kHz for Grok
3. Receive PCM16 24kHz from Grok
4. Transcode to mulaw 8kHz for Twilio

LiveKit handles this automatically when using the xAI plugin.

### Session Lifecycle

```
1. Incoming call → Twilio webhook → Replit service
2. Replit looks up customer_id from phone number
3. Replit fetches voice settings + prompt from Lovable
4. Replit creates Grok LiveKit session
5. Bidirectional audio streaming (Twilio ↔ LiveKit ↔ Grok)
6. Call ends → Replit captures transcript
7. Replit POSTs call data to Lovable webhooks
8. Lovable stores in vapi_calls, triggers analysis
```

### Error Handling

- If Grok API is unavailable, return error response to Lovable
- If Twilio provisioning fails, rollback any created resources
- Log all errors to monitoring service
- Retry webhook POSTs up to 3 times with exponential backoff

---

## Testing Checklist

Before going live:

- [ ] Provision test phone number with area code selection
- [ ] Make inbound call and verify transcript capture
- [ ] Verify webhook POST to `/grok-call-ended` works
- [ ] Verify tool execution (send_email, schedule_callback)
- [ ] Verify cost tracking in `service_usage` table
- [ ] Verify lead creation via `/create-lead-and-notify`
- [ ] Test with multiple vertical templates
- [ ] Test knowledge base injection into prompts
- [ ] Verify voice speed/style settings apply
- [ ] Load test with 10 concurrent calls

---

## Questions for EverLaunch Team

1. Should we create a new Edge Function `grok-call-ended` or modify the existing `vapi-call-ended` to handle both providers?
2. Do you want recording files stored in Lovable's Supabase Storage bucket, or is a URL to external storage acceptable?
3. What's the expected call volume for initial rollout? (Affects infrastructure sizing)
4. Should we add a `voice_provider` column to `customer_phone_numbers` table?

---

## Contact

For questions about this specification, contact the EverLaunch engineering team.
