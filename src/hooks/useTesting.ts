import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TestStep {
  id: string;
  title: string;
  instruction: string;
  expected: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: TestStep[];
  estimated_duration_minutes: number;
  prerequisites: string[] | null;
  test_credentials: Record<string, any>;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestRun {
  id: string;
  suite_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'in_progress' | 'passed' | 'failed' | 'abandoned';
  tester_user_id: string | null;
  current_step_index: number;
  notes: string | null;
  created_at: string;
  suite?: TestSuite;
}

export interface TestStepCompletion {
  id: string;
  run_id: string;
  step_index: number;
  step_id: string;
  result: 'pass' | 'fail' | 'skip';
  notes: string | null;
  screenshot_url: string | null;
  completed_at: string;
}

export function useTestSuites() {
  return useQuery({
    queryKey: ['test-suites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_suites')
        .select('*')
        .eq('is_active', true)
        .order('position');
      
      if (error) throw error;
      
      // Parse the steps JSON for each suite
      return (data || []).map(suite => ({
        ...suite,
        steps: typeof suite.steps === 'string' ? JSON.parse(suite.steps) : suite.steps,
        test_credentials: typeof suite.test_credentials === 'string' 
          ? JSON.parse(suite.test_credentials) 
          : suite.test_credentials
      })) as TestSuite[];
    }
  });
}

export function useTestRuns() {
  return useQuery({
    queryKey: ['test-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_runs')
        .select(`
          *,
          suite:test_suites(*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return (data || []).map(run => ({
        ...run,
        suite: run.suite ? {
          ...run.suite,
          steps: typeof run.suite.steps === 'string' ? JSON.parse(run.suite.steps) : run.suite.steps,
          test_credentials: typeof run.suite.test_credentials === 'string' 
            ? JSON.parse(run.suite.test_credentials) 
            : run.suite.test_credentials
        } : null
      })) as TestRun[];
    }
  });
}

export function useActiveTestRun() {
  return useQuery({
    queryKey: ['active-test-run'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_runs')
        .select(`
          *,
          suite:test_suites(*)
        `)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        suite: data.suite ? {
          ...data.suite,
          steps: typeof data.suite.steps === 'string' ? JSON.parse(data.suite.steps) : data.suite.steps,
          test_credentials: typeof data.suite.test_credentials === 'string' 
            ? JSON.parse(data.suite.test_credentials) 
            : data.suite.test_credentials
        } : null
      } as TestRun;
    }
  });
}

export function useTestStepCompletions(runId: string | null) {
  return useQuery({
    queryKey: ['test-step-completions', runId],
    queryFn: async () => {
      if (!runId) return [];
      
      const { data, error } = await supabase
        .from('test_step_completions')
        .select('*')
        .eq('run_id', runId)
        .order('step_index');
      
      if (error) throw error;
      return data as TestStepCompletion[];
    },
    enabled: !!runId
  });
}

export function useStartTestRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (suiteId: string) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('test_runs')
        .insert({
          suite_id: suiteId,
          tester_user_id: user.user?.id,
          status: 'in_progress',
          current_step_index: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['active-test-run'] });
    }
  });
}

export function useCompleteTestStep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      runId, 
      stepIndex, 
      stepId, 
      result, 
      notes 
    }: { 
      runId: string; 
      stepIndex: number; 
      stepId: string; 
      result: 'pass' | 'fail' | 'skip';
      notes?: string;
    }) => {
      // Insert step completion
      const { error: stepError } = await supabase
        .from('test_step_completions')
        .insert({
          run_id: runId,
          step_index: stepIndex,
          step_id: stepId,
          result,
          notes
        });
      
      if (stepError) throw stepError;
      
      // Update current step index on run
      const { error: runError } = await supabase
        .from('test_runs')
        .update({ current_step_index: stepIndex + 1 })
        .eq('id', runId);
      
      if (runError) throw runError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-step-completions', variables.runId] });
      queryClient.invalidateQueries({ queryKey: ['active-test-run'] });
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
    }
  });
}

export function useCompleteTestRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      runId, 
      status, 
      notes 
    }: { 
      runId: string; 
      status: 'passed' | 'failed' | 'abandoned';
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('test_runs')
        .update({ 
          status, 
          completed_at: new Date().toISOString(),
          notes 
        })
        .eq('id', runId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['active-test-run'] });
    }
  });
}
