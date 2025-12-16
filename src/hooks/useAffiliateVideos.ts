import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAffiliate } from './useCurrentAffiliate';
import { toast } from 'sonner';

export type AvatarProfileStatus = 'draft' | 'uploading' | 'training' | 'ready' | 'failed';
export type VideoStatus = 'draft' | 'generating' | 'ready' | 'failed';
export type VideoType = 'recruitment' | 'product' | 'attorney' | 'dentist' | 'salon' | 'plumber' | 'product_sales' | 'testimonial';

export interface AvatarProfile {
  id: string;
  affiliate_id: string;
  photo_urls: string[];
  voice_audio_url: string | null;
  heygen_avatar_id: string | null;
  heygen_avatar_group_id: string | null;
  elevenlabs_voice_id: string | null;
  status: AvatarProfileStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateVideo {
  id: string;
  affiliate_id: string;
  profile_id: string;
  script_template_id: string;
  video_name: string;
  video_type: VideoType;
  status: VideoStatus;
  heygen_video_id: string | null;
  heygen_video_url: string | null;
  landing_page_slug: string | null;
  is_active: boolean;
  error_message: string | null;
  estimated_cost_usd: number | null;
  created_at: string;
  updated_at: string;
}

export interface VideoScriptTemplate {
  id: string;
  name: string;
  video_type: string;
  script_text: string;
  is_active: boolean;
}

export interface VideoAnalytics {
  video_id: string;
  views: number;
  cta_clicks: number;
}

export function useAffiliateVideos() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const [profile, setProfile] = useState<AvatarProfile | null>(null);
  const [videos, setVideos] = useState<AffiliateVideo[]>([]);
  const [templates, setTemplates] = useState<VideoScriptTemplate[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, VideoAnalytics>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!affiliateId) return;

    setIsLoading(true);
    try {
      // Fetch avatar profile
      const { data: profileData } = await supabase
        .from('affiliate_avatar_profiles')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .maybeSingle();

      setProfile(profileData as AvatarProfile | null);

      // Fetch videos
      const { data: videosData } = await supabase
        .from('affiliate_videos')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      setVideos((videosData as AffiliateVideo[]) || []);

      // Fetch active templates
      const { data: templatesData } = await supabase
        .from('video_script_templates')
        .select('*')
        .eq('is_active', true);

      setTemplates((templatesData || []) as unknown as VideoScriptTemplate[]);

      // Fetch analytics for videos
      if (videosData && videosData.length > 0) {
        const videoIds = videosData.map(v => v.id);
        const { data: analyticsData } = await supabase
          .from('video_analytics')
          .select('video_id, event_type')
          .in('video_id', videoIds);

        if (analyticsData) {
          const analyticsMap: Record<string, VideoAnalytics> = {};
          videoIds.forEach(id => {
            analyticsMap[id] = { video_id: id, views: 0, cta_clicks: 0 };
          });
          analyticsData.forEach(row => {
            const eventType = row.event_type as string;
            if (eventType === 'view') {
              analyticsMap[row.video_id].views++;
            } else if (eventType.includes('cta')) {
              analyticsMap[row.video_id].cta_clicks++;
            }
          });
          setAnalytics(analyticsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching affiliate video data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [affiliateId]);

  useEffect(() => {
    if (!affiliateLoading && affiliateId) {
      fetchData();
    }
  }, [affiliateId, affiliateLoading, fetchData]);

  const createAvatarProfile = async (photoUrls: string[], voiceAudioUrl: string) => {
    if (!affiliateId) {
      toast.error('No affiliate found');
      return null;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return null;
      }

      const response = await supabase.functions.invoke('create-avatar-profile', {
        body: { photo_urls: photoUrls, voice_audio_url: voiceAudioUrl },
      });

      if (response.error) {
        toast.error(response.error.message || 'Failed to create avatar profile');
        return null;
      }

      toast.success('Avatar profile submitted for processing');
      await fetchData();
      return response.data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create avatar profile');
      return null;
    }
  };

  const generateVideo = async (templateId: string) => {
    if (!affiliateId || !profile) {
      toast.error('Avatar profile required');
      return null;
    }

    if (profile.status !== 'ready') {
      toast.error('Avatar profile is not ready yet');
      return null;
    }

    // Find template name for video naming
    const template = templates.find(t => t.id === templateId);
    const videoName = template 
      ? `${template.name} - ${new Date().toLocaleDateString()}`
      : `Video - ${new Date().toLocaleDateString()}`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return null;
      }

      const response = await supabase.functions.invoke('generate-affiliate-video', {
        body: { 
          profile_id: profile.id,
          template_id: templateId,
          video_name: videoName
        },
      });

      if (response.error) {
        toast.error(response.error.message || 'Failed to generate video');
        return null;
      }

      toast.success('Video generation started');
      await fetchData();
      return response.data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate video');
      return null;
    }
  };

  const getVideoAnalytics = (videoId: string) => {
    return analytics[videoId] || { video_id: videoId, views: 0, cta_clicks: 0 };
  };

  return {
    profile,
    videos,
    templates,
    isLoading: isLoading || affiliateLoading,
    hasProfile: !!profile,
    profileReady: profile?.status === 'ready',
    createAvatarProfile,
    generateVideo,
    getVideoAnalytics,
    refetch: fetchData,
  };
}
