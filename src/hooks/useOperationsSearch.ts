import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SearchScope = 'all' | 'documents' | 'brain_notes' | 'projects';

export interface SearchResult {
  result_type: string;
  result_id: string;
  title: string;
  snippet: string;
  created_at: string;
  rank: number;
}

export function useOperationsSearch() {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [isSearching, setIsSearching] = useState(false);

  const { data: results = [], isLoading, refetch } = useQuery({
    queryKey: ['operations-search', query, scope],
    queryFn: async () => {
      if (!query.trim() || query.trim().length < 2) return [];
      
      const { data, error } = await supabase.rpc('search_operations', {
        p_query: query.trim(),
        p_scope: scope
      });
      
      if (error) throw error;
      return (data || []) as SearchResult[];
    },
    enabled: query.trim().length >= 2,
    staleTime: 30000,
  });

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setIsSearching(newQuery.trim().length >= 2);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setIsSearching(false);
  }, []);

  return {
    query,
    scope,
    setScope,
    results,
    isLoading,
    isSearching,
    search,
    clearSearch,
  };
}
