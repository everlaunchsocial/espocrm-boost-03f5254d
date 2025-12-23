import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import {
  useLeadSentimentHistory,
  useEmotionalJourney,
  useAnalyzeSentiment,
  getSentimentEmoji,
  getSentimentColor,
  getTrendIcon,
  getRiskColor,
  getUrgencyBadgeVariant,
} from "@/hooks/useSentimentAnalysis";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EmotionalJourneyCardProps {
  leadId: string;
}

export function EmotionalJourneyCard({ leadId }: EmotionalJourneyCardProps) {
  const isEnabled = useFeatureFlags(state => state.isEnabled);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAnalyzeInput, setShowAnalyzeInput] = useState(false);
  const [analyzeContent, setAnalyzeContent] = useState("");

  const { data: journey, isLoading: loadingJourney } = useEmotionalJourney(leadId);
  const { data: history, isLoading: loadingHistory } = useLeadSentimentHistory(leadId);
  const analyzeSentiment = useAnalyzeSentiment();

  if (!isEnabled('aiCrmPhase4')) {
    return null;
  }

  const handleAnalyze = async () => {
    if (!analyzeContent.trim()) return;

    try {
      await analyzeSentiment.mutateAsync({
        leadId,
        content: analyzeContent,
        interactionType: 'notes',
      });
      toast.success("Sentiment analyzed successfully");
      setAnalyzeContent("");
      setShowAnalyzeInput(false);
    } catch (error) {
      toast.error("Failed to analyze sentiment");
    }
  };

  const isLoading = loadingJourney || loadingHistory;
  const latestAnalysis = history?.[0];

  // Extract key concerns from history
  const allPhrases = history?.flatMap(h => h.key_phrases || []) || [];
  const phraseCounts = allPhrases.reduce((acc, phrase) => {
    acc[phrase] = (acc[phrase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topConcerns = Object.entries(phraseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const TrendIcon = journey?.trend === 'improving' ? TrendingUp : 
                    journey?.trend === 'declining' ? TrendingDown : Minus;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span>🎭 Emotional Journey</span>
              </div>
              {journey?.risk_level && journey.risk_level !== 'none' && (
                <Badge variant={journey.risk_level === 'high' ? 'destructive' : 'secondary'}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {journey.risk_level} risk
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading sentiment data...</p>
            ) : !journey && !latestAnalysis ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  No sentiment data yet. Analyze a communication to get started.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAnalyzeInput(true)}
                >
                  Analyze Text
                </Button>
              </div>
            ) : (
              <>
                {/* Current State */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Current State</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl">
                        {getSentimentEmoji(latestAnalysis?.sentiment_label || 'neutral')}
                      </span>
                      <span className="font-medium capitalize">
                        {journey?.current_emotional_state || latestAnalysis?.sentiment_label?.replace('_', ' ') || 'Neutral'}
                      </span>
                      {latestAnalysis && (
                        <span className={`font-bold ${getSentimentColor(latestAnalysis.sentiment_score)}`}>
                          ({latestAnalysis.sentiment_score.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Trend</div>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendIcon className={`h-4 w-4 ${
                        journey?.trend === 'improving' ? 'text-green-500' :
                        journey?.trend === 'declining' ? 'text-red-500' : 'text-muted-foreground'
                      }`} />
                      <span className="capitalize">{journey?.trend || 'stable'}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                {history && history.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Timeline</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {history.slice(0, 10).map((analysis) => (
                        <div 
                          key={analysis.id}
                          className="flex items-start gap-3 p-2 border rounded text-sm"
                        >
                          <div className={`w-3 h-3 rounded-full mt-1 ${
                            analysis.sentiment_score >= 0.3 ? 'bg-green-500' :
                            analysis.sentiment_score >= -0.3 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {format(new Date(analysis.analyzed_at), 'MMM d')}:
                              </span>
                              <span className={getSentimentColor(analysis.sentiment_score)}>
                                {analysis.sentiment_score.toFixed(2)}
                              </span>
                              <span>{getSentimentEmoji(analysis.sentiment_label)}</span>
                            </div>
                            {analysis.key_phrases?.[0] && (
                              <p className="text-muted-foreground italic line-clamp-1">
                                "{analysis.key_phrases[0]}"
                              </p>
                            )}
                          </div>
                          {analysis.urgency_level !== 'low' && (
                            <Badge variant={getUrgencyBadgeVariant(analysis.urgency_level)} className="text-xs">
                              {analysis.urgency_level}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Concerns */}
                {topConcerns.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Key Concerns Detected</h4>
                    <ul className="text-sm space-y-1">
                      {topConcerns.map(([phrase, count]) => (
                        <li key={phrase} className="flex items-center gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{phrase}</span>
                          {count > 1 && (
                            <span className="text-xs text-muted-foreground">(mentioned {count}x)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Actions */}
                {latestAnalysis?.recommended_action && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <h4 className="font-medium mb-1">Recommended Action</h4>
                    <p className="text-sm">{latestAnalysis.recommended_action}</p>
                  </div>
                )}

                {/* Analyze Input */}
                <div className="pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAnalyzeInput(!showAnalyzeInput)}
                  >
                    {showAnalyzeInput ? 'Cancel' : 'Analyze New Text'}
                  </Button>
                </div>
              </>
            )}

            {showAnalyzeInput && (
              <div className="space-y-2 pt-2">
                <Textarea
                  value={analyzeContent}
                  onChange={(e) => setAnalyzeContent(e.target.value)}
                  placeholder="Paste email, call notes, or any communication to analyze..."
                  rows={4}
                />
                <Button 
                  onClick={handleAnalyze}
                  disabled={analyzeSentiment.isPending || !analyzeContent.trim()}
                  size="sm"
                >
                  {analyzeSentiment.isPending ? 'Analyzing...' : 'Analyze Sentiment'}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
