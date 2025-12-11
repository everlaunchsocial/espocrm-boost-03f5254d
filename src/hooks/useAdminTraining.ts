import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrainingCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  content_type: string;
  content_url: string | null;
  content_body: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  is_required: boolean | null;
  is_published: boolean | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export function useAdminTraining() {
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [categoriesRes, modulesRes] = await Promise.all([
        supabase
          .from('training_categories')
          .select('*')
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('name'),
        supabase
          .from('training_modules')
          .select('*')
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('title'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (modulesRes.error) throw modulesRes.error;

      setCategories(categoriesRes.data || []);
      setModules(modulesRes.data || []);
    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createCategory = async (data: { name: string; description?: string | null; icon?: string | null; sort_order?: number | null }) => {
    const { error } = await supabase
      .from('training_categories')
      .insert([data]);
    
    if (error) throw error;
    await fetchData();
  };

  const updateCategory = async (id: string, data: Partial<TrainingCategory>) => {
    const { error } = await supabase
      .from('training_categories')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
    await fetchData();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('training_categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await fetchData();
  };

  const createModule = async (data: { title: string; description?: string | null; category_id?: string | null; content_type?: string; content_url?: string | null; content_body?: string | null; duration_minutes?: number | null; is_required?: boolean | null; is_published?: boolean | null; sort_order?: number | null }) => {
    const { error } = await supabase
      .from('training_modules')
      .insert([data]);
    
    if (error) throw error;
    await fetchData();
  };

  const updateModule = async (id: string, data: Partial<TrainingModule>) => {
    const { error } = await supabase
      .from('training_modules')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
    await fetchData();
  };

  const deleteModule = async (id: string) => {
    const { error } = await supabase
      .from('training_modules')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await fetchData();
  };

  return {
    categories,
    modules,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createModule,
    updateModule,
    deleteModule,
    refetch: fetchData,
  };
}
