import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Fields that affect phone AI prompt generation - trigger vapi-update-assistant when changed
const PHONE_AI_AFFECTING_FIELDS = [
  'lead_capture_enabled',
  'after_hours_behavior', 
  'business_hours',
  'business_type',
  'business_name',
  'phone', // transfer number
];

const CALENDAR_AFFECTING_FIELDS = ['appointments_enabled'];
const VOICE_AFFECTING_FIELDS = ['ai_name', 'greeting_text'];
const CHAT_AFFECTING_FIELDS = ['instructions'];

export type OnboardingStage = 
  | 'pending_portal_entry'
  | 'portal_entered'
  | 'wizard_started'
  | 'wizard_step_1'
  | 'wizard_step_2'
  | 'wizard_step_3'
  | 'wizard_step_4'
  | 'wizard_step_5'
  | 'wizard_step_6'
  | 'wizard_complete';

export interface CustomerProfile {
  id: string;
  user_id: string;
  onboarding_stage: OnboardingStage;
  onboarding_current_step: number;
  onboarding_completed_at: string | null;
  business_name: string | null;
  website_url: string | null;
  contact_name: string | null;
  phone: string | null;
  business_type: string | null;
  lead_capture_enabled: boolean;
  lead_email: string | null;
  lead_sms_number: string | null;
  minutes_included: number;
  embed_installed_at: string | null;
  phone_tested_at: string | null;
  testing_code: string | null;
  // Address fields
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  business_phone: string | null;
}

export interface VoiceSettings {
  id: string;
  customer_id: string;
  voice_gender: string | null;
  voice_style: string | null;
  greeting_text: string | null;
  response_pace: string | null;
  language_code: string | null;
  voice_pitch: number | null;
  voice_speed: number | null;
  ai_name: string | null;
}

export interface ChatSettings {
  id: string;
  customer_id: string;
  tone: string | null;
  instructions: string | null;
  use_website_knowledge: boolean;
  use_uploaded_docs: boolean;
  greeting_text: string | null;
}

export interface CalendarIntegration {
  id: string;
  customer_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  appointments_enabled: boolean;
  availability_json: Record<string, string[]>;
  slot_length_minutes: number;
  send_reminders: boolean;
  webhook_url: string | null;
}

export interface KnowledgeSource {
  id: string;
  customer_id: string;
  source_type: string;
  file_name: string | null;
  storage_path: string | null;
  status: string;
  content_text: string | null;
  created_at: string;
}

