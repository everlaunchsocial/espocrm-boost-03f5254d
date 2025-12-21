import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Suggestion {
  id: string;
  suggestion_text: string;
  context: string | null;
  category: string | null;
  created_at: string;
}

export function useSuggestionLog() {
  const queryClient = useQueryClient();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['suggestion-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suggestion_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Suggestion[];
    },
  });

  const logSuggestion = useMutation({
    mutationFn: async ({ 
      suggestionText, 
      context, 
      category 
    }: { 
      suggestionText: string; 
      context?: string; 
      category?: string;
    }) => {
      const { error } = await supabase
        .from('suggestion_log')
        .insert({
          suggestion_text: suggestionText,
          context: context || null,
          category: category || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestion-log'] });
    },
  });

  const clearLog = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('suggestion_log')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestion-log'] });
    },
  });

  const exportForChatGPT = () => {
    if (suggestions.length === 0) return '';
    
    const lines = suggestions.map((s, i) => {
      const parts = [`${i + 1}. ${s.suggestion_text}`];
      if (s.category) parts.push(`   Category: ${s.category}`);
      if (s.context) parts.push(`   Context: ${s.context}`);
      return parts.join('\n');
    });

    return `Feature Suggestions Log (${suggestions.length} items)\n${'='.repeat(50)}\n\n${lines.join('\n\n')}`;
  };

  return {
    suggestions,
    isLoading,
    logSuggestion: logSuggestion.mutate,
    clearLog: clearLog.mutate,
    exportForChatGPT,
    isClearing: clearLog.isPending,
  };
}
