import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: 'nurture' | 'reactivation' | 'onboarding' | 'custom';
  status: 'draft' | 'active' | 'paused' | 'completed';
  affiliate_id: string | null;
  target_criteria: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignStep {
  id: string;
  campaign_id: string;
  step_number: number;
  channel: 'email' | 'sms' | 'call_reminder' | 'task';
  delay_days: number;
  delay_hours: number;
  message_template: string;
  subject_template: string | null;
  conditions: Record<string, unknown> | null;
  created_at: string;
}

export interface CampaignEnrollment {
  id: string;
  campaign_id: string;
  lead_id: string;
  current_step: number;
  status: 'active' | 'completed' | 'stopped' | 'failed';
  enrolled_at: string;
  completed_at: string | null;
  stopped_at: string | null;
  stopped_reason: string | null;
}

export interface CampaignExecution {
  id: string;
  enrollment_id: string;
  step_id: string;
  scheduled_for: string;
  executed_at: string | null;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  error_message: string | null;
}

export interface CampaignWithSteps extends Campaign {
  campaign_steps: CampaignStep[];
}

export interface CampaignWithStats extends Campaign {
  enrollments_count: number;
  active_count: number;
  completed_count: number;
}

// Pre-built campaign templates
export const CAMPAIGN_TEMPLATES = {
  NEW_LEAD_NURTURE: {
    name: 'New Lead Nurture',
    description: 'Welcome new leads and guide them through the demo process',
    campaign_type: 'nurture' as const,
    steps: [
      { step_number: 1, channel: 'email' as const, delay_days: 0, delay_hours: 0, subject_template: 'Welcome {{first_name}}! Your AI Demo Awaits', message_template: '<h2>Hi {{first_name}},</h2><p>Thanks for your interest! We\'ve prepared a personalized demo just for {{company}}.</p><p>Click below to see how AI can transform your business.</p>' },
      { step_number: 2, channel: 'email' as const, delay_days: 2, delay_hours: 0, subject_template: 'Did you watch the demo?', message_template: '<h2>Hi {{first_name}},</h2><p>Just checking in - have you had a chance to watch your personalized demo?</p><p>Most of our clients are amazed by the possibilities in just 5 minutes.</p>' },
      { step_number: 3, channel: 'sms' as const, delay_days: 4, delay_hours: 0, subject_template: null, message_template: 'Hi {{first_name}}, quick question - did you get a chance to check out the demo we sent? Reply if you need any help!' },
      { step_number: 4, channel: 'call_reminder' as const, delay_days: 7, delay_hours: 0, subject_template: null, message_template: 'Schedule a follow-up call with {{first_name}} from {{company}} to discuss the demo' },
      { step_number: 5, channel: 'email' as const, delay_days: 9, delay_hours: 0, subject_template: 'How {{company}} could save 40% on support', message_template: '<h2>{{first_name}}, see how businesses like yours are winning</h2><p>Companies in your industry are seeing incredible results with our AI solution.</p>' },
      { step_number: 6, channel: 'email' as const, delay_days: 11, delay_hours: 0, subject_template: 'Special offer for {{company}}', message_template: '<h2>{{first_name}}, we have something special for you</h2><p>For a limited time, get 20% off your first 3 months when you sign up this week.</p>' },
      { step_number: 7, channel: 'email' as const, delay_days: 14, delay_hours: 0, subject_template: 'Last chance to connect', message_template: '<h2>Hi {{first_name}},</h2><p>This is our last automated message - we don\'t want to bother you!</p><p>If you\'re ever ready to explore AI for {{company}}, just reply to this email.</p>' },
    ],
  },
  DEMO_REACTIVATION: {
    name: 'Demo Reactivation',
    description: 'Re-engage leads who viewed the demo but haven\'t responded',
    campaign_type: 'reactivation' as const,
    steps: [
      { step_number: 1, channel: 'email' as const, delay_days: 0, delay_hours: 0, subject_template: 'We noticed you watched the demo!', message_template: '<h2>Great to see you\'re interested, {{first_name}}!</h2><p>We noticed you checked out the demo. What did you think?</p><p>Have any questions about how it would work for {{company}}?</p>' },
      { step_number: 2, channel: 'sms' as const, delay_days: 3, delay_hours: 0, subject_template: null, message_template: 'Hi {{first_name}}, any questions about what you saw in the demo? Happy to help!' },
      { step_number: 3, channel: 'email' as const, delay_days: 5, delay_hours: 0, subject_template: 'Your questions, answered', message_template: '<h2>Common questions from business owners like you</h2><p>Here are the top questions we get from {{company}}-type businesses:</p><ul><li>How long does setup take? (Usually 1 week)</li><li>What about my existing phone system? (We integrate seamlessly)</li></ul>' },
      { step_number: 4, channel: 'call_reminder' as const, delay_days: 8, delay_hours: 0, subject_template: null, message_template: 'Personal outreach call to {{first_name}} - they watched the demo but haven\'t responded' },
      { step_number: 5, channel: 'email' as const, delay_days: 10, delay_hours: 0, subject_template: 'Final check-in', message_template: '<h2>One last thing, {{first_name}}</h2><p>We don\'t want to be a pest, so this is our last message.</p><p>When you\'re ready, we\'ll be here!</p>' },
    ],
  },
  COLD_LEAD_REACTIVATION: {
    name: 'Cold Lead Reactivation',
    description: 'Attempt to re-engage leads who have gone cold',
    campaign_type: 'reactivation' as const,
    steps: [
      { step_number: 1, channel: 'email' as const, delay_days: 0, delay_hours: 0, subject_template: 'It\'s been a while, {{first_name}}', message_template: '<h2>Hi {{first_name}},</h2><p>It\'s been a little while since we connected. We\'ve been busy making our product even better!</p><p>Ready to take another look?</p>' },
      { step_number: 2, channel: 'sms' as const, delay_days: 3, delay_hours: 0, subject_template: null, message_template: 'Hi {{first_name}}, still interested in AI for {{company}}? We have some exciting updates!' },
      { step_number: 3, channel: 'email' as const, delay_days: 6, delay_hours: 0, subject_template: 'New features you\'ll love', message_template: '<h2>{{first_name}}, check out what\'s new</h2><p>Since we last talked, we\'ve added some amazing new features that {{company}} would love.</p>' },
      { step_number: 4, channel: 'call_reminder' as const, delay_days: 8, delay_hours: 0, subject_template: null, message_template: 'Final reactivation attempt - call {{first_name}} at {{company}}' },
    ],
  },
};

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });
}

