import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LeadTeamNote {
  id: string;
  lead_id: string;
  note_text: string;
  note_type: string;
  visibility: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useLeadTeamNotes(leadId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['lead-team-notes', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_team_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeadTeamNote[];
    },
    enabled: !!leadId,
  });

  const addNote = useMutation({
    mutationFn: async (noteText: string) => {
      if (!leadId) throw new Error('No lead ID');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('lead_team_notes')
        .insert({
          lead_id: leadId,
          note_text: noteText.trim(),
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-team-notes', leadId] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('lead_team_notes')
        .delete()
        .eq('id', noteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-team-notes', leadId] });
    },
  });

  return { notes, isLoading, addNote, deleteNote };
}
