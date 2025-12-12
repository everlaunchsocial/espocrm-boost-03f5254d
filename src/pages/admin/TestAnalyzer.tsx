import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CRMLayout } from "@/components/crm/CRMLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Clock, BarChart3, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface VapiCall {
  id: string;
  caller_phone: string;
  duration_seconds: number;
  created_at: string;
  transcript: string;
  customer_id: string | null;
}

interface AnalysisResult {
  success: boolean;
  analysis_id?: string;
  overall_score?: number;
  cost?: number;
  category?: string;
  sentiment?: string;
  error?: string;
}

export default function TestAnalyzer() {
  const [selectedCallId, setSelectedCallId] = useState<string>("");

  // Fetch recent calls
  const { data: calls, isLoading: loadingCalls } = useQuery({
    queryKey: ['vapi-calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vapi_calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as VapiCall[];
    },
  });

  // Fetch existing analyses
  const { data: analyses, refetch: refetchAnalyses } = useQuery({
    queryKey: ['call-analyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_analysis')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  // Analyze call mutation
  const analyzeMutation = useMutation({
    mutationFn: async (callId: string): Promise<AnalysisResult> => {
      const { data, error } = await supabase.functions.invoke('analyze-call-quality', {
        body: { call_id: callId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Analysis complete! Score: ${data.overall_score?.toFixed(1)}`);
        refetchAnalyses();
      } else {
        toast.error(data.error || 'Analysis failed');
      }
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });

  const handleAnalyze = () => {
    if (!selectedCallId) {
      toast.error('Please select a call first');
      return;
    }
    analyzeMutation.mutate(selectedCallId);
  };

  const selectedCall = calls?.find(c => c.id === selectedCallId);
  const existingAnalysis = analyses?.find(a => a.call_id === selectedCallId);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/20 text-green-400';
      case 'negative': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Quality Analyzer - Test Page</h1>
          <p className="text-muted-foreground">Phase 1 testing: Analyze call quality manually</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Call Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Select Call to Analyze
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingCalls ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading calls...
                </div>
              ) : calls?.length === 0 ? (
                <p className="text-muted-foreground">No calls found. Make some test calls first.</p>
              ) : (
                <>
                  <Select value={selectedCallId} onValueChange={setSelectedCallId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a recent call..." />
                    </SelectTrigger>
                    <SelectContent>
                      {calls?.map((call) => (
                        <SelectItem key={call.id} value={call.id}>
                          {call.caller_phone} - {format(new Date(call.created_at), 'MMM d, h:mm a')} ({call.duration_seconds}s)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button 
                    onClick={handleAnalyze} 
                    disabled={!selectedCallId || analyzeMutation.isPending}
                    className="w-full"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analyze This Call
                      </>
                    )}
                  </Button>
                </>
              )}

              {selectedCall && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />
                    <span>{selectedCall.caller_phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{selectedCall.duration_seconds} seconds</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    <strong>Transcript Preview:</strong>
                    <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs">
                      {selectedCall.transcript?.substring(0, 500)}...
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Result */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analysis Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              {existingAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Overall Score</span>
                    <span className={`text-3xl font-bold ${getScoreColor(existingAnalysis.overall_score || 0)}`}>
                      {existingAnalysis.overall_score?.toFixed(1)}/10
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Badge className={getSentimentColor(existingAnalysis.sentiment)}>
                      {existingAnalysis.sentiment}
                    </Badge>
                    <Badge variant="outline">{existingAnalysis.call_category}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Speed</span>
                      <span className={getScoreColor(existingAnalysis.score_speed)}>{existingAnalysis.score_speed}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Clarity</span>
                      <span className={getScoreColor(existingAnalysis.score_clarity)}>{existingAnalysis.score_clarity}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Accuracy</span>
                      <span className={getScoreColor(existingAnalysis.score_accuracy)}>{existingAnalysis.score_accuracy}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Tone</span>
                      <span className={getScoreColor(existingAnalysis.score_tone)}>{existingAnalysis.score_tone}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Completeness</span>
                      <span className={getScoreColor(existingAnalysis.score_completeness)}>{existingAnalysis.score_completeness}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Lead Quality</span>
                      <span className={getScoreColor(existingAnalysis.score_lead_quality)}>{existingAnalysis.score_lead_quality}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Booking</span>
                      <span className={getScoreColor(existingAnalysis.score_booking_success)}>{existingAnalysis.score_booking_success}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Objections</span>
                      <span className={getScoreColor(existingAnalysis.score_objection_handling)}>{existingAnalysis.score_objection_handling}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Duration</span>
                      <span className={getScoreColor(existingAnalysis.score_call_duration)}>{existingAnalysis.score_call_duration}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Outcome</span>
                      <span className={getScoreColor(existingAnalysis.score_outcome_quality)}>{existingAnalysis.score_outcome_quality}</span>
                    </div>
                  </div>

                  {existingAnalysis.transcript_summary && (
                    <div className="p-3 bg-muted rounded">
                      <strong className="text-sm">Summary:</strong>
                      <p className="text-sm mt-1">{existingAnalysis.transcript_summary}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Analysis cost: ${existingAnalysis.analysis_cost?.toFixed(4)} • 
                    Model: {existingAnalysis.analyzer_model}
                  </div>
                </div>
              ) : selectedCallId ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>No analysis yet. Click "Analyze This Call" to start.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mb-2" />
                  <p>Select a call to see analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Analyses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyses?.length === 0 ? (
              <p className="text-muted-foreground">No analyses yet.</p>
            ) : (
              <div className="space-y-2">
                {analyses?.slice(0, 10).map((analysis) => (
                  <div key={analysis.id} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${getScoreColor(analysis.overall_score || 0)}`}>
                        {analysis.overall_score?.toFixed(1)}
                      </span>
                      <div>
                        <Badge className={getSentimentColor(analysis.sentiment)} variant="outline">
                          {analysis.sentiment}
                        </Badge>
                        <Badge variant="outline" className="ml-2">{analysis.call_category}</Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(analysis.analyzed_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}
