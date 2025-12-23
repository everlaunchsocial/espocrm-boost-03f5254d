import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Document {
  id: string;
  name: string;
  document_type: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number | null;
  related_to_id: string | null;
  related_to_type: string | null;
  related_to_name: string | null;
  status: string;
  uploaded_by: string | null;
  sent_to_email: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signature_request_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  content_template: string;
  merge_fields: Record<string, string>;
  is_global: boolean;
  requires_signature: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentSignature {
  id: string;
  document_id: string;
  signer_email: string;
  signer_name: string;
  signature_data: string | null;
  ip_address: string | null;
  signed_at: string;
  created_at: string;
}

export interface DocumentStats {
  total: number;
  draft: number;
  sent: number;
  viewed: number;
  signed: number;
  declined: number;
  expired: number;
  signatureRate: number;
}

// Fetch all documents
export function useDocuments(filters?: { status?: string; type?: string; leadId?: string }) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('document_type', filters.type);
      }
      if (filters?.leadId) {
        query = query.eq('related_to_id', filters.leadId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
  });
}

// Fetch document templates
export function useDocumentTemplates() {
  return useQuery({
    queryKey: ['document-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as DocumentTemplate[];
    },
  });
}

// Fetch single document with signatures
export function useDocumentDetail(documentId: string | null) {
  return useQuery({
    queryKey: ['document-detail', documentId],
    queryFn: async () => {
      if (!documentId) return null;

      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      const { data: signatures } = await supabase
        .from('document_signatures')
        .select('*')
        .eq('document_id', documentId)
        .order('signed_at', { ascending: false });

      return {
        document: document as Document,
        signatures: (signatures || []) as DocumentSignature[],
      };
    },
    enabled: !!documentId,
  });
}

// Document stats
export function useDocumentStats() {
  return useQuery({
    queryKey: ['document-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('status');

      if (error) throw error;

      const stats: DocumentStats = {
        total: data.length,
        draft: data.filter(d => d.status === 'draft').length,
        sent: data.filter(d => d.status === 'sent').length,
        viewed: data.filter(d => d.status === 'viewed').length,
        signed: data.filter(d => d.status === 'signed').length,
        declined: data.filter(d => d.status === 'declined').length,
        expired: data.filter(d => d.status === 'expired').length,
        signatureRate: 0,
      };

      const sentOrViewed = stats.sent + stats.viewed + stats.signed + stats.declined;
      if (sentOrViewed > 0) {
        stats.signatureRate = Math.round((stats.signed / sentOrViewed) * 100);
      }

      return stats;
    },
  });
}

// Generate document from template
export function useGenerateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      leadId,
      customData,
      sendForSignature,
      recipientEmail,
      expiresInDays,
    }: {
      templateId: string;
      leadId?: string;
      customData?: Record<string, string>;
      sendForSignature?: boolean;
      recipientEmail?: string;
      expiresInDays?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: { templateId, leadId, customData, sendForSignature, recipientEmail, expiresInDays },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      toast.success('Document generated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate document: ${error.message}`);
    },
  });
}

// Upload document
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      documentType,
      relatedToId,
      relatedToType,
      relatedToName,
    }: {
      file: File;
      documentType: string;
      relatedToId?: string;
      relatedToType?: string;
      relatedToName?: string;
    }) => {
      const fileName = `documents/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      const fileType = file.name.split('.').pop() || 'unknown';

      const { data, error } = await supabase
        .from('documents')
        .insert({
          name: file.name,
          document_type: documentType,
          file_url: urlData.publicUrl,
          file_type: fileType,
          file_size_bytes: file.size,
          related_to_id: relatedToId || null,
          related_to_type: relatedToType || null,
          related_to_name: relatedToName || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      toast.success('Document uploaded');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

// Update document status
export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, ...updates }: Partial<Document> & { id: string; status: string }) => {
      const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() };
      
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString();
      } else if (status === 'viewed') {
        updateData.viewed_at = new Date().toISOString();
      } else if (status === 'signed') {
        updateData.signed_at = new Date().toISOString();
      }

      Object.assign(updateData, updates);

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-detail'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      toast.success('Document updated');
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
}

// Add signature to document
export function useSignDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      signerEmail,
      signerName,
      signatureData,
    }: {
      documentId: string;
      signerEmail: string;
      signerName: string;
      signatureData?: string;
    }) => {
      // Add signature record
      const { error: sigError } = await supabase
        .from('document_signatures')
        .insert({
          document_id: documentId,
          signer_email: signerEmail,
          signer_name: signerName,
          signature_data: signatureData || null,
        });

      if (sigError) throw sigError;

      // Update document status
      const { error: docError } = await supabase
        .from('documents')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (docError) throw docError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-detail'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      toast.success('Document signed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Signing failed: ${error.message}`);
    },
  });
}

// Delete document
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      toast.success('Document deleted');
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}

// Utility functions
export function getStatusColor(status: string): string {
  switch (status) {
    case 'draft': return 'text-muted-foreground';
    case 'sent': return 'text-blue-600';
    case 'viewed': return 'text-yellow-600';
    case 'signed': return 'text-green-600';
    case 'declined': return 'text-red-600';
    case 'expired': return 'text-gray-500';
    default: return 'text-muted-foreground';
  }
}

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'signed': return 'default';
    case 'sent':
    case 'viewed': return 'secondary';
    case 'declined':
    case 'expired': return 'destructive';
    default: return 'outline';
  }
}

export function getDocumentTypeIcon(type: string): string {
  switch (type) {
    case 'contract': return '📝';
    case 'proposal': return '📋';
    case 'nda': return '🔒';
    case 'quote': return '💰';
    case 'invoice': return '🧾';
    default: return '📄';
  }
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
