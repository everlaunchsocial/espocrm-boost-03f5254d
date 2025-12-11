import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

// Customer training - read-only, no progress tracking (customers view content but progress is not persisted)
export function useCustomerTraining() {
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrainingData();
  }, []);

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

      // Fetch published modules (customer-relevant ones)
      const { data: modulesData, error: modError } = await supabase
        .from('training_modules')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (modError) throw modError;
      setModules((modulesData || []) as TrainingModule[]);
    } catch (error) {
      console.error('Error fetching training data:', error);
      toast.error('Failed to load training content');
    } finally {
      setIsLoading(false);
    }
  }

  function getModulesByCategory(categoryId: string): TrainingModule[] {
    return modules.filter(m => m.category_id === categoryId);
  }

  const totalModules = modules.length;

  return {
    categories,
    modules,
    isLoading,
    getModulesByCategory,
    totalModules,
    refetch: fetchTrainingData,
  };
}
