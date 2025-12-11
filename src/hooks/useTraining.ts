import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAffiliate } from './useCurrentAffiliate';
import { toast } from 'sonner';

export interface TrainingCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface TrainingModule {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  content_type: 'video' | 'article' | 'pdf' | 'quiz';
  content_url: string | null;
  content_body: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  sort_order: number;
  is_published: boolean;
  is_required: boolean;
}

export interface TrainingProgress {
  id: string;
  affiliate_id: string;
  module_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  last_position_seconds: number;
}

export function useTraining() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<TrainingProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (affiliateLoading) return;
    fetchTrainingData();
  }, [affiliateId, affiliateLoading]);

  async function fetchTrainingData() {
    setIsLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('training_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (catError) throw catError;
      setCategories(categoriesData || []);

      // Fetch published modules
      const { data: modulesData, error: modError } = await supabase
        .from('training_modules')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (modError) throw modError;
      setModules((modulesData || []) as TrainingModule[]);

      // Fetch progress if affiliate is logged in
      if (affiliateId) {
        const { data: progressData, error: progError } = await supabase
          .from('training_progress')
          .select('*')
          .eq('affiliate_id', affiliateId);

        if (progError) throw progError;
        setProgress((progressData || []) as TrainingProgress[]);
      }
    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function getModuleProgress(moduleId: string): TrainingProgress | undefined {
    return progress.find(p => p.module_id === moduleId);
  }

  function getModulesByCategory(categoryId: string): TrainingModule[] {
    return modules.filter(m => m.category_id === categoryId);
  }

  function getCategoryProgress(categoryId: string): { completed: number; total: number; percent: number } {
    const categoryModules = getModulesByCategory(categoryId);
    const completed = categoryModules.filter(m => {
      const prog = getModuleProgress(m.id);
      return prog?.status === 'completed';
    }).length;
    const total = categoryModules.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  }

  async function startModule(moduleId: string) {
    if (!affiliateId) return;

    const existing = getModuleProgress(moduleId);
    if (existing) {
      // Already started, just update UI
      return existing;
    }

    try {
      const { data, error } = await supabase
        .from('training_progress')
        .insert({
          affiliate_id: affiliateId,
          module_id: moduleId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          progress_percent: 0,
        })
        .select()
        .single();

      if (error) throw error;
      setProgress(prev => [...prev, data as TrainingProgress]);
      return data as TrainingProgress;
    } catch (error) {
      console.error('Error starting module:', error);
      toast.error('Failed to start module');
    }
  }

  async function updateProgress(moduleId: string, progressPercent: number, positionSeconds?: number) {
    if (!affiliateId) return;

    const existing = getModuleProgress(moduleId);
    const isCompleted = progressPercent >= 100;

    try {
      if (existing) {
        const { data, error } = await supabase
          .from('training_progress')
          .update({
            progress_percent: progressPercent,
            status: isCompleted ? 'completed' : 'in_progress',
            completed_at: isCompleted ? new Date().toISOString() : null,
            last_position_seconds: positionSeconds ?? existing.last_position_seconds,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        setProgress(prev => prev.map(p => p.id === existing.id ? (data as TrainingProgress) : p));
      } else {
        await startModule(moduleId);
        // Recursively call to update the new record
        await updateProgress(moduleId, progressPercent, positionSeconds);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  async function markComplete(moduleId: string) {
    await updateProgress(moduleId, 100);
    toast.success('Module completed!');
  }

  const totalModules = modules.length;
  const completedModules = progress.filter(p => p.status === 'completed').length;
  const overallProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return {
    categories,
    modules,
    progress,
    isLoading,
    getModuleProgress,
    getModulesByCategory,
    getCategoryProgress,
    startModule,
    updateProgress,
    markComplete,
    totalModules,
    completedModules,
    overallProgress,
    refetch: fetchTrainingData,
  };
}
