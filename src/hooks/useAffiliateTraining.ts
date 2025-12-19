import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrainingLibraryEntry, TrainingType } from '@/types/trainingLibrary';

export interface AffiliateTrainingEntry extends TrainingLibraryEntry {
  hasVideo: boolean;
}

export function useAffiliateTraining() {
  const [trainings, setTrainings] = useState<AffiliateTrainingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('training_library')
        .select('*')
        .eq('is_active', true)
        .order('vertical_key', { ascending: true, nullsFirst: false })
        .order('training_type', { ascending: true })
        .order('title', { ascending: true });

      if (fetchError) {
        console.error('Error fetching trainings:', fetchError);
        setError('Failed to load training content');
        return;
      }

      // Parse JSONB arrays and determine video availability
      const parsed = (data || []).map(row => ({
        ...row,
        training_type: row.training_type as TrainingType,
        why_priority: Array.isArray(row.why_priority) ? row.why_priority : [],
        pain_points: Array.isArray(row.pain_points) ? row.pain_points : [],
        why_phone_ai_fits: Array.isArray(row.why_phone_ai_fits) ? row.why_phone_ai_fits : [],
        where_to_find: Array.isArray(row.where_to_find) ? row.where_to_find : [],
        hasVideo: !!row.latest_video_path,
      })) as AffiliateTrainingEntry[];

      setTrainings(parsed);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getSignedVideoUrl = async (videoPath: string | null): Promise<string | null> => {
    if (!videoPath) return null;

    try {
      // Check if it's already a full URL (HeyGen fallback)
      if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
        return videoPath;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session');
        return null;
      }

      // Get signed URL from training-videos bucket
      const response = await supabase.functions.invoke('get-training-video-url', {
        body: { video_path: videoPath },
      });

      if (response.error) {
        console.error('Error getting signed URL:', response.error);
        return null;
      }

      return response.data?.signedUrl || null;
    } catch (err) {
      console.error('Failed to get signed video URL:', err);
      return null;
    }
  };

  // Group trainings by vertical_key
  const groupedByVertical = trainings.reduce((acc, training) => {
    const key = training.vertical_key || '__general__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(training);
    return acc;
  }, {} as Record<string, AffiliateTrainingEntry[]>);

  // Get unique vertical keys for filtering
  const verticalKeys = [...new Set(trainings.map(t => t.vertical_key).filter(Boolean))] as string[];

  // Get unique training types for filtering
  const trainingTypes = [...new Set(trainings.map(t => t.training_type))] as TrainingType[];

  return {
    trainings,
    groupedByVertical,
    verticalKeys,
    trainingTypes,
    isLoading,
    error,
    refetch: fetchTrainings,
    getSignedVideoUrl,
  };
}
