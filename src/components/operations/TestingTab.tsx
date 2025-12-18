import { useState } from "react";
import { 
  useTestSuites, 
  useActiveTestRun, 
  useTestStepCompletions,
  useStartTestRun,
  useCompleteTestStep,
  useCompleteTestRun,
  useTestRuns,
  TestSuite,
} from "@/hooks/useTesting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  SkipForward, 
  Play, 
  Clock, 
  AlertTriangle,
  FileText,
  Users,
  DollarSign,
  Globe,
  History,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, React.ReactNode> = {
  demo: <Globe className="h-4 w-4" />,
  customer: <Users className="h-4 w-4" />,
  affiliate: <FileText className="h-4 w-4" />,
  commission: <DollarSign className="h-4 w-4" />,
  general: <FileText className="h-4 w-4" />
};

const categoryColors: Record<string, string> = {
  demo: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  customer: "bg-green-500/10 text-green-500 border-green-500/20",
  affiliate: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  commission: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  general: "bg-muted text-muted-foreground"
};

export function TestingTab() {
  const { data: suites, isLoading: suitesLoading } = useTestSuites();
  const { data: activeRun } = useActiveTestRun();
  const { data: completions } = useTestStepCompletions(activeRun?.id || null);
  const { data: recentRuns } = useTestRuns();
  const startRun = useStartTestRun();
  const completeStep = useCompleteTestStep();
  const completeRun = useCompleteTestRun();
  
  const [stepNotes, setStepNotes] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const handleStartTest = async (suite: TestSuite) => {
    try {
      await startRun.mutateAsync(suite.id);
      toast.success(`Started: ${suite.name}`);
    } catch {
      toast.error("Failed to start test");
    }
  };

  const handleStepAction = async (result: 'pass' | 'fail' | 'skip') => {
    if (!activeRun?.suite) return;
    
    const currentStep = activeRun.suite.steps[activeRun.current_step_index];
    if (!currentStep) return;

    try {
      await completeStep.mutateAsync({
        runId: activeRun.id,
        stepIndex: activeRun.current_step_index,
        stepId: currentStep.id,
        result,
        notes: stepNotes || undefined
      });
      
      setStepNotes("");
      
      if (activeRun.current_step_index === activeRun.suite.steps.length - 1) {
        const allPass = completions?.every(c => c.result === 'pass') && result === 'pass';
        await completeRun.mutateAsync({
          runId: activeRun.id,
          status: allPass ? 'passed' : 'failed'
        });
        toast.success(allPass ? "Test suite passed!" : "Completed with failures");
      } else {
        toast.success(`Step ${result}: ${currentStep.title}`);
      }
    } catch {
      toast.error("Failed to complete step");
    }
  };

  const handleAbandonTest = async () => {
    if (!activeRun) return;
    try {
      await completeRun.mutateAsync({
        runId: activeRun.id,
        status: 'abandoned',
        notes: 'Test abandoned'
      });
      toast.info("Test abandoned");
    } catch {
      toast.error("Failed to abandon test");
    }
  };

  // Active test view
  if (activeRun?.suite) {
    const suite = activeRun.suite;
    const currentStep = suite.steps[activeRun.current_step_index];
    const progress = (activeRun.current_step_index / suite.steps.length) * 100;
    const completedSteps = completions || [];

    return (
      <div className="flex flex-col h-full -m-6">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {categoryIcons[suite.category]}
                {suite.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Step {activeRun.current_step_index + 1} of {suite.steps.length}
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleAbandonTest}>
              Abandon
            </Button>
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r bg-muted/30">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {suite.steps.map((step, idx) => {
                  const completion = completedSteps.find(c => c.step_index === idx);
                  const isCurrent = idx === activeRun.current_step_index;
                  
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md text-sm",
                        isCurrent && "bg-primary/10 border border-primary/30"
                      )}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        {completion?.result === 'pass' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {completion?.result === 'fail' && <XCircle className="h-4 w-4 text-destructive" />}
                        {completion?.result === 'skip' && <SkipForward className="h-4 w-4 text-amber-500" />}
                        {!completion && isCurrent && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                        {!completion && !isCurrent && <span className="text-xs text-muted-foreground">{idx + 1}</span>}
                      </div>
                      <span className={cn("truncate", isCurrent && "font-medium")}>{step.title}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {currentStep && (
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <Badge variant="outline" className="w-fit">Step {activeRun.current_step_index + 1}</Badge>
                  <CardTitle>{currentStep.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Instructions</h4>
                    <p className="text-sm">{currentStep.instruction}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Expected</h4>
                    <p className="text-sm text-green-600">{currentStep.expected}</p>
                  </div>
                  <Separator />
                  <Textarea
                    placeholder="Notes (optional)"
                    value={stepNotes}
                    onChange={(e) => setStepNotes(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleStepAction('pass')}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />Pass
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleStepAction('fail')}>
                      <XCircle className="h-4 w-4 mr-2" />Fail
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => handleStepAction('skip')}>
                      <SkipForward className="h-4 w-4 mr-2" />Skip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Suite selection view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Testing Command Center</h2>
          <p className="text-muted-foreground text-sm">Systematic testing with step-by-step checklists</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showHistory ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-2" />
            {showHistory ? "Suites" : "History"}
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showHistory ? (
        <div className="space-y-2">
          {recentRuns && recentRuns.length > 0 ? (
            recentRuns.map((run) => (
              <Card key={run.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={run.status === 'passed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                      {run.status}
                    </Badge>
                    <div>
                      <p className="font-medium">{run.suite?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(run.started_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground">No test runs yet.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suitesLoading ? (
            <p>Loading...</p>
          ) : suites?.map((suite) => (
            <Card key={suite.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={cn("gap-1", categoryColors[suite.category])}>
                    {categoryIcons[suite.category]}
                    {suite.category}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />~{suite.estimated_duration_minutes}m
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-2">{suite.name}</CardTitle>
                <CardDescription className="line-clamp-2">{suite.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>{suite.steps.length} steps</span>
                  {suite.prerequisites?.length > 0 && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <AlertTriangle className="h-3 w-3" />Prerequisites
                    </span>
                  )}
                </div>
                <Button className="w-full" onClick={() => handleStartTest(suite)} disabled={startRun.isPending}>
                  <Play className="h-4 w-4 mr-2" />Start Test
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
