import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface TeamNote {
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

export interface Mention {
  id: string;
  note_id: string;
  mentioned_user_id: string;
  mentioned_by: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface LeadWatcher {
  id: string;
  lead_id: string;
  user_id: string;
  notification_preference: string;
  created_at: string;
}

export interface TeamMessage {
  id: string;
  lead_id: string;
  message_content: string;
  sent_by: string;
  reply_to_message_id: string | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
}

export interface TeamMember {
  user_id: string;
  global_role: string;
  email?: string;
}

// Fetch team members for @mentions
export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_crm_team_members');
      
      if (error) throw error;
      return data as TeamMember[];
    },
  });
}

// Team Notes hooks
export function useTeamNotes(leadId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['team-notes', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_team_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TeamNote[];
    },
    enabled: !!leadId,
  });

  const addNote = useMutation({
    mutationFn: async ({ 
      noteText, 
      noteType = 'internal', 
      visibility = 'team',
      mentions = []
    }: { 
      noteText: string; 
      noteType?: string; 
      visibility?: string;
      mentions?: string[];
    }) => {
      if (!leadId) throw new Error('No lead ID');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('lead_team_notes')
        .insert({
          lead_id: leadId,
          note_text: noteText.trim(),
          note_type: noteType,
          visibility,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Create mentions if any
      if (mentions.length > 0) {
        const mentionInserts = mentions.map(userId => ({
          note_id: data.id,
          mentioned_user_id: userId,
          mentioned_by: user.id,
        }));
        
        await supabase.from('lead_mentions').insert(mentionInserts);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-notes', leadId] });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ noteId, noteText }: { noteId: string; noteText: string }) => {
      const { error } = await supabase
        .from('lead_team_notes')
        .update({ note_text: noteText.trim(), updated_at: new Date().toISOString() })
        .eq('id', noteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-notes', leadId] });
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
      queryClient.invalidateQueries({ queryKey: ['team-notes', leadId] });
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('lead_team_notes')
        .update({ is_pinned: isPinned })
        .eq('id', noteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-notes', leadId] });
    },
  });

  return { notes, isLoading, addNote, updateNote, deleteNote, togglePin };
}

// Mentions hooks
export function useMentions() {
  const queryClient = useQueryClient();

  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ['my-mentions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('lead_mentions')
        .select('*')
        .eq('mentioned_user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Mention[];
    },
  });

  const unreadCount = mentions.filter(m => !m.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (mentionId: string) => {
      const { error } = await supabase
        .from('lead_mentions')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', mentionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-mentions'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('lead_mentions')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('mentioned_user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-mentions'] });
    },
  });

  return { mentions, isLoading, unreadCount, markAsRead, markAllAsRead };
}

// Lead Watchers hooks
export function useLeadWatchers(leadId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: watchers = [], isLoading } = useQuery({
    queryKey: ['lead-watchers', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_watchers')
        .select('*')
        .eq('lead_id', leadId);
      
      if (error) throw error;
      return data as LeadWatcher[];
    },
    enabled: !!leadId,
  });

  const { data: isWatching = false } = useQuery({
    queryKey: ['is-watching', leadId],
    queryFn: async () => {
      if (!leadId) return false;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('lead_watchers')
        .select('id')
        .eq('lead_id', leadId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!leadId,
  });

  const toggleWatch = useMutation({
    mutationFn: async (preference: string = 'all') => {
      if (!leadId) throw new Error('No lead ID');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isWatching) {
        const { error } = await supabase
          .from('lead_watchers')
          .delete()
          .eq('lead_id', leadId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lead_watchers')
          .insert({
            lead_id: leadId,
            user_id: user.id,
            notification_preference: preference,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-watchers', leadId] });
      queryClient.invalidateQueries({ queryKey: ['is-watching', leadId] });
    },
  });

  return { watchers, isLoading, isWatching, toggleWatch };
}

// Team Messages hooks with realtime
export function useTeamMessages(leadId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['team-messages', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_team_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TeamMessage[];
    },
    enabled: !!leadId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`team-messages-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_team_messages',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team-messages', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async ({ content, replyTo }: { content: string; replyTo?: string }) => {
      if (!leadId) throw new Error('No lead ID');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('lead_team_messages')
        .insert({
          lead_id: leadId,
          message_content: content.trim(),
          sent_by: user.id,
          reply_to_message_id: replyTo || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase
        .from('lead_team_messages')
        .update({ 
          message_content: content.trim(), 
          is_edited: true,
          edited_at: new Date().toISOString() 
        })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', leadId] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('lead_team_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', leadId] });
    },
  });

  return { messages, isLoading, sendMessage, editMessage, deleteMessage };
}

// Parse @mentions from text
export function parseMentions(text: string, teamMembers: TeamMember[]): string[] {
  const mentionPattern = /@(\w+)/g;
  const matches = text.match(mentionPattern) || [];
  const mentionedUserIds: string[] = [];

  matches.forEach(match => {
    const username = match.slice(1).toLowerCase();
    const member = teamMembers.find(m => 
      m.email?.toLowerCase().includes(username) || 
      m.user_id.toLowerCase().includes(username)
    );
    if (member) {
      mentionedUserIds.push(member.user_id);
    }
  });

  return mentionedUserIds;
}
