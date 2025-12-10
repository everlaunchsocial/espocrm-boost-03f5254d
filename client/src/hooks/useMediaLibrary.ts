import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MediaItem {
  id: string;
  name: string;
  keywords: string[];
  url: string;
  type: 'video' | 'document' | 'image' | 'link';
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const toMediaItem = (row: any): MediaItem => ({
  id: row.id,
  name: row.name,
  keywords: row.keywords || [],
  url: row.url,
  type: row.type,
  description: row.description,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export function useMediaLibrary() {
  return useQuery({
    queryKey: ['media-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toMediaItem);
    },
  });
}

export function useAddMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase.from('media_library').insert({
        name: item.name,
        keywords: item.keywords,
        url: item.url,
        type: item.type,
        description: item.description,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-library'] }),
  });
}

export function useUpdateMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, item }: { id: string; item: Partial<MediaItem> }) => {
      const updateData: any = {};
      if (item.name !== undefined) updateData.name = item.name;
      if (item.keywords !== undefined) updateData.keywords = item.keywords;
      if (item.url !== undefined) updateData.url = item.url;
      if (item.type !== undefined) updateData.type = item.type;
      if (item.description !== undefined) updateData.description = item.description;

      const { error } = await supabase.from('media_library').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-library'] }),
  });
}

export function useDeleteMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('media_library').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-library'] }),
  });
}
