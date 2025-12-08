import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
}

export interface KnowledgeSource {
  id: string;
  customer_id: string;
  source_type: string;
  file_name: string | null;
  storage_path: string | null;
  status: string;
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

  const fetchCustomerData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/affiliate-signup');
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
        // No customer profile - redirect to purchase
        navigate('/buy');
        return;
      }

      setCustomerProfile(profile as unknown as CustomerProfile);

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

      // Fetch Twilio number
      const { data: twilio } = await supabase
        .from('twilio_numbers')
        .select('twilio_number')
        .eq('customer_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();
      
      setTwilioNumber(twilio?.twilio_number || null);

    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('Failed to load your data');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const updateProfile = useCallback(async (updates: Partial<CustomerProfile>) => {
    if (!customerProfile) return false;
    
    try {
      const { error } = await supabase
        .from('customer_profiles')
        .update(updates as Record<string, unknown>)
        .eq('id', customerProfile.id);
      
      if (error) throw error;
      
      setCustomerProfile(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to save changes');
      return false;
    }
  }, [customerProfile]);

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
      return true;
    } catch (error) {
      console.error('Error updating voice settings:', error);
      toast.error('Failed to save voice settings');
      return false;
    }
  }, [customerProfile, voiceSettings]);

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
      return true;
    } catch (error) {
      console.error('Error updating chat settings:', error);
      toast.error('Failed to save chat settings');
      return false;
    }
  }, [customerProfile, chatSettings]);

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
      return true;
    } catch (error) {
      console.error('Error updating calendar integration:', error);
      toast.error('Failed to save calendar settings');
      return false;
    }
  }, [customerProfile, calendarIntegration]);

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

  return {
    isLoading,
    customerProfile,
    voiceSettings,
    chatSettings,
    calendarIntegration,
    knowledgeSources,
    twilioNumber,
    updateProfile,
    updateVoiceSettings,
    updateChatSettings,
    updateCalendarIntegration,
    addKnowledgeSource,
    removeKnowledgeSource,
    goToStep,
    completeOnboarding,
    isOnboardingComplete,
    refetch: fetchCustomerData
  };
}
