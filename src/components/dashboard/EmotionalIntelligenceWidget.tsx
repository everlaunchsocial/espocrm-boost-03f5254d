import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, AlertTriangle, TrendingUp, Phone } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAtRiskLeads,
  useHotLeads,
  getSentimentEmoji,
  getSentimentColor,
  LeadWithSentiment,
} from "@/hooks/useSentimentAnalysis";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

function LeadRow({ lead, type }: { lead: LeadWithSentiment; type: 'at-risk' | 'hot' }) {
  const navigate = useNavigate();
  const sentiment = lead.latest_sentiment;
  
  return (
    <div 
      className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={() => navigate(`/leads?id=${lead.id}`)}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{type === 'at-risk' ? '🔴' : '🟢'}</span>
          <span className="font-medium">
            {lead.first_name} {lead.last_name}
          </span>
          {lead.company && (
            <span className="text-muted-foreground text-sm">- {lead.company}</span>
          )}
        </div>
        {sentiment && (
          <>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm">
                Sentiment: 
                <span className={`ml-1 font-medium ${getSentimentColor(sentiment.sentiment_score)}`}>
                  {sentiment.sentiment_score.toFixed(2)}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                ({getSentimentEmoji(sentiment.sentiment_label)} {sentiment.sentiment_label.replace('_', ' ')})
              </span>
            </div>
            {sentiment.key_phrases && sentiment.key_phrases.length > 0 && (
              <p className="text-sm text-muted-foreground italic mt-1 line-clamp-1">
                "{sentiment.key_phrases[0]}"
              </p>
            )}
            {sentiment.recommended_action && (
              <p className="text-xs text-primary mt-1">
                → {sentiment.recommended_action}
              </p>
            )}
          </>
        )}
      </div>
      <Button size="sm" variant="ghost" onClick={(e) => {
        e.stopPropagation();
        // Could trigger call action
      }}>
        <Phone className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EmotionalIntelligenceWidget() {
  const isEnabled = useFeatureFlags(state => state.isEnabled);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const { data: atRiskLeads, isLoading: loadingAtRisk } = useAtRiskLeads();
  const { data: hotLeads, isLoading: loadingHot } = useHotLeads();

  if (!isEnabled('aiCrmPhase4')) {
    return null;
  }

  const isLoading = loadingAtRisk || loadingHot;
  const hasData = (atRiskLeads && atRiskLeads.length > 0) || (hotLeads && hotLeads.length > 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span>🎭 Emotional Intelligence</span>
              </div>
              {atRiskLeads && atRiskLeads.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {atRiskLeads.length} at risk
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <p className="text-muted-foreground text-sm py-4">Analyzing sentiments...</p>
            ) : !hasData ? (
              <p className="text-muted-foreground text-sm py-4">
                No sentiment data yet. Add notes or receive communications to see emotional insights.
              </p>
            ) : (
              <div className="space-y-6">
                {/* At-Risk Leads */}
                {atRiskLeads && atRiskLeads.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-3 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      AT-RISK LEADS (Negative Sentiment)
                    </h4>
                    <div className="space-y-2">
                      {atRiskLeads.slice(0, 5).map(lead => (
                        <LeadRow key={lead.id} lead={lead} type="at-risk" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Hot Leads */}
                {hotLeads && hotLeads.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-3 text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      HOT LEADS (Very Positive Sentiment)
                    </h4>
                    <div className="space-y-2">
                      {hotLeads.slice(0, 5).map(lead => (
                        <LeadRow key={lead.id} lead={lead} type="hot" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
