import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to fetch prompt from prompt_templates
async function fetchPromptFromLibrary(supabase: any, category: string, useCase: string): Promise<string | null> {
  try {
    let { data } = await supabase
      .from('prompt_templates')
      .select('prompt_content')
      .eq('category', category)
      .eq('use_case', useCase)
      .eq('is_active', true)
      .in('channel', ['support', 'universal'])
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (data?.prompt_content) {
      console.log(`Found support prompt for category: ${category}`);
      return data.prompt_content;
    }

    // Fallback to universal
    const { data: universalData } = await supabase
      .from('prompt_templates')
      .select('prompt_content')
      .eq('category', 'universal')
      .eq('use_case', useCase)
      .eq('is_active', true)
      .in('channel', ['support', 'universal'])
      .order('version', { ascending: false })
      .limit(1)
      .single();

    return universalData?.prompt_content || null;
  } catch (error) {
    console.error('Error fetching prompt from library:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, user_role } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to fetch role-specific prompt from library
    const roleCategory = user_role === 'affiliate' ? 'support-affiliate' 
                       : user_role === 'customer' ? 'support-customer'
                       : user_role === 'admin' ? 'support-admin'
                       : 'support';
    
    let systemPrompt = await fetchPromptFromLibrary(supabase, roleCategory, 'system_prompt');

    // Fallback to hardcoded prompts if not found in library
    if (!systemPrompt) {
      systemPrompt = `You are a friendly and knowledgeable EverLaunch support assistant. Be helpful, concise, and professional.`;
      
      if (user_role === 'affiliate') {
        systemPrompt += `

You are helping an EverLaunch affiliate. You can assist with:
- Commission structure (30% Tier 1, 15% Tier 2, 5% Tier 3)
- Demo creation and sending
- Lead management and CRM features
- Training modules and resources
- Plan upgrades (Free, Basic $29/mo, Pro $99/mo, Agency $299/mo)
- Referral links and tracking
- Payout schedules and status

Be encouraging about their business growth and offer actionable advice.`;
      } else if (user_role === 'customer') {
        systemPrompt += `

You are helping an EverLaunch customer using the AI receptionist product. You can assist with:
- Voice AI settings (voice selection, speed, greeting)
- Lead capture and routing configuration
- Business hours and after-hours settings
- Phone number setup and testing
- Chat widget installation
- Knowledge base configuration
- Billing and usage questions (plans: Starter $149/mo, Growth $249/mo, Professional $399/mo)

Guide them step-by-step and suggest relevant settings pages when appropriate.`;
      } else if (user_role === 'admin') {
        systemPrompt += `

You are helping an EverLaunch admin. You can assist with:
- System troubleshooting
- Affiliate and customer management
- Commission and payout processing
- Platform configuration
- Analytics and reporting`;
      }

      systemPrompt += `

If you don't know the answer, say so honestly and suggest they contact support@everlaunch.ai for further assistance.
Keep responses concise but helpful. Use bullet points for lists.`;
    }

    console.log('Support chat request:', { user_role, messageCount: messages?.length, usingLibraryPrompt: !!systemPrompt });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Support chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});