export function useCustomerOnboarding() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings | null>(null);
  const [chatSettings, setChatSettings] = useState<ChatSettings | null>(null);
  const [calendarIntegration, setCalendarIntegration] = useState<CalendarIntegration | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [twilioNumber, setTwilioNumber] = useState<string | null>(null);
  const [profileLoadState, setProfileLoadState] = useState<'loading' | 'found' | 'not_found' | 'polling'>('loading');

  // Track if phone AI sync is needed (debounced to avoid multiple calls)
  const phoneAiSyncPending = useRef(false);
  const phoneAiSyncTimeout = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);
  const maxPollAttempts = 15; // Poll for up to ~30 seconds (15 attempts * 2 seconds)
  
  // Check if current path is an onboarding route
  const isOnboardingRoute = () => {
    const path = window.location.pathname;
    return path.startsWith('/customer/onboarding');
  };
  
  // Trigger vapi-update-assistant to refresh phone AI prompt
  const syncPhoneAiAssistant = useCallback(async (customerId: string) => {
    try {
      console.log('[useCustomerOnboarding] Syncing phone AI assistant for customer:', customerId);
      const { error } = await supabase.functions.invoke('vapi-update-assistant', {
        body: { customer_id: customerId, regenerate_prompt: true }
      });
      if (error) {
        console.error('[useCustomerOnboarding] Failed to sync phone AI:', error);
      } else {
        console.log('[useCustomerOnboarding] Phone AI assistant synced successfully');
      }
    } catch (err) {
      console.error('[useCustomerOnboarding] Error syncing phone AI:', err);
    }
  }, []);
  
  // Debounced phone AI sync - waits 1s after last change before syncing
  const queuePhoneAiSync = useCallback((customerId: string) => {
    if (phoneAiSyncTimeout.current) {
      clearTimeout(phoneAiSyncTimeout.current);
    }
    phoneAiSyncPending.current = true;
    phoneAiSyncTimeout.current = setTimeout(() => {
      if (phoneAiSyncPending.current) {
        syncPhoneAiAssistant(customerId);
        phoneAiSyncPending.current = false;
      }
    }, 1000);
  }, [syncPhoneAiAssistant]);

  // Poll for customer profile (for newly created customers via welcome email)
  const pollForProfile = useCallback(async (userId: string): Promise<CustomerProfile | null> => {
    console.log(`[useCustomerOnboarding] Polling for profile, attempt ${pollAttemptsRef.current + 1}/${maxPollAttempts}`);
    
    const { data: profile, error } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[useCustomerOnboarding] Poll error:', error);
      return null;
    }
    
    return profile as unknown as CustomerProfile | null;
  }, []);

  const startPolling = useCallback(async (userId: string) => {
    setProfileLoadState('polling');
    pollAttemptsRef.current = 0;
    
    const poll = async (): Promise<CustomerProfile | null> => {
      if (pollAttemptsRef.current >= maxPollAttempts) {
        console.log('[useCustomerOnboarding] Max poll attempts reached');
        return null;
      }
      
      const profile = await pollForProfile(userId);
      if (profile) {
        return profile;
      }
      
      pollAttemptsRef.current++;
      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
      return poll();
    };
    
    return poll();
  }, [pollForProfile]);

  // Helper to fetch related data after profile is found
  const fetchRelatedData = useCallback(async (profile: CustomerProfile) => {
    // Fetch voice settings
    const { data: voice } = await supabase
      .from('voice_settings')
      .select('*')
      .eq('customer_id', profile.id)
      .maybeSingle();
    
    setVoiceSettings(voice as unknown as VoiceSettings);

    // Fetch chat settings
    const { data: chat } = await supabase
      .from('chat_settings')
      .select('*')
      .eq('customer_id', profile.id)
      .maybeSingle();
    
    setChatSettings(chat as unknown as ChatSettings);

    // Fetch calendar integration
    const { data: calendar } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('customer_id', profile.id)
      .maybeSingle();
    
    setCalendarIntegration(calendar as unknown as CalendarIntegration);

    // Fetch knowledge sources
    const { data: sources } = await supabase
      .from('customer_knowledge_sources')
      .select('*')
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false });
    
    setKnowledgeSources((sources || []) as unknown as KnowledgeSource[]);

    // Fetch phone number from customer_phone_numbers (Vapi) or fallback to twilio_numbers
    const { data: vapiPhone } = await supabase
      .from('customer_phone_numbers')
      .select('phone_number')
      .eq('customer_id', profile.id)
      .eq('status', 'active')
      .maybeSingle();
    
    if (vapiPhone?.phone_number) {
      setTwilioNumber(vapiPhone.phone_number);
    } else {
      // Fallback to legacy twilio_numbers table
      const { data: twilio } = await supabase
        .from('twilio_numbers')
        .select('twilio_number')
        .eq('customer_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();
      
      setTwilioNumber(twilio?.twilio_number || null);
    }
    
    setIsLoading(false);
  }, []);

  const fetchCustomerData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // No user - redirect to auth with return path to onboarding
        const currentPath = window.location.pathname;
        navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }

      // Fetch customer profile
      const { data: profile, error: profileError } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profile) {
        // If on an onboarding route, poll for profile (customer may have just been created)
        if (isOnboardingRoute()) {
          console.log('[useCustomerOnboarding] No profile found on onboarding route, starting poll...');
          const polledProfile = await startPolling(user.id);
          
          if (polledProfile) {
            console.log('[useCustomerOnboarding] Profile found after polling');
            setCustomerProfile(polledProfile);
            setProfileLoadState('found');
            await fetchRelatedData(polledProfile);
            return;
          } else {
            // Polling failed - show not found state (UI can show retry options)
            console.log('[useCustomerOnboarding] Profile not found after polling');
            setProfileLoadState('not_found');
            setIsLoading(false);
            return;
          }
        }
        
        // Not on onboarding route and no profile - redirect to buy
        navigate('/buy');
        return;
      }
      
      setProfileLoadState('found');
      setCustomerProfile(profile as unknown as CustomerProfile);
      await fetchRelatedData(profile as unknown as CustomerProfile);

    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('Failed to load your data');
      setIsLoading(false);
    }
  }, [navigate, startPolling, fetchRelatedData]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const updateProfile = useCallback(async (updates: Partial<CustomerProfile>) => {
    if (!customerProfile) return false;
    
    try {
      // Use user_id for update since RLS policy checks user_id = auth.uid()
      const { error } = await supabase
        .from('customer_profiles')
        .update(updates as Record<string, unknown>)
        .eq('user_id', customerProfile.user_id);
      
      if (error) throw error;
      
      setCustomerProfile(prev => prev ? { ...prev, ...updates } : null);
      
      // Check if any phone AI affecting fields changed - trigger assistant sync
      const affectedFields = Object.keys(updates);
      const needsPhoneAiSync = affectedFields.some(field => 
        PHONE_AI_AFFECTING_FIELDS.includes(field)
      );
      
      if (needsPhoneAiSync) {
        console.log('[updateProfile] Phone AI affecting fields changed:', affectedFields.filter(f => PHONE_AI_AFFECTING_FIELDS.includes(f)));
        queuePhoneAiSync(customerProfile.id);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to save changes');
      return false;
    }
  }, [customerProfile, queuePhoneAiSync]);

  const updateVoiceSettings = useCallback(async (updates: Partial<VoiceSettings>) => {
    if (!customerProfile) return false;
    
    try {
      if (voiceSettings) {
        const { error } = await supabase
          .from('voice_settings')
          .update(updates as Record<string, unknown>)
          .eq('customer_id', customerProfile.id);
        
        if (error) throw error;
        setVoiceSettings(prev => prev ? { ...prev, ...updates } : null);
      } else {
        const { data, error } = await supabase
          .from('voice_settings')
          .insert([{ customer_id: customerProfile.id, ...updates }])
          .select()
          .single();
        
        if (error) throw error;
        setVoiceSettings(data as unknown as VoiceSettings);
      }
      
      // Check if voice fields affecting phone AI changed
      const affectedFields = Object.keys(updates);
      const needsPhoneAiSync = affectedFields.some(field => 
        VOICE_AFFECTING_FIELDS.includes(field)
      );
      
      if (needsPhoneAiSync) {
        console.log('[updateVoiceSettings] Phone AI affecting fields changed:', affectedFields.filter(f => VOICE_AFFECTING_FIELDS.includes(f)));
        queuePhoneAiSync(customerProfile.id);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating voice settings:', error);
      toast.error('Failed to save voice settings');
      return false;
    }
  }, [customerProfile, voiceSettings, queuePhoneAiSync]);

  const updateChatSettings = useCallback(async (updates: Partial<ChatSettings>) => {
    if (!customerProfile) return false;
    
    try {
      if (chatSettings) {
        const { error } = await supabase
          .from('chat_settings')
          .update(updates as Record<string, unknown>)
          .eq('customer_id', customerProfile.id);
        
        if (error) throw error;
        setChatSettings(prev => prev ? { ...prev, ...updates } : null);
      } else {
        const { data, error } = await supabase
          .from('chat_settings')
          .insert([{ customer_id: customerProfile.id, ...updates }])
          .select()
          .single();
        
        if (error) throw error;
        setChatSettings(data as unknown as ChatSettings);
      }
      
      // Check if chat fields affecting phone AI changed
      const affectedFields = Object.keys(updates);
      const needsPhoneAiSync = affectedFields.some(field => 
        CHAT_AFFECTING_FIELDS.includes(field)
      );
      
      if (needsPhoneAiSync) {
        console.log('[updateChatSettings] Phone AI affecting fields changed:', affectedFields.filter(f => CHAT_AFFECTING_FIELDS.includes(f)));
        queuePhoneAiSync(customerProfile.id);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating chat settings:', error);
      toast.error('Failed to save chat settings');
      return false;
    }
  }, [customerProfile, chatSettings, queuePhoneAiSync]);
  const updateCalendarIntegration = useCallback(async (updates: Partial<CalendarIntegration>) => {
    if (!customerProfile) return false;
    
    try {
      if (calendarIntegration) {
        const { error } = await supabase
          .from('calendar_integrations')
          .update(updates as Record<string, unknown>)
          .eq('customer_id', customerProfile.id);
        
        if (error) throw error;
        setCalendarIntegration(prev => prev ? { ...prev, ...updates } : null);
      } else {
        const { data, error } = await supabase
          .from('calendar_integrations')
          .insert([{ customer_id: customerProfile.id, ...updates }])
          .select()
          .single();
        
        if (error) throw error;
        setCalendarIntegration(data as unknown as CalendarIntegration);
      }
      
      // Check if calendar fields affecting phone AI changed
      const affectedFields = Object.keys(updates);
      const needsPhoneAiSync = affectedFields.some(field => 
        CALENDAR_AFFECTING_FIELDS.includes(field)
      );
      
      if (needsPhoneAiSync) {
        console.log('[updateCalendarIntegration] Phone AI affecting fields changed:', affectedFields.filter(f => CALENDAR_AFFECTING_FIELDS.includes(f)));
        queuePhoneAiSync(customerProfile.id);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating calendar integration:', error);
      toast.error('Failed to save calendar settings');
      return false;
    }
  }, [customerProfile, calendarIntegration, queuePhoneAiSync]);

  const addKnowledgeSource = useCallback(async (source: { source_type: string; file_name: string; storage_path: string }) => {
    if (!customerProfile) return null;
    
    try {
      const { data, error } = await supabase
        .from('customer_knowledge_sources')
        .insert({
          customer_id: customerProfile.id,
          ...source,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setKnowledgeSources(prev => [data as unknown as KnowledgeSource, ...prev]);
      return data;
    } catch (error) {
      console.error('Error adding knowledge source:', error);
      toast.error('Failed to add document');
      return null;
    }
  }, [customerProfile]);

  const removeKnowledgeSource = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('customer_knowledge_sources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setKnowledgeSources(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (error) {
      console.error('Error removing knowledge source:', error);
      toast.error('Failed to remove document');
      return false;
    }
  }, []);

  const goToStep = useCallback(async (step: number) => {
    const stageMap: Record<number, OnboardingStage> = {
      1: 'wizard_step_1',
      2: 'wizard_step_2',
      3: 'wizard_step_3',
      4: 'wizard_step_4',
      5: 'wizard_step_5',
      6: 'wizard_step_6',
    };

    await updateProfile({
      onboarding_stage: stageMap[step] || 'wizard_step_1',
      onboarding_current_step: step
    });
    
    navigate(`/customer/onboarding/wizard/${step}`);
  }, [navigate, updateProfile]);

  const completeOnboarding = useCallback(async () => {
    const success = await updateProfile({
      onboarding_stage: 'wizard_complete',
      onboarding_current_step: 6,
      onboarding_completed_at: new Date().toISOString()
    });
    
    if (success) {
      toast.success('Onboarding complete! Welcome to EverLaunch AI.');
      navigate('/customer/dashboard');
    }
  }, [navigate, updateProfile]);

  const isOnboardingComplete = customerProfile?.onboarding_stage === 'wizard_complete';

  const provisionPhoneNumber = useCallback(async (areaCode?: string): Promise<{ success: boolean; phoneNumber?: string; error?: string; suggestedCodes?: string[] }> => {
    if (!customerProfile) {
      return { success: false, error: 'No customer profile found' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('provision-customer-phone', {
        body: { customer_id: customerProfile.id, area_code: areaCode }
      });

      if (error) {
        console.error('Error calling provision-customer-phone:', error);
        return { success: false, error: error.message || 'Failed to provision phone number' };
      }

      if (data?.success && data?.phoneNumber) {
        setTwilioNumber(data.phoneNumber);
        return { success: true, phoneNumber: data.phoneNumber };
      }

      // Return suggested codes if available from the API response
      return { 
        success: false, 
        error: data?.error || 'Failed to provision phone number',
        suggestedCodes: data?.suggestedCodes || []
      };
    } catch (error: any) {
      console.error('Exception in provisionPhoneNumber:', error);
      return { success: false, error: error.message || 'Unexpected error' };
    }
  }, [customerProfile]);

  return {
    isLoading,
    customerProfile,
    voiceSettings,
    chatSettings,
    calendarIntegration,
    knowledgeSources,
    twilioNumber,
    profileLoadState,
    updateProfile,
    updateVoiceSettings,
    updateChatSettings,
    updateCalendarIntegration,
    addKnowledgeSource,
    removeKnowledgeSource,
    goToStep,
    completeOnboarding,
    isOnboardingComplete,
    provisionPhoneNumber,
    refetch: fetchCustomerData
  };
}
