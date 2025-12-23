import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConsentRecord {
  id: string;
  lead_id: string | null;
  email: string;
  consent_type: string;
  consent_given: boolean;
  consent_method: string;
  ip_address: string | null;
  user_agent: string | null;
  consent_text: string;
  granted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataRequest {
  id: string;
  request_type: string;
  email: string;
  lead_id: string | null;
  status: string;
  request_details: Record<string, unknown>;
  requested_by: string;
  verified: boolean;
  verification_token: string | null;
  verification_sent_at: string | null;
  verified_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  rejection_reason: string | null;
  export_file_url: string | null;
  created_at: string;
}

export interface DataRetentionPolicy {
  id: string;
  data_type: string;
  retention_days: number;
  applies_to_status: string[] | null;
  auto_delete: boolean;
  anonymize_instead: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  id: string;
  organization_id: string | null;
  gdpr_enabled: boolean;
  ccpa_enabled: boolean;
  require_explicit_consent: boolean;
  cookie_banner_enabled: boolean;
  cookie_banner_text: string | null;
  privacy_policy_url: string | null;
  dpo_name: string | null;
  dpo_email: string | null;
  data_retention_days: number;
  auto_delete_inactive_leads: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAuditLog {
  id: string;
  event_type: string;
  lead_id: string | null;
  user_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  legal_basis: string | null;
  created_at: string;
}

// Consent Records Hooks
export function useConsentRecords(email?: string) {
  return useQuery({
    queryKey: ['consent-records', email],
    queryFn: async () => {
      let query = supabase
        .from('consent_records')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (email) {
        query = query.eq('email', email);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ConsentRecord[];
    },
  });
}

export function useCreateConsentRecord() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: {
      email: string;
      consent_type: string;
      consent_text: string;
      consent_given?: boolean;
      consent_method?: string;
      lead_id?: string | null;
      ip_address?: string | null;
      user_agent?: string | null;
      granted_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('consent_records')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent-records'] });
      toast.success('Consent record created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create consent record: ' + error.message);
    },
  });
}

export function useRevokeConsent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('consent_records')
        .update({ consent_given: false, revoked_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent-records'] });
      toast.success('Consent revoked');
    },
    onError: (error: Error) => {
      toast.error('Failed to revoke consent: ' + error.message);
    },
  });
}

// Data Requests Hooks
export function useDataRequests(status?: string) {
  return useQuery({
    queryKey: ['data-requests', status],
    queryFn: async () => {
      let query = supabase
        .from('data_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DataRequest[];
    },
  });
}

export function useCreateDataRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: {
      request_type: string;
      email: string;
      requested_by: string;
      request_details?: Record<string, unknown>;
      lead_id?: string | null;
    }) => {
      const verificationToken = crypto.randomUUID();
      const { data, error } = await supabase
        .from('data_requests')
        .insert({
          request_type: request.request_type,
          email: request.email,
          requested_by: request.requested_by,
          request_details: request.request_details || {},
          lead_id: request.lead_id || null,
          verification_token: verificationToken,
          verification_sent_at: new Date().toISOString(),
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-requests'] });
      toast.success('Data request submitted. Please check your email for verification.');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit request: ' + error.message);
    },
  });
}

export function useUpdateDataRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: {
      status?: string;
      completed_at?: string | null;
      completed_by?: string | null;
      rejection_reason?: string | null;
      export_file_url?: string | null;
      verified?: boolean;
      verified_at?: string | null;
    } }) => {
      const { data, error } = await supabase
        .from('data_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-requests'] });
      toast.success('Request updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update request: ' + error.message);
    },
  });
}

// Data Retention Policies Hooks
export function useDataRetentionPolicies() {
  return useQuery({
    queryKey: ['data-retention-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_retention_policies')
        .select('*')
        .order('data_type');
      if (error) throw error;
      return data as DataRetentionPolicy[];
    },
  });
}

export function useUpdateRetentionPolicy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DataRetentionPolicy> }) => {
      const { data, error } = await supabase
        .from('data_retention_policies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-retention-policies'] });
      toast.success('Policy updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update policy: ' + error.message);
    },
  });
}

// Privacy Settings Hooks
export function usePrivacySettings() {
  return useQuery({
    queryKey: ['privacy-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PrivacySettings | null;
    },
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<PrivacySettings>) => {
      const { data: existing } = await supabase
        .from('privacy_settings')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from('privacy_settings')
          .update(settings)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('privacy_settings')
          .insert(settings)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] });
      toast.success('Privacy settings saved');
    },
    onError: (error: Error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });
}

// Compliance Audit Log Hooks
export function useComplianceAuditLog(filters?: { eventType?: string; days?: number }) {
  return useQuery({
    queryKey: ['compliance-audit-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('compliance_audit_log')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      
      if (filters?.days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - filters.days);
        query = query.gte('created_at', startDate.toISOString());
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as ComplianceAuditLog[];
    },
  });
}

export function useLogComplianceEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: {
      event_type: string;
      lead_id?: string | null;
      user_id?: string | null;
      details?: Record<string, unknown>;
      ip_address?: string | null;
      legal_basis?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('compliance_audit_log')
        .insert({
          event_type: event.event_type,
          lead_id: event.lead_id || null,
          user_id: event.user_id || null,
          details: event.details || {},
          ip_address: event.ip_address || null,
          legal_basis: event.legal_basis || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-audit-log'] });
    },
  });
}

// Consent Types
export const CONSENT_TYPES = [
  { value: 'marketing_emails', label: 'Marketing Emails' },
  { value: 'sms', label: 'SMS Communications' },
  { value: 'phone_calls', label: 'Phone Calls' },
  { value: 'data_processing', label: 'Data Processing' },
  { value: 'third_party_sharing', label: 'Third-Party Sharing' },
];

export const CONSENT_METHODS = [
  { value: 'explicit', label: 'Explicit Opt-In' },
  { value: 'web_form', label: 'Web Form' },
  { value: 'email_reply', label: 'Email Reply' },
  { value: 'verbal', label: 'Verbal Consent' },
  { value: 'implied', label: 'Implied Consent' },
];

export const REQUEST_TYPES = [
  { value: 'export', label: 'Export My Data', icon: '📥', description: 'Download a copy of all your data' },
  { value: 'deletion', label: 'Delete My Data', icon: '🗑️', description: 'Permanently remove all your data' },
  { value: 'correction', label: 'Correct My Data', icon: '✏️', description: 'Fix inaccurate information' },
  { value: 'opt_out', label: 'Opt Out', icon: '🚫', description: 'Stop marketing communications' },
];

export const REQUEST_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export const EVENT_TYPE_ICONS: Record<string, string> = {
  consent_given: '✅',
  consent_revoked: '❌',
  data_exported: '📥',
  data_deleted: '🗑️',
  access_granted: '🔓',
  data_corrected: '✏️',
  opt_out: '🚫',
};
