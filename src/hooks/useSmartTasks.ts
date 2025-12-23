import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SmartTask {
  id: string;
  name: string;
  description: string | null;
  task_type: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  related_to_id: string | null;
  related_to_type: string | null;
  related_to_name: string | null;
  assigned_to: string | null;
  created_by: string | null;
  is_auto_generated: boolean | null;
  ai_reasoning: string | null;
  estimated_duration_minutes: number | null;
  reminder_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  task_type: string;
  default_priority: string;
  default_duration_minutes: number | null;
  trigger_conditions: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  byPriority: Record<string, number>;
  aiGenerated: number;
}

// Fetch all tasks with optional filters
export function useSmartTasks(filters?: {
  status?: string;
  priority?: string;
  relatedToId?: string;
  dueSoon?: boolean;
}) {
  return useQuery({
    queryKey: ['smart-tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.relatedToId) {
        query = query.eq('related_to_id', filters.relatedToId);
      }
      if (filters?.dueSoon) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        query = query.lte('due_date', tomorrow.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SmartTask[];
    },
  });
}

// Fetch task templates
export function useTaskTemplates() {
  return useQuery({
    queryKey: ['task-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as TaskTemplate[];
    },
  });
}

// Get task statistics
export function useTaskStats() {
  return useQuery({
    queryKey: ['task-stats'],
    queryFn: async () => {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, status, priority, is_auto_generated, due_date');

      if (error) throw error;

      const now = new Date();
      const stats: TaskStats = {
        total: tasks?.length || 0,
        pending: 0,
        completed: 0,
        overdue: 0,
        byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
        aiGenerated: 0,
      };

      for (const task of tasks || []) {
        if (task.status === 'completed') stats.completed++;
        else if (task.status === 'pending') stats.pending++;
        
        if (task.due_date && new Date(task.due_date) < now && task.status !== 'completed') {
          stats.overdue++;
        }
        
        if (task.priority) {
          stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
        }
        
        if (task.is_auto_generated) stats.aiGenerated++;
      }

      return stats;
    },
  });
}

// Create a task
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: Partial<SmartTask>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          name: task.name,
          description: task.description,
          task_type: task.task_type || 'custom',
          priority: task.priority || 'medium',
          status: 'pending',
          due_date: task.due_date,
          related_to_id: task.related_to_id,
          related_to_type: task.related_to_type,
          related_to_name: task.related_to_name,
          assigned_to: task.assigned_to,
          estimated_duration_minutes: task.estimated_duration_minutes,
          reminder_time: task.reminder_time,
          is_auto_generated: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Update a task
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SmartTask> }) => {
      const updateData: any = { ...updates };
      
      // If completing, set completed_at
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Delete a task
export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Generate smart tasks via edge function
export function useGenerateSmartTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (leadId?: string) => {
      const { data, error } = await supabase.functions.invoke('generate-smart-tasks', {
        body: { leadId, runForAll: !leadId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Snooze a task
export function useSnoozeTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, hours }: { id: string; hours: number }) => {
      const newDueDate = new Date();
      newDueDate.setTime(newDueDate.getTime() + hours * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('tasks')
        .update({ due_date: newDueDate.toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Utility functions
export function getTaskTypeIcon(type: string | null): string {
  const icons: Record<string, string> = {
    call: '📞',
    email: '📧',
    demo: '🎥',
    follow_up: '🔄',
    meeting: '📅',
    administrative: '📋',
    custom: '✏️',
  };
  return icons[type || 'custom'] || '📌';
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'text-red-500';
    case 'high': return 'text-orange-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-green-500';
    default: return 'text-muted-foreground';
  }
}

export function getPriorityBadgeVariant(priority: string): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'default';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
}

export function isTaskOverdue(task: SmartTask): boolean {
  if (!task.due_date || task.status === 'completed') return false;
  return new Date(task.due_date) < new Date();
}

export function isTaskDueToday(task: SmartTask): boolean {
  if (!task.due_date) return false;
  const today = new Date();
  const dueDate = new Date(task.due_date);
  return dueDate.toDateString() === today.toDateString();
}

export function groupTasksByPriority(tasks: SmartTask[]): Record<string, SmartTask[]> {
  const groups: Record<string, SmartTask[]> = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
  };

  for (const task of tasks) {
    if (task.status !== 'completed') {
      const priority = task.priority || 'medium';
      if (groups[priority]) {
        groups[priority].push(task);
      }
    }
  }

  return groups;
}
