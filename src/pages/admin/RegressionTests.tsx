import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Play, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, Loader2, Beaker, FileCode
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface GoldenScenario {
  id: string;
  name: string;
  vertical_id: number | null;
  channel: string;
  is_active: boolean;
  created_at: string;
}

interface TestRun {
  id: string;
  run_type: string;
  vertical_filter: number | null;
  total_scenarios: number;
  passed_count: number;
  failed_count: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

interface TestResult {
  id: string;
  run_id: string;
  scenario_id: string;
  passed: boolean;
  assertions_passed: Array<{ type: string; passed: boolean; details: string }>;
  assertions_failed: Array<{ type: string; passed: boolean; details: string }>;
  generated_prompt: string | null;
  ai_response: string | null;
  execution_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  scenario?: GoldenScenario;
}

const VERTICAL_LABELS: Record<number, string> = {
  0: 'Generic',
  1: 'Plumbing',
  2: 'HVAC',
  3: 'Electricians',
  4: 'Roofing',
  6: 'Pest Control',
  7: 'Locksmith',
  8: 'Towing',
  14: 'PI Attorney',
  15: 'Bail Bonds',
  17: 'Dental',
  81: 'Medical Spa',
  82: 'Chiropractor',
};

export default function RegressionTests() {
  const queryClient = useQueryClient();
  const [selectedVertical, setSelectedVertical] = useState<string>('all');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

  // Fetch scenarios
  const { data: scenarios } = useQuery({
    queryKey: ['golden-scenarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('golden_scenarios')
        .select('*')
        .order('vertical_id', { ascending: true });
      if (error) throw error;
      return data as GoldenScenario[];
    },
  });

  // Fetch test runs
  const { data: testRuns, isLoading: runsLoading } = useQuery({
    queryKey: ['regression-test-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regression_test_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as TestRun[];
    },
    refetchInterval: 5000, // Poll for updates
  });

  // Fetch results for expanded run
  const { data: expandedResults } = useQuery({
    queryKey: ['regression-test-results', expandedRunId],
    queryFn: async () => {
      if (!expandedRunId) return [];
      const { data, error } = await supabase
        .from('regression_test_results')
        .select('*, scenario:golden_scenarios(*)')
        .eq('run_id', expandedRunId)
        .order('passed', { ascending: true });
      if (error) throw error;
      return data as unknown as TestResult[];
    },
    enabled: !!expandedRunId,
  });

  // Run tests mutation
  const runTestsMutation = useMutation({
    mutationFn: async (params: { vertical_id?: number; run_all?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('run-regression-tests', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['regression-test-runs'] });
      if (data.failed > 0) {
        toast.warning(`Tests completed: ${data.passed} passed, ${data.failed} failed`);
      } else {
        toast.success(`All ${data.passed} tests passed!`);
      }
    },
    onError: (error) => {
      toast.error('Failed to run tests');
      console.error(error);
    },
  });

  const handleRunAll = () => {
    runTestsMutation.mutate({ run_all: true });
  };

  const handleRunVertical = () => {
    if (selectedVertical === 'all') {
      runTestsMutation.mutate({ run_all: true });
    } else {
      runTestsMutation.mutate({ vertical_id: parseInt(selectedVertical) });
    }
  };

  // Get unique verticals from scenarios
  const uniqueVerticals = scenarios
    ? [...new Set(scenarios.map(s => s.vertical_id))]
        .filter(v => v !== null)
        .sort((a, b) => (a ?? 0) - (b ?? 0))
    : [];

  const latestRun = testRuns?.[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Beaker className="h-6 w-6" />
            Regression Tests
          </h1>
          <p className="text-muted-foreground mt-1">
            Verify prompt behavior across verticals and channels
          </p>
        </div>
      </div>

      {/* Run Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run Tests</CardTitle>
          <CardDescription>
            Execute golden scenarios to verify AI behavior after changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={handleRunAll}
              disabled={runTestsMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {runTestsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run All Tests
            </Button>
            
            <div className="flex items-center gap-2">
              <Select value={selectedVertical} onValueChange={setSelectedVertical}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verticals</SelectItem>
                  {uniqueVerticals.map(vid => (
                    <SelectItem key={vid} value={String(vid)}>
                      {VERTICAL_LABELS[vid ?? 0] || `Vertical ${vid}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleRunVertical}
                disabled={runTestsMutation.isPending}
              >
                {runTestsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Run Selected
              </Button>
            </div>
            
            <div className="ml-auto text-sm text-muted-foreground">
              {scenarios?.length || 0} scenarios configured
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Run Summary */}
      {latestRun && (
        <Card className={latestRun.failed_count > 0 ? 'border-red-500/50' : 'border-green-500/50'}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {latestRun.status === 'running' ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              ) : latestRun.failed_count > 0 ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              Latest Run
              <Badge variant={latestRun.status === 'running' ? 'secondary' : latestRun.failed_count > 0 ? 'destructive' : 'default'}>
                {latestRun.status === 'running' ? 'Running...' : `${latestRun.passed_count}/${latestRun.total_scenarios} passed`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{latestRun.total_scenarios}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-500">{latestRun.passed_count}</div>
                <div className="text-xs text-muted-foreground">Passed</div>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{latestRun.failed_count}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium">
                  {format(new Date(latestRun.started_at), 'MMM d, h:mm a')}
                </div>
                <div className="text-xs text-muted-foreground">Started</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Runs History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Test Run History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !testRuns?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Beaker className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No test runs yet. Click "Run All Tests" to start.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {testRuns.map((run) => (
                <Collapsible
                  key={run.id}
                  open={expandedRunId === run.id}
                  onOpenChange={(open) => setExpandedRunId(open ? run.id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <div className={`p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                      run.failed_count > 0 ? 'border-red-500/30' : 'border-green-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {run.status === 'running' ? (
                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                          ) : run.failed_count > 0 ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          <div>
                            <div className="font-medium">
                              {run.run_type === 'full' ? 'Full Run' : 
                               run.vertical_filter !== null ? `Vertical: ${VERTICAL_LABELS[run.vertical_filter] || run.vertical_filter}` : 
                               'Partial Run'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(run.started_at), 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm">
                              <span className="text-green-500 font-medium">{run.passed_count}</span>
                              <span className="text-muted-foreground"> / </span>
                              <span className="text-red-500 font-medium">{run.failed_count}</span>
                              <span className="text-muted-foreground"> / </span>
                              <span>{run.total_scenarios}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              passed / failed / total
                            </div>
                          </div>
                          {expandedRunId === run.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted ml-6">
                      {expandedResults?.map((result) => (
                        <Collapsible
                          key={result.id}
                          open={expandedResultId === result.id}
                          onOpenChange={(open) => setExpandedResultId(open ? result.id : null)}
                        >
                          <CollapsibleTrigger asChild>
                            <div className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/30 ${
                              result.passed ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {result.passed ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                  <span className="font-medium text-sm">
                                    {(result.scenario as unknown as GoldenScenario)?.name || 'Unknown Scenario'}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {(result.scenario as unknown as GoldenScenario)?.channel}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  {result.execution_time_ms && (
                                    <span className="text-xs text-muted-foreground">
                                      {result.execution_time_ms}ms
                                    </span>
                                  )}
                                  {expandedResultId === result.id ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-4 bg-muted/30 rounded-lg mt-1 space-y-3">
                              {/* Failed Assertions */}
                              {result.assertions_failed && result.assertions_failed.length > 0 && (
                                <div>
                                  <div className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    Failed Assertions
                                  </div>
                                  <ul className="text-xs space-y-1">
                                    {result.assertions_failed.map((a, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                        <span><strong>{a.type}:</strong> {a.details}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Passed Assertions */}
                              {result.assertions_passed && result.assertions_passed.length > 0 && (
                                <div>
                                  <div className="text-sm font-medium text-green-500 mb-2 flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Passed Assertions
                                  </div>
                                  <ul className="text-xs space-y-1 opacity-70">
                                    {result.assertions_passed.map((a, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span><strong>{a.type}:</strong> {a.details}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* AI Response */}
                              {result.ai_response && (
                                <div>
                                  <div className="text-sm font-medium mb-2 flex items-center gap-1">
                                    <FileCode className="h-4 w-4" />
                                    AI Response
                                  </div>
                                  <pre className="text-xs bg-background p-3 rounded border overflow-x-auto max-h-40">
                                    {result.ai_response}
                                  </pre>
                                </div>
                              )}
                              
                              {/* Error */}
                              {result.error_message && (
                                <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
                                  Error: {result.error_message}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenarios Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Golden Scenarios ({scenarios?.length || 0})</CardTitle>
          <CardDescription>
            Configured test scenarios by vertical and channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {scenarios?.map((scenario) => (
              <div key={scenario.id} className="p-3 rounded-lg border bg-muted/30">
                <div className="font-medium text-sm">{scenario.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {VERTICAL_LABELS[scenario.vertical_id ?? 0] || 'Generic'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {scenario.channel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