export function useCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_steps (*)
        `)
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data as CampaignWithSteps;
    },
    enabled: !!campaignId,
  });
}

export function useCampaignStats() {
  return useQuery({
    queryKey: ['campaign-stats'],
    queryFn: async () => {
      const { data: campaigns, error: campError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campError) throw campError;

      const { data: enrollments, error: enrollError } = await supabase
        .from('campaign_enrollments')
        .select('campaign_id, status');

      if (enrollError) throw enrollError;

      // Calculate stats per campaign
      const statsMap = new Map<string, { total: number; active: number; completed: number }>();
      
      for (const enrollment of (enrollments || [])) {
        const stats = statsMap.get(enrollment.campaign_id) || { total: 0, active: 0, completed: 0 };
        stats.total++;
        if (enrollment.status === 'active') stats.active++;
        if (enrollment.status === 'completed') stats.completed++;
        statsMap.set(enrollment.campaign_id, stats);
      }

      return (campaigns || []).map(campaign => ({
        ...campaign,
        enrollments_count: statsMap.get(campaign.id)?.total || 0,
        active_count: statsMap.get(campaign.id)?.active || 0,
        completed_count: statsMap.get(campaign.id)?.completed || 0,
      })) as CampaignWithStats[];
    },
  });
}

export function useCampaignEnrollments(campaignId?: string, leadId?: string) {
  return useQuery({
    queryKey: ['campaign-enrollments', campaignId, leadId],
    queryFn: async () => {
      let query = supabase
        .from('campaign_enrollments')
        .select(`
          *,
          campaigns (name, campaign_type, status),
          leads (first_name, last_name, email, company)
        `);

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query.order('enrolled_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!(campaignId || leadId),
  });
}

export function useLeadEnrollments(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-enrollments', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('campaign_enrollments')
        .select(`
          *,
          campaigns (id, name, campaign_type, status)
        `)
        .eq('lead_id', leadId)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: { 
      name: string; 
      description?: string; 
      campaign_type: string;
      status?: string;
      target_criteria?: object;
      steps?: Array<{
        step_number: number;
        channel: string;
        delay_days: number;
        delay_hours: number;
        message_template: string;
        subject_template?: string | null;
        conditions?: object | null;
      }>;
    }) => {
      const { steps, ...campaignData } = campaign;

      // Create campaign - use type assertion for Json compatibility
      const insertData = {
        name: campaignData.name,
        description: campaignData.description || null,
        campaign_type: campaignData.campaign_type,
        status: campaignData.status || 'draft',
        target_criteria: (campaignData.target_criteria || {}) as unknown,
      };

      const { data: newCampaign, error: campError } = await supabase
        .from('campaigns')
        .insert(insertData as any)
        .select()
        .single();

      if (campError) throw campError;

      // Create steps if provided
      if (steps && steps.length > 0) {
        const stepsToInsert = steps.map(step => ({
          campaign_id: newCampaign.id,
          step_number: step.step_number,
          channel: step.channel,
          delay_days: step.delay_days,
          delay_hours: step.delay_hours,
          message_template: step.message_template,
          subject_template: step.subject_template || null,
          conditions: (step.conditions || null) as unknown,
        }));

        const { error: stepsError } = await supabase
          .from('campaign_steps')
          .insert(stepsToInsert as any);

        if (stepsError) throw stepsError;
      }

      return newCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description, status }: { 
      id: string; 
      name?: string;
      description?: string;
      status?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = status;

      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', data.id] });
      toast.success('Campaign updated');
    },
  });
}

export function useEnrollLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, leadId }: { campaignId: string; leadId: string }) => {
      // Check if lead is already enrolled in any active campaign
      const { data: existing } = await supabase
        .from('campaign_enrollments')
        .select('id, campaigns(name)')
        .eq('lead_id', leadId)
        .eq('status', 'active')
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error(`Lead is already enrolled in "${(existing[0] as any).campaigns?.name}"`);
      }

      // Create enrollment
      const { data: enrollment, error: enrollError } = await supabase
        .from('campaign_enrollments')
        .insert({
          campaign_id: campaignId,
          lead_id: leadId,
          current_step: 1,
          status: 'active',
        })
        .select()
        .single();

      if (enrollError) throw enrollError;

      // Get first step
      const { data: firstStep } = await supabase
        .from('campaign_steps')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('step_number', 1)
        .single();

      if (firstStep) {
        // Schedule first execution
        const scheduledFor = new Date();
        scheduledFor.setDate(scheduledFor.getDate() + (firstStep.delay_days || 0));
        scheduledFor.setHours(scheduledFor.getHours() + (firstStep.delay_hours || 0));

        await supabase
          .from('campaign_executions')
          .insert({
            enrollment_id: enrollment.id,
            step_id: firstStep.id,
            scheduled_for: scheduledFor.toISOString(),
            status: 'pending',
          });
      }

      return enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['lead-enrollments'] });
      toast.success('Lead enrolled in campaign');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useStopEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId, reason }: { enrollmentId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('campaign_enrollments')
        .update({
          status: 'stopped',
          stopped_at: new Date().toISOString(),
          stopped_reason: reason || 'Manually stopped',
        })
        .eq('id', enrollmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['lead-enrollments'] });
      toast.success('Enrollment stopped');
    },
  });
}

export function useCreateCampaignFromTemplate() {
  const createCampaign = useCreateCampaign();

  return useMutation({
    mutationFn: async (templateKey: keyof typeof CAMPAIGN_TEMPLATES) => {
      const template = CAMPAIGN_TEMPLATES[templateKey];
      
      return createCampaign.mutateAsync({
        name: template.name,
        description: template.description,
        campaign_type: template.campaign_type,
        status: 'draft',
        target_criteria: {},
        steps: template.steps,
      });
    },
  });
}
