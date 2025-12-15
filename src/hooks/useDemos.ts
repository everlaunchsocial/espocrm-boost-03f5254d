import { supabase } from "@/integrations/supabase/client";

// Demo status union type
export type DemoStatus = 'draft' | 'sent' | 'viewed' | 'engaged';

// Voice provider union type
export type VoiceProvider = 'openai' | 'elevenlabs';

// Demo model matching the public.demos table
export interface Demo {
  id: string;
  rep_id: string | null;
  affiliate_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  business_name: string;
  website_url: string | null;
  screenshot_url: string | null;
  ai_prompt: string | null;
  ai_persona_name: string | null;
  avatar_url: string | null;
  chat_primary_color: string | null;
  chat_title: string | null;
  voice_provider: VoiceProvider;
  elevenlabs_agent_id: string | null;
  vapi_assistant_id: string | null;
  passcode: string | null;
  status: DemoStatus;
  email_sent_at: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  chat_interaction_count: number;
  voice_interaction_count: number;
  created_at: string;
  updated_at: string;
  // Joined lead data (optional)
  leads?: {
    first_name: string;
    last_name: string;
  } | null;
}

// Input type for creating a new demo
export interface CreateDemoInput {
  rep_id?: string | null;
  affiliate_id?: string | null;
  lead_id?: string | null;
  contact_id?: string | null;
  business_name: string;
  website_url?: string | null;
  screenshot_url?: string | null;
  ai_prompt?: string | null;
  ai_persona_name?: string | null;
  avatar_url?: string | null;
  chat_primary_color?: string | null;
  chat_title?: string | null;
  voice_provider?: VoiceProvider;
  elevenlabs_agent_id?: string | null;
  vapi_assistant_id?: string | null;
  status?: DemoStatus;
}

// Result type for operations
export interface DemoResult<T> {
  data: T | null;
  error: string | null;
}

