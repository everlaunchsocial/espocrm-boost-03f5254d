import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VerticalTrainingRow } from '@/types/verticalTraining';

export function useVerticalTraining() {
  const [verticals, setVerticals] = useState<VerticalTrainingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVerticals();
  }, []);

  const fetchVerticals = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('vertical_training')
        .select('*')
        .order('rank', { ascending: true });

      if (fetchError) {
        console.error('Error fetching verticals:', fetchError);
        setError('Failed to load training content');
        return;
      }

      // Parse JSONB arrays from the database
      const parsed = (data || []).map(row => ({
        ...row,
        why_priority: Array.isArray(row.why_priority) ? row.why_priority : [],
        pain_points: Array.isArray(row.pain_points) ? row.pain_points : [],
        why_phone_ai_fits: Array.isArray(row.why_phone_ai_fits) ? row.why_phone_ai_fits : [],
        where_to_find: Array.isArray(row.where_to_find) ? row.where_to_find : [],
      })) as VerticalTrainingRow[];

      setVerticals(parsed);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session');
        return null;
      }

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

  return {
    verticals,
    isLoading,
    error,
    refetch: fetchVerticals,
    getSignedVideoUrl,
  };
}
