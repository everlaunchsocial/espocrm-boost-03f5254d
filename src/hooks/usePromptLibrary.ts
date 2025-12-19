import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PromptChannel = 'phone' | 'web_voice' | 'chat' | 'support' | 'universal';
export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  use_case: string;
  prompt_content: string;
  variables: string[];
  version: number;
  is_active: boolean;
  parent_version_id: string | null;
  research_notes: string | null;
  channel: PromptChannel;
  sync_status: SyncStatus;
  deployed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CHANNEL_LABELS: Record<PromptChannel, string> = {
  phone: 'VAPI Phone',
  web_voice: 'Web Voice',
  chat: 'Demo Chat',
  support: 'Support Chat',
  universal: 'All Channels',
};

export type UseCase = 'system_prompt' | 'greeting' | 'lead_capture' | 'faq' | 'escalation' | 'wrap_up';

export const USE_CASE_LABELS: Record<UseCase, string> = {
  system_prompt: 'System Prompt',
  greeting: 'Greeting',
  lead_capture: 'Lead Capture',
  faq: 'FAQ Handling',
  escalation: 'Escalation',
  wrap_up: 'Wrap Up',
};

export function usePromptLibrary() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<PromptChannel | null>(null);
  const { toast } = useToast();

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .order('category')
        .order('use_case')
        .order('version', { ascending: false });

      if (error) throw error;
      setPrompts((data || []) as PromptTemplate[]);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast({
        title: 'Error loading prompts',
        description: 'Failed to load prompt templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const createPrompt = async (prompt: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .insert(prompt)
        .select()
        .single();

      if (error) throw error;
      await fetchPrompts();
      toast({ title: 'Prompt created', description: `Created "${prompt.name}"` });
      return data as PromptTemplate;
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast({
        title: 'Error creating prompt',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updatePrompt = async (id: string, updates: Partial<PromptTemplate>) => {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchPrompts();
      toast({ title: 'Prompt updated' });
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast({
        title: 'Error updating prompt',
        variant: 'destructive',
      });
    }
  };

  const createNewVersion = async (originalPrompt: PromptTemplate, newContent: string, researchNotes?: string) => {
    // Deactivate the old version
    await supabase
      .from('prompt_templates')
      .update({ is_active: false })
      .eq('id', originalPrompt.id);

    // Create new version
    return createPrompt({
      name: originalPrompt.name,
      category: originalPrompt.category,
      use_case: originalPrompt.use_case,
      prompt_content: newContent,
      variables: originalPrompt.variables,
      version: originalPrompt.version + 1,
      is_active: true,
      parent_version_id: originalPrompt.id,
      research_notes: researchNotes || originalPrompt.research_notes,
      channel: originalPrompt.channel,
      sync_status: 'pending',
      deployed_at: null,
    });
  };

  const deletePrompt = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPrompts();
      toast({ title: 'Prompt deleted' });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: 'Error deleting prompt',
        variant: 'destructive',
      });
    }
  };

  // Filter prompts based on search, category, and channel
  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch = !searchQuery || 
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.prompt_content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || prompt.category === selectedCategory;
    const matchesChannel = !selectedChannel || prompt.channel === selectedChannel;
    
    return matchesSearch && matchesCategory && matchesChannel;
  });

  // Group prompts by category
  const promptsByCategory = filteredPrompts.reduce((acc, prompt) => {
    const cat = prompt.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(prompt);
    return acc;
  }, {} as Record<string, PromptTemplate[]>);

  // Get unique categories
  const categories = [...new Set(prompts.map((p) => p.category))];
  
  // Get unique channels that are in use
  const channels = [...new Set(prompts.map((p) => p.channel))] as PromptChannel[];

  return {
    prompts,
    filteredPrompts,
    promptsByCategory,
    categories,
    channels,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedChannel,
    setSelectedChannel,
    createPrompt,
    updatePrompt,
    createNewVersion,
    deletePrompt,
    refetch: fetchPrompts,
  };
}