export const useDemos = () => {
  /**
   * Extract last 4 digits from a phone number
   */
  const extractPasscodeFromPhone = (phone: string): string | null => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 4) {
      return digits.slice(-4);
    }
    return null;
  };

  /**
   * Generate a unique 4-digit passcode for phone demos
   * Prefers last 4 digits of phone number, falls back to random
   */
  const generateUniquePasscode = async (phone?: string): Promise<string> => {
    // First try using last 4 digits of phone
    if (phone) {
      const phonePasscode = extractPasscodeFromPhone(phone);
      if (phonePasscode) {
        // Check if it's unique
        const { data: existing } = await supabase
          .from('demos')
          .select('id')
          .eq('passcode', phonePasscode)
          .maybeSingle();
        
        if (!existing) {
          console.log('Using phone-based passcode:', phonePasscode);
          return phonePasscode;
        }
        console.log('Phone passcode already exists, falling back to random');
      }
    }

    // Fallback to random generation
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const passcode = String(Math.floor(Math.random() * 9000) + 1000);
      const { data: existing } = await supabase
        .from('demos')
        .select('id')
        .eq('passcode', passcode)
        .maybeSingle();
      
      if (!existing) {
        return passcode;
      }
    }
    return String(Date.now()).slice(-4);
  };

  /**
   * Create a new demo row
   */
  const createDemo = async (input: CreateDemoInput): Promise<DemoResult<Demo>> => {
    try {
      // Validate that at least one of lead_id or contact_id is provided
      if (!input.lead_id && !input.contact_id) {
        return {
          data: null,
          error: "Demo must be tied to either a lead or a contact"
        };
      }

      // If we have a lead_id, fetch the lead's phone for passcode generation
      let leadPhone: string | undefined;
      if (input.lead_id) {
        const { data: leadData } = await supabase
          .from('leads')
          .select('phone')
          .eq('id', input.lead_id)
          .single();
        leadPhone = leadData?.phone || undefined;
      }

      // Generate unique passcode - prefer last 4 digits of phone
      let passcode: string;
      try {
        passcode = await generateUniquePasscode(leadPhone);
        console.log('Generated passcode for new demo:', passcode);
      } catch (passcodeError) {
        console.error('Error generating passcode, using fallback:', passcodeError);
        passcode = String(Date.now()).slice(-4);
      }

      // Ensure passcode is valid
      if (!passcode || passcode.length !== 4) {
        console.warn('Invalid passcode generated, using fallback:', passcode);
        passcode = String(Date.now()).slice(-4);
      }

      const { data, error } = await supabase
        .from('demos')
        .insert({
          rep_id: input.rep_id ?? null,
          affiliate_id: input.affiliate_id ?? null,
          lead_id: input.lead_id ?? null,
          contact_id: input.contact_id ?? null,
          business_name: input.business_name,
          website_url: input.website_url ?? null,
          screenshot_url: input.screenshot_url ?? null,
          ai_prompt: input.ai_prompt ?? null,
          ai_persona_name: input.ai_persona_name ?? 'AI Assistant',
          avatar_url: input.avatar_url ?? null,
          chat_primary_color: input.chat_primary_color ?? '#6366f1',
          chat_title: input.chat_title ?? 'Chat with us',
          voice_provider: input.voice_provider ?? 'openai',
          elevenlabs_agent_id: input.elevenlabs_agent_id ?? null,
          vapi_assistant_id: input.vapi_assistant_id ?? null,
          passcode: passcode,
          status: input.status ?? 'draft'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating demo:', error);
        return { data: null, error: `Failed to create demo: ${error.message}` };
      }

      // Update lead pipeline_status to 'demo_created' if applicable
      if (input.lead_id) {
        const { data: leadData } = await supabase
          .from('leads')
          .select('pipeline_status')
          .eq('id', input.lead_id)
          .single();

        if (leadData) {
          const currentStatus = leadData.pipeline_status;
          // Only advance if currently in early stages
          if (['new_lead', 'contact_attempted'].includes(currentStatus)) {
            await supabase
              .from('leads')
              .update({ pipeline_status: 'demo_created' })
              .eq('id', input.lead_id);
            console.log('Updated lead pipeline_status to demo_created');
          }
        }
      }

      return { data: data as Demo, error: null };
    } catch (err) {
      console.error('Unexpected error creating demo:', err);
      return { data: null, error: 'An unexpected error occurred while creating the demo' };
    }
  };

  /**
   * Fetch a single demo by ID
   */
  const getDemoById = async (demoId: string): Promise<DemoResult<Demo>> => {
    try {
      const { data, error } = await supabase
        .from('demos')
        .select('*, leads(first_name, last_name)')
        .eq('id', demoId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching demo:', error);
        return { data: null, error: `Failed to fetch demo: ${error.message}` };
      }

      if (!data) {
        return { data: null, error: 'Demo not found' };
      }

      return { data: data as Demo, error: null };
    } catch (err) {
      console.error('Unexpected error fetching demo:', err);
      return { data: null, error: 'An unexpected error occurred while fetching the demo' };
    }
  };

  /**
   * List demos tied to a specific lead
   */
  const getDemosForLead = async (leadId: string): Promise<DemoResult<Demo[]>> => {
    try {
      const { data, error } = await supabase
        .from('demos')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching demos for lead:', error);
        return { data: null, error: `Failed to fetch demos: ${error.message}` };
      }

      return { data: (data as Demo[]) ?? [], error: null };
    } catch (err) {
      console.error('Unexpected error fetching demos for lead:', err);
      return { data: null, error: 'An unexpected error occurred while fetching demos' };
    }
  };

  /**
   * List demos tied to a specific contact
   */
  const getDemosForContact = async (contactId: string): Promise<DemoResult<Demo[]>> => {
    try {
      const { data, error } = await supabase
        .from('demos')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching demos for contact:', error);
        return { data: null, error: `Failed to fetch demos: ${error.message}` };
      }

      return { data: (data as Demo[]) ?? [], error: null };
    } catch (err) {
      console.error('Unexpected error fetching demos for contact:', err);
      return { data: null, error: 'An unexpected error occurred while fetching demos' };
    }
  };

  /**
   * List demos for a given rep (for future multi-rep use)
   */
  const getDemosForRep = async (repId: string): Promise<DemoResult<Demo[]>> => {
    try {
      const { data, error } = await supabase
        .from('demos')
        .select('*')
        .eq('rep_id', repId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching demos for rep:', error);
        return { data: null, error: `Failed to fetch demos: ${error.message}` };
      }

      return { data: (data as Demo[]) ?? [], error: null };
    } catch (err) {
      console.error('Unexpected error fetching demos for rep:', err);
      return { data: null, error: 'An unexpected error occurred while fetching demos' };
    }
  };

  /**
   * Update the status field only
   */
  const updateDemoStatus = async (demoId: string, status: DemoStatus): Promise<DemoResult<Demo>> => {
    try {
      const { data, error } = await supabase
        .from('demos')
        .update({ status })
        .eq('id', demoId)
        .select()
        .single();

      if (error) {
        console.error('Error updating demo status:', error);
        return { data: null, error: `Failed to update demo status: ${error.message}` };
      }

      return { data: data as Demo, error: null };
    } catch (err) {
      console.error('Unexpected error updating demo status:', err);
      return { data: null, error: 'An unexpected error occurred while updating demo status' };
    }
  };

  /**
   * Increment view_count and update first_viewed_at / last_viewed_at
   */
  const incrementViewCount = async (demoId: string): Promise<DemoResult<Demo>> => {
    try {
      // First, get the current demo to check first_viewed_at
      const { data: currentDemo, error: fetchError } = await supabase
        .from('demos')
        .select('first_viewed_at, view_count')
        .eq('id', demoId)
        .single();

      if (fetchError) {
        console.error('Error fetching demo for view increment:', fetchError);
        return { data: null, error: `Failed to fetch demo: ${fetchError.message}` };
      }

      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = {
        view_count: (currentDemo.view_count ?? 0) + 1,
        last_viewed_at: now
      };

      // Set first_viewed_at only if it hasn't been set yet
      if (!currentDemo.first_viewed_at) {
        updateData.first_viewed_at = now;
      }

      // Update status to 'viewed' if currently 'sent'
      const { data: demoData } = await supabase
        .from('demos')
        .select('status')
        .eq('id', demoId)
        .single();

      if (demoData?.status === 'sent') {
        updateData.status = 'viewed';
      }

      const { data, error } = await supabase
        .from('demos')
        .update(updateData)
        .eq('id', demoId)
        .select()
        .single();

      if (error) {
        console.error('Error incrementing view count:', error);
        return { data: null, error: `Failed to increment view count: ${error.message}` };
      }

      return { data: data as Demo, error: null };
    } catch (err) {
      console.error('Unexpected error incrementing view count:', err);
      return { data: null, error: 'An unexpected error occurred while incrementing view count' };
    }
  };

  /**
   * Increment chat_interaction_count and update status to 'engaged' if not already
   */
  const incrementChatInteraction = async (demoId: string): Promise<DemoResult<Demo>> => {
    try {
      const { data: currentDemo, error: fetchError } = await supabase
        .from('demos')
        .select('chat_interaction_count, status')
        .eq('id', demoId)
        .single();

      if (fetchError) {
        console.error('Error fetching demo for chat increment:', fetchError);
        return { data: null, error: `Failed to fetch demo: ${fetchError.message}` };
      }

      const updateData: Record<string, unknown> = {
        chat_interaction_count: (currentDemo.chat_interaction_count ?? 0) + 1
      };

      // Update status to 'engaged' if not already engaged
      if (currentDemo.status !== 'engaged') {
        updateData.status = 'engaged';
      }

      const { data, error } = await supabase
        .from('demos')
        .update(updateData)
        .eq('id', demoId)
        .select()
        .single();

      if (error) {
        console.error('Error incrementing chat interaction:', error);
        return { data: null, error: `Failed to increment chat interaction: ${error.message}` };
      }

      return { data: data as Demo, error: null };
    } catch (err) {
      console.error('Unexpected error incrementing chat interaction:', err);
      return { data: null, error: 'An unexpected error occurred while incrementing chat interaction' };
    }
  };

  /**
   * Increment voice_interaction_count and update status to 'engaged' if not already
   */
  const incrementVoiceInteraction = async (demoId: string): Promise<DemoResult<Demo>> => {
    try {
      const { data: currentDemo, error: fetchError } = await supabase
        .from('demos')
        .select('voice_interaction_count, status')
        .eq('id', demoId)
        .single();

      if (fetchError) {
        console.error('Error fetching demo for voice increment:', fetchError);
        return { data: null, error: `Failed to fetch demo: ${fetchError.message}` };
      }

      const updateData: Record<string, unknown> = {
        voice_interaction_count: (currentDemo.voice_interaction_count ?? 0) + 1
      };

      // Update status to 'engaged' if not already engaged
      if (currentDemo.status !== 'engaged') {
        updateData.status = 'engaged';
      }

      const { data, error } = await supabase
        .from('demos')
        .update(updateData)
        .eq('id', demoId)
        .select()
        .single();

      if (error) {
        console.error('Error incrementing voice interaction:', error);
        return { data: null, error: `Failed to increment voice interaction: ${error.message}` };
      }

      return { data: data as Demo, error: null };
    } catch (err) {
      console.error('Unexpected error incrementing voice interaction:', err);
      return { data: null, error: 'An unexpected error occurred while incrementing voice interaction' };
    }
  };

  /**
   * Send demo invitation email to prospect
   */
  const sendDemoEmail = async (
    demoId: string,
    toEmail: string,
    options?: {
      toName?: string;
      fromName?: string;
      baseUrl?: string;
    }
  ): Promise<DemoResult<{ demoUrl: string; status: string }>> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-demo-email', {
        body: {
          demoId,
          toEmail,
          toName: options?.toName,
          fromName: options?.fromName,
          baseUrl: options?.baseUrl,
        }
      });

      // Handle FunctionsHttpError - parse body for error details
      if (error) {
        console.error('Error invoking send-demo-email:', error);
        
        // Try to extract error message from the error context
        let errorMessage = error.message || 'Failed to send demo email';
        
        // If the error has context with body, try to parse it
        if (error.context?.body) {
          try {
            const bodyText = await error.context.body.text();
            const errorData = JSON.parse(bodyText);
            if (errorData?.error) {
              errorMessage = errorData.error;
            }
          } catch {
            // Ignore parse errors
          }
        }
        
        return { data: null, error: errorMessage };
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Unknown error sending demo email';
        console.error('send-demo-email returned error:', errorMessage);
        return { data: null, error: errorMessage };
      }

      return {
        data: {
          demoUrl: data.demoUrl,
          status: data.status,
        },
        error: null,
      };
    } catch (err) {
      console.error('Unexpected error sending demo email:', err);
      return { data: null, error: 'An unexpected error occurred while sending demo email' };
    }
  };

  /**
   * Generate and update screenshot URL for a demo
   */
  const captureScreenshot = async (demoId: string, websiteUrl: string): Promise<DemoResult<Demo>> => {
    try {
      console.log('Capturing screenshot for demo:', demoId, 'URL:', websiteUrl);
      
      const { data, error: invokeError } = await supabase.functions.invoke('demo-screenshot', {
        body: { url: websiteUrl }
      });

      if (invokeError) {
        console.error('Error invoking demo-screenshot:', invokeError);
        return { data: null, error: `Failed to capture screenshot: ${invokeError.message}` };
      }

      if (!data?.success || !data?.screenshot_url) {
        console.error('Screenshot function returned error:', data?.error);
        return { data: null, error: data?.error || 'Failed to generate screenshot' };
      }

      // Update the demo with the screenshot URL
      const { data: updatedDemo, error: updateError } = await supabase
        .from('demos')
        .update({ screenshot_url: data.screenshot_url })
        .eq('id', demoId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating demo with screenshot:', updateError);
        return { data: null, error: `Failed to save screenshot: ${updateError.message}` };
      }

      console.log('Screenshot captured and saved successfully');
      return { data: updatedDemo as Demo, error: null };
    } catch (err) {
      console.error('Unexpected error capturing screenshot:', err);
      return { data: null, error: 'An unexpected error occurred while capturing screenshot' };
    }
  };

  return {
    createDemo,
    getDemoById,
    getDemosForLead,
    getDemosForContact,
    getDemosForRep,
    updateDemoStatus,
    incrementViewCount,
    incrementChatInteraction,
    incrementVoiceInteraction,
    sendDemoEmail,
    captureScreenshot,
  };
};

export default useDemos;
