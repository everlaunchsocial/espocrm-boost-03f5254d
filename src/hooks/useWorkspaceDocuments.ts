import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkspaceDocument {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  file_url: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkspaceDocuments() {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['workspace-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WorkspaceDocument[];
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, description, tags }: { file: File; description?: string; tags?: string[] }) => {
      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const storagePath = `documents/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, file);
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(storagePath);

      // Insert document record
      const { error: insertError } = await supabase
        .from('workspace_documents')
        .insert({
          name: file.name,
          description: description || null,
          tags: tags || [],
          file_url: urlData.publicUrl,
          storage_path: storagePath,
          file_type: file.type,
          file_size: file.size,
        });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      toast.success('Document uploaded');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: WorkspaceDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('assets')
        .remove([doc.storage_path]);
      
      if (storageError) console.error('Storage deletion failed:', storageError);

      // Delete record
      const { error: deleteError } = await supabase
        .from('workspace_documents')
        .delete()
        .eq('id', doc.id);
      
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      toast.success('Document deleted');
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkspaceDocument> & { id: string }) => {
      const { error } = await supabase
        .from('workspace_documents')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      toast.success('Document updated');
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  return {
    documents,
    isLoading,
    uploadDocument,
    deleteDocument,
    updateDocument,
  };
}
