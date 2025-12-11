import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getDefaultVoiceId } from '@/lib/cartesiaVoices';

export type VoiceGender = 'male' | 'female';
export type VoiceStyle = 'friendly' | 'professional' | 'high_energy';
export type ResponsePace = 'quick' | 'balanced' | 'thoughtful';

export interface VoiceSettingsData {
  voice_id: string;
  voice_gender: VoiceGender;
  voice_style: VoiceStyle;
  greeting_text: string;
  response_pace: ResponsePace;
  language_code: string;
}

const DEFAULT_SETTINGS: VoiceSettingsData = {
  voice_id: getDefaultVoiceId(),
  voice_gender: 'female',
  voice_style: 'friendly',
  greeting_text: '',
  response_pace: 'balanced',
  language_code: 'en',
};

export function useVoiceSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [settings, setSettings] = useState<VoiceSettingsData>(DEFAULT_SETTINGS);

  // Fetch voice settings on mount
  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Get customer profile
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('id, business_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile) {
          setIsLoading(false);
          return;
        }

        setCustomerId(profile.id);
        setBusinessName(profile.business_name || '');

        // Get voice settings
        const { data: voiceSettings } = await supabase
          .from('voice_settings')
          .select('*')
          .eq('customer_id', profile.id)
          .maybeSingle();

        if (voiceSettings) {
          setSettings({
            voice_id: voiceSettings.voice_id || getDefaultVoiceId(),
            voice_gender: (voiceSettings.voice_gender as VoiceGender) || 'female',
            voice_style: (voiceSettings.voice_style as VoiceStyle) || 'friendly',
            greeting_text: voiceSettings.greeting_text || getDefaultGreeting(profile.business_name || ''),
            response_pace: (voiceSettings.response_pace as ResponsePace) || 'balanced',
            language_code: voiceSettings.language_code || 'en',
          });
        } else {
          // Create default voice settings row
          const defaultGreeting = getDefaultGreeting(profile.business_name || '');
          const defaultVoiceId = getDefaultVoiceId();
          const newSettings = {
            customer_id: profile.id,
            voice_id: defaultVoiceId,
            voice_gender: 'female',
            voice_style: 'friendly',
            greeting_text: defaultGreeting,
            response_pace: 'balanced',
            language_code: 'en',
          };

          await supabase.from('voice_settings').insert(newSettings);

          // Also ensure chat_settings exists
          const { data: chatSettings } = await supabase
            .from('chat_settings')
            .select('id')
            .eq('customer_id', profile.id)
            .maybeSingle();

          if (!chatSettings) {
            await supabase.from('chat_settings').insert({
              customer_id: profile.id,
              greeting_text: defaultGreeting,
              tone: 'friendly',
            });
          }

          setSettings({
            ...DEFAULT_SETTINGS,
            voice_id: defaultVoiceId,
            greeting_text: defaultGreeting,
          });
        }
      } catch (error) {
        console.error('Error fetching voice settings:', error);
        toast.error('Failed to load voice settings');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const getDefaultGreeting = (businessName: string) => {
    const name = businessName || 'our business';
    return `Hello, thanks for calling ${name}. How can I help you today?`;
  };

  const updateSettings = useCallback(async (newSettings: Partial<VoiceSettingsData>) => {
    if (!customerId) return;

    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    setIsSaving(true);

    try {
      // Update voice_settings
      const { error: voiceError } = await supabase
        .from('voice_settings')
        .update({
          voice_id: updatedSettings.voice_id,
          voice_gender: updatedSettings.voice_gender,
          voice_style: updatedSettings.voice_style,
          greeting_text: updatedSettings.greeting_text,
          response_pace: updatedSettings.response_pace,
          language_code: updatedSettings.language_code,
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', customerId);

      if (voiceError) throw voiceError;

      // Also update chat_settings greeting_text and tone
      const toneMap: Record<VoiceStyle, string> = {
        friendly: 'friendly',
        professional: 'professional',
        high_energy: 'casual',
      };

      const { error: chatError } = await supabase
        .from('chat_settings')
        .update({
          greeting_text: updatedSettings.greeting_text,
          tone: toneMap[updatedSettings.voice_style],
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', customerId);

      if (chatError) {
        console.warn('Failed to update chat_settings:', chatError);
      }

      // Sync voice settings to Vapi assistant (if one exists)
      if (newSettings.voice_id || newSettings.greeting_text) {
        try {
          const { error: vapiError } = await supabase.functions.invoke('vapi-update-assistant', {
            body: {
              customer_id: customerId,
              voice_id: updatedSettings.voice_id,
              greeting_text: updatedSettings.greeting_text,
              voice_style: updatedSettings.voice_style,
            }
          });
          
          if (vapiError) {
            console.warn('Failed to sync to Vapi:', vapiError);
          }
        } catch (vapiErr) {
          console.warn('Vapi sync error:', vapiErr);
        }
      }

      toast.success('Settings saved');
    } catch (error) {
      console.error('Error saving voice settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [customerId, settings]);

  const previewVoice = useCallback(async (voiceId: string) => {
    setIsPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('preview-voice', {
        body: { voice_id: voiceId }
      });

      if (error) throw error;

      if (data?.audio) {
        // Play audio
        const audioBlob = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
        const blob = new Blob([audioBlob], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      } else if (data?.message) {
        toast.info(data.message);
      }
    } catch (error) {
      console.error('Error previewing voice:', error);
      toast.error('Voice preview not available yet');
    } finally {
      setIsPreviewing(false);
    }
  }, []);

  const validateSettings = (data: VoiceSettingsData): string | null => {
    if (!data.greeting_text || data.greeting_text.length < 5) {
      return 'Greeting text must be at least 5 characters';
    }
    if (data.greeting_text.length > 300) {
      return 'Greeting text must be less than 300 characters';
    }
    if (!data.voice_id) {
      return 'Please select a voice';
    }
    if (!['friendly', 'professional', 'high_energy'].includes(data.voice_style)) {
      return 'Invalid voice style';
    }
    if (!['quick', 'balanced', 'thoughtful'].includes(data.response_pace)) {
      return 'Invalid response pace';
    }
    return null;
  };

  return {
    isLoading,
    isSaving,
    isPreviewing,
    settings,
    businessName,
    updateSettings,
    validateSettings,
    getDefaultGreeting,
    previewVoice,
  };
}
