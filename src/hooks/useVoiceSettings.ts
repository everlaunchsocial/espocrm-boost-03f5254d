import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getDefaultVoiceId } from '@/lib/cartesiaVoices';

export type VoiceSettingsData = {
  voiceId: string;
  voiceSpeed: number;
  greetingText: string;
};

const DEFAULT_SETTINGS: VoiceSettingsData = {
  voiceId: getDefaultVoiceId(),
  voiceSpeed: 1.0,
  greetingText: "Hi there! Thanks for calling. How can I help you today?",
};

// Track current playing audio to stop it before playing new one
let currentAudio: HTMLAudioElement | null = null;

export function useVoiceSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [settings, setSettings] = useState<VoiceSettingsData | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Get customer profile
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) {
          setIsLoading(false);
          return;
        }

        setCustomerId(profile.id);

        // Get voice settings
        const { data: voiceSettings, error } = await supabase
          .from('voice_settings')
          .select('voice_id, voice_speed, greeting_text')
          .eq('customer_id', profile.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching voice settings:', error);
        }

        if (voiceSettings) {
          setSettings({
            voiceId: voiceSettings.voice_id || DEFAULT_SETTINGS.voiceId,
            voiceSpeed: Number(voiceSettings.voice_speed) || DEFAULT_SETTINGS.voiceSpeed,
            greetingText: voiceSettings.greeting_text || DEFAULT_SETTINGS.greetingText,
          });
        } else {
          // Create default settings
          const { error: insertError } = await supabase
            .from('voice_settings')
            .insert({
              customer_id: profile.id,
              voice_id: DEFAULT_SETTINGS.voiceId,
              voice_speed: DEFAULT_SETTINGS.voiceSpeed,
              greeting_text: DEFAULT_SETTINGS.greetingText,
            });

          if (insertError) {
            console.error('Error creating default voice settings:', insertError);
          }

          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('Error in fetchSettings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<VoiceSettingsData>) => {
    if (!customerId) {
      toast.error('No customer profile found');
      return;
    }

    setIsSaving(true);

    try {
      const updateData: Record<string, unknown> = {};
      
      if (newSettings.voiceId !== undefined) {
        updateData.voice_id = newSettings.voiceId;
      }
      if (newSettings.voiceSpeed !== undefined) {
        updateData.voice_speed = newSettings.voiceSpeed;
      }
      if (newSettings.greetingText !== undefined) {
        updateData.greeting_text = newSettings.greetingText;
      }

      const { error } = await supabase
        .from('voice_settings')
        .update(updateData)
        .eq('customer_id', customerId);

      if (error) throw error;

      // Update local state
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);

      // Sync with Vapi
      const { error: vapiError } = await supabase.functions.invoke('vapi-update-assistant', {
        body: {
          customer_id: customerId,
          voice_id: newSettings.voiceId || settings?.voiceId,
          voice_speed: newSettings.voiceSpeed || settings?.voiceSpeed,
          greeting_text: newSettings.greetingText || settings?.greetingText,
        },
      });

      if (vapiError) {
        console.error('Error syncing with Vapi:', vapiError);
        toast.warning('Settings saved but voice sync failed');
      } else {
        toast.success('Voice settings saved');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [customerId, settings]);

  const previewVoice = useCallback(async (voiceId: string, text: string, speed?: number) => {
    // Stop any currently playing audio first
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }

    setIsPreviewLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('preview-voice', {
        body: { voice_id: voiceId, text, speed },
      });

      if (error) throw error;

      if (data?.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        currentAudio = audio;
        audio.onended = () => {
          currentAudio = null;
        };
        await audio.play();
      } else if (data?.message) {
        toast.info(data.message);
      }
    } catch (error) {
      console.error('Error previewing voice:', error);
      toast.error('Failed to preview voice');
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);

  return {
    settings,
    isLoading,
    isSaving,
    isPreviewLoading,
    updateSettings,
    previewVoice,
  };
}
