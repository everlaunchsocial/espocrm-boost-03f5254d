import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrainingLibraryEntry, TrainingType } from '@/types/trainingLibrary';
import { toast } from 'sonner';

export function useTrainingLibrary() {
  const queryClient = useQueryClient();

  // Fetch all training library entries
  const { data: entries, isLoading, error, refetch } = useQuery({
    queryKey: ['training-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_library')
        .select('*')
        .order('vertical_key', { ascending: true, nullsFirst: false })
        .order('training_type', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;

      // Parse JSONB arrays
      return (data || []).map(row => ({
        ...row,
        why_priority: Array.isArray(row.why_priority) ? row.why_priority : [],
        pain_points: Array.isArray(row.pain_points) ? row.pain_points : [],
        why_phone_ai_fits: Array.isArray(row.why_phone_ai_fits) ? row.why_phone_ai_fits : [],
        where_to_find: Array.isArray(row.where_to_find) ? row.where_to_find : [],
      })) as TrainingLibraryEntry[];
    },
  });

  // Create a new training entry
  const createEntry = useMutation({
    mutationFn: async (entry: Omit<TrainingLibraryEntry, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('training_library')
        .insert([entry])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Training entry created');
      queryClient.invalidateQueries({ queryKey: ['training-library'] });
    },
    onError: (error) => {
      toast.error('Failed to create entry', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Update an existing training entry
  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingLibraryEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_library')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Training entry updated');
      queryClient.invalidateQueries({ queryKey: ['training-library'] });
    },
    onError: (error) => {
      toast.error('Failed to update entry', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Delete a training entry
  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_library')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Training entry deleted');
      queryClient.invalidateQueries({ queryKey: ['training-library'] });
    },
    onError: (error) => {
      toast.error('Failed to delete entry', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Toggle active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('training_library')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['training-library'] });
    },
    onError: (error) => {
      toast.error('Failed to update status', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  return {
    entries: entries || [],
    isLoading,
    error,
    refetch,
    createEntry,
    updateEntry,
    deleteEntry,
    toggleActive,
  };
}
