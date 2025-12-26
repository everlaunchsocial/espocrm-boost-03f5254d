import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  useTestSuites, 
  useActiveTestRun, 
  useTestStepCompletions,
  useStartTestRun,
  useCompleteTestStep,
  useCompleteTestRun,
  useTestRuns,
  TestSuite,
  TestRun
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
  ChevronRight,
  FileText,
  Users,
  DollarSign,
  Globe,
  History,
  RefreshCw,
  Mail,
  Sparkles,
  Loader2,
  Wrench,
  Phone
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TestEmailsPanel } from "@/components/testing/TestEmailsPanel";
import { useTestModeStatus } from "@/hooks/useTestMode";
import { TestOrchestratorChat } from "@/components/testing/TestOrchestratorChat";
import { useUserRole } from "@/hooks/useUserRole";
import { VoiceNoteButton } from "@/components/testing/VoiceNoteButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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

export default function Testing() {
  const navigate = useNavigate();
  const { data: suites, isLoading: suitesLoading } = useTestSuites();
  const { data: activeRun, isLoading: runLoading } = useActiveTestRun();
  const { data: completions } = useTestStepCompletions(activeRun?.id || null);
  const { data: recentRuns } = useTestRuns();
  const startRun = useStartTestRun();
  const completeStep = useCompleteTestStep();
  const completeRun = useCompleteTestRun();
  const { isTestMode } = useTestModeStatus();
  const { role, isLoading: roleLoading } = useUserRole();
  const isSuperAdmin = role === 'super_admin';
  
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [stepNotes, setStepNotes] = useState("");
  const [needsFixing, setNeedsFixing] = useState(false);
  const [fixDescription, setFixDescription] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showEmails, setShowEmails] = useState(false);
  const [showOrchestrator, setShowOrchestrator] = useState(false);
  const [isConfiguringHotline, setIsConfiguringHotline] = useState(false);

  const handleConfigureDemoHotline = async () => {
    setIsConfiguringHotline(true);
    try {
      const { data, error } = await supabase.functions.invoke('configure-demo-hotline');
      if (error) throw error;
      toast.success("Demo hotline configured successfully!");
      console.log("Demo hotline configured:", data);
    } catch (error: any) {
      console.error("Failed to configure demo hotline:", error);
      toast.error(`Failed to configure demo hotline: ${error.message || 'Unknown error'}`);
    } finally {
      setIsConfiguringHotline(false);
    }
  };

  // Redirect non-super-admins
  useEffect(() => {
    if (!roleLoading && role && role !== 'super_admin') {
      toast.error("Access denied: Super admin only");
      if (role === 'affiliate') {
        navigate('/affiliate');
      } else if (role === 'customer') {
        navigate('/customer');
      } else {
        navigate('/dashboard');
      }
    }
  }, [role, roleLoading, navigate]);

  // Show loading while checking role
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render if not super admin
  if (!isSuperAdmin) {
    return null;
  }

  const handleStartTest = async (suite: TestSuite) => {
    try {
      await startRun.mutateAsync(suite.id);
      setSelectedSuite(suite);
      toast.success(`Started: ${suite.name}`);
    } catch (error) {
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
        notes: stepNotes || undefined,
        needsFixing: needsFixing,
        fixDescription: needsFixing ? fixDescription : undefined
      });
      
      setStepNotes("");
      setNeedsFixing(false);
      setFixDescription("");
      
      // Check if this was the last step
      if (activeRun.current_step_index === activeRun.suite.steps.length - 1) {
        // Determine overall result
        const allPass = completions?.every(c => c.result === 'pass') && result === 'pass';
        await completeRun.mutateAsync({
          runId: activeRun.id,
          status: allPass ? 'passed' : 'failed'
        });
        toast.success(allPass ? "Test suite passed!" : "Test suite completed with failures");
      } else {
        toast.success(`Step ${result}: ${currentStep.title}`);
      }
    } catch (error) {
      toast.error("Failed to complete step");
    }
  };

  const handleAbandonTest = async () => {
    if (!activeRun) return;
    
    try {
      await completeRun.mutateAsync({
        runId: activeRun.id,
        status: 'abandoned',
        notes: 'Test abandoned by user'
      });
      toast.info("Test abandoned");
    } catch (error) {
      toast.error("Failed to abandon test");
    }
  };

  // Show the active test run view
  if (activeRun?.suite) {
    const suite = activeRun.suite;
    const currentStep = suite.steps[activeRun.current_step_index];
    const progress = (activeRun.current_step_index / suite.steps.length) * 100;
    const completedSteps = completions || [];

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                {categoryIcons[suite.category]}
                {suite.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Step {activeRun.current_step_index + 1} of {suite.steps.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                ~{suite.estimated_duration_minutes} min
              </Badge>
              <Button variant="destructive" size="sm" onClick={handleAbandonTest}>
                Abandon Test
              </Button>
            </div>
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Steps sidebar */}
          <div className="w-72 border-r bg-muted/30">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {suite.steps.map((step, idx) => {
                  const completion = completedSteps.find(c => c.step_index === idx);
                  const isCurrent = idx === activeRun.current_step_index;
                  const isPast = idx < activeRun.current_step_index;
                  
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md text-sm",
                        isCurrent && "bg-primary/10 border border-primary/30",
                        isPast && "text-muted-foreground",
                        !isCurrent && !isPast && "text-muted-foreground/60"
                      )}
                    >
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                        {completion?.result === 'pass' && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {completion?.result === 'fail' && (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        {completion?.result === 'skip' && (
                          <SkipForward className="h-5 w-5 text-amber-500" />
                        )}
                        {!completion && isCurrent && (
                          <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                        )}
                        {!completion && !isCurrent && (
                          <span className="text-xs text-muted-foreground">{idx + 1}</span>
                        )}
                      </div>
                      <span className={cn("truncate flex-1", isCurrent && "font-medium")}>
                        {step.title}
                      </span>
                      {completion?.needs_fixing && (
                        <Wrench className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-auto p-6">
            {currentStep ? (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Credentials card if available */}
                {Object.keys(suite.test_credentials).length > 0 && (
                  <Card className="bg-muted/50 border-dashed">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">Test Credentials</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(suite.test_credentials).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}: </span>
                            <code className="bg-background px-1 py-0.5 rounded text-xs">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </code>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Current step */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Step {activeRun.current_step_index + 1}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Instructions</h4>
                      <p className="text-sm">{currentStep.instruction}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Expected Result</h4>
                      <p className="text-sm text-green-600 dark:text-green-400">{currentStep.expected}</p>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Notes (optional)</h4>
                        <VoiceNoteButton 
                          onTranscript={(text) => setStepNotes(prev => prev ? `${prev} ${text}` : text)}
                          disabled={completeStep.isPending}
                        />
                      </div>
                      <Textarea
                        placeholder="Add any observations or issues..."
                        value={stepNotes}
                        onChange={(e) => setStepNotes(e.target.value)}
                        rows={2}
                      />
                    </div>

                    {/* Needs Fixing checkbox */}
                    <div className="flex items-start space-x-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                      <Checkbox 
                        id="needs-fixing" 
                        checked={needsFixing}
                        onCheckedChange={(checked) => setNeedsFixing(checked === true)}
                      />
                      <div className="flex-1 space-y-2">
                        <Label 
                          htmlFor="needs-fixing" 
                          className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <Wrench className="h-4 w-4 text-amber-500" />
                          Needs Fixing
                        </Label>
                        {needsFixing && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Textarea
                                placeholder="Describe what's wrong and what needs to be fixed..."
                                value={fixDescription}
                                onChange={(e) => setFixDescription(e.target.value)}
                                rows={2}
                                className="flex-1"
                              />
                              <VoiceNoteButton 
                                onTranscript={(text) => setFixDescription(prev => prev ? `${prev} ${text}` : text)}
                                disabled={completeStep.isPending}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleStepAction('pass')}
                        disabled={completeStep.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Pass
                      </Button>
                      <Button 
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleStepAction('fail')}
                        disabled={completeStep.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Fail
                      </Button>
                      <Button 
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleStepAction('skip')}
                        disabled={completeStep.isPending}
                      >
                        <SkipForward className="h-4 w-4 mr-2" />
                        Skip
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold">Test Complete!</h2>
                  <p className="text-muted-foreground mt-1">All steps have been completed.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Test suite selection view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Testing Command Center</h1>
            <p className="text-muted-foreground">
              Systematic testing with step-by-step checklists
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleConfigureDemoHotline}
                disabled={isConfiguringHotline}
              >
                {isConfiguringHotline ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4 mr-2" />
                )}
                {isConfiguringHotline ? "Configuring..." : "Reconfigure Hotline"}
              </Button>
            )}
            {isSuperAdmin && (
              <Button 
                variant={showOrchestrator ? "default" : "outline"} 
                size="sm"
                onClick={() => { setShowOrchestrator(!showOrchestrator); setShowHistory(false); setShowEmails(false); }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {showOrchestrator ? "Hide AI" : "AI Orchestrator"}
              </Button>
            )}
            {isTestMode && (
              <Button 
                variant={showEmails ? "default" : "outline"} 
                size="sm"
                onClick={() => { setShowEmails(!showEmails); setShowHistory(false); setShowOrchestrator(false); }}
              >
                <Mail className="h-4 w-4 mr-2" />
                {showEmails ? "Hide Emails" : "Test Emails"}
              </Button>
            )}
            <Button 
              variant={showHistory ? "default" : "outline"} 
              size="sm"
              onClick={() => { setShowHistory(!showHistory); setShowEmails(false); setShowOrchestrator(false); }}
            >
              <History className="h-4 w-4 mr-2" />
              {showHistory ? "Show Suites" : "History"}
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {showOrchestrator && isSuperAdmin ? (
            // AI Orchestrator view
            <TestOrchestratorChat />
          ) : showEmails ? (
            // Test Emails view
            <TestEmailsPanel />
          ) : showHistory ? (
            // History view
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Recent Test Runs</h2>
              {recentRuns && recentRuns.length > 0 ? (
                <div className="space-y-2">
                  {recentRuns.map((run) => (
                    <Card key={run.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={
                              run.status === 'passed' ? 'default' : 
                              run.status === 'failed' ? 'destructive' : 
                              run.status === 'abandoned' ? 'secondary' : 'outline'
                            }
                          >
                            {run.status}
                          </Badge>
                          <div>
                            <p className="font-medium">{run.suite?.name || 'Unknown Suite'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(run.started_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {run.completed_at && (
                          <span className="text-xs text-muted-foreground">
                            Duration: {Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 60000)} min
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No test runs yet.</p>
              )}
            </div>
          ) : (
            // Suites view
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suitesLoading ? (
                <p>Loading test suites...</p>
              ) : suites && suites.length > 0 ? (
                suites.map((suite) => (
                  <Card key={suite.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className={cn("gap-1", categoryColors[suite.category])}
                        >
                          {categoryIcons[suite.category]}
                          {suite.category}
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          ~{suite.estimated_duration_minutes}m
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-2">{suite.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {suite.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <span>{suite.steps.length} steps</span>
                        {suite.prerequisites && suite.prerequisites.length > 0 && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <AlertTriangle className="h-3 w-3" />
                            Prerequisites
                          </span>
                        )}
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => handleStartTest(suite)}
                        disabled={startRun.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Test
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p>No test suites found.</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
