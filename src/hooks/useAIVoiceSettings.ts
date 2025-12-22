import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const voiceOptions: VoiceOption[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced', icon: '🎙️' },
  { id: 'echo', name: 'Echo', description: 'Warm and empathetic', icon: '🌊' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic', icon: '✨' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative', icon: '🔮' },
  { id: 'nova', name: 'Nova', description: 'Friendly and energetic', icon: '⭐' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft and calm', icon: '🌸' },
];

export interface AIVoiceSettings {
  voice: string;
  speechSpeed: number;
  autoPlayResponses: boolean;
  voiceSensitivity: 'low' | 'medium' | 'high';
}

const DEFAULT_SETTINGS: AIVoiceSettings = {
  voice: 'alloy',
  speechSpeed: 1.0,
  autoPlayResponses: true,
  voiceSensitivity: 'medium',
};

export function useAIVoiceSettings() {
  const [settings, setSettings] = useState<AIVoiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_preferences')
          .select('ai_assistant_voice, ai_speech_speed, ai_auto_play_responses, ai_voice_sensitivity')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching voice settings:', error);
        }

        if (data) {
          setSettings({
            voice: data.ai_assistant_voice || DEFAULT_SETTINGS.voice,
            speechSpeed: data.ai_speech_speed || DEFAULT_SETTINGS.speechSpeed,
            autoPlayResponses: data.ai_auto_play_responses ?? DEFAULT_SETTINGS.autoPlayResponses,
            voiceSensitivity: (data.ai_voice_sensitivity as AIVoiceSettings['voiceSensitivity']) || DEFAULT_SETTINGS.voiceSensitivity,
          });
        }
      } catch (error) {
        console.error('Error fetching voice settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Save settings
  const saveSettings = useCallback(async (newSettings: Partial<AIVoiceSettings>) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save settings');
        return false;
      }

      const updatedSettings = { ...settings, ...newSettings };

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ai_assistant_voice: updatedSettings.voice,
          ai_speech_speed: updatedSettings.speechSpeed,
          ai_auto_play_responses: updatedSettings.autoPlayResponses,
          ai_voice_sensitivity: updatedSettings.voiceSensitivity,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving voice settings:', error);
        toast.error('Failed to save settings');
        return false;
      }

      setSettings(updatedSettings);
      toast.success('Voice settings updated');
      return true;
    } catch (error) {
      console.error('Error saving voice settings:', error);
      toast.error('Failed to save settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings]);

  // Preview voice using TTS
  const previewVoice = useCallback(async (voiceId: string) => {
    if (previewPlaying) return;
    
    setPreviewPlaying(voiceId);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant-preview-voice', {
        body: {
          text: "Hi, I'm your AI assistant. How can I help you today?",
          voice: voiceId
        }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.onended = () => setPreviewPlaying(null);
        audio.onerror = () => setPreviewPlaying(null);
        await audio.play();
      }
    } catch (error) {
      console.error('Error previewing voice:', error);
      toast.error('Failed to preview voice');
      setPreviewPlaying(null);
    }
  }, [previewPlaying]);

  return {
    settings,
    loading,
    saving,
    previewPlaying,
    saveSettings,
    previewVoice,
    voiceOptions,
  };
}
