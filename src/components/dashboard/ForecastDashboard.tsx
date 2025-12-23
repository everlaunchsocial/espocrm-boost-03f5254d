import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Calendar,
  HelpCircle,
  Phone,
  Mail,
  Eye
} from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { 
  useLatestForecast, 
  useLeadsWithPredictions, 
  useGenerateForecasts,
  getProbabilityLevel,
  formatCurrency,
  formatPercent,
  LeadWithPrediction
} from '@/hooks/useForecasts';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function ForecastDashboard() {
  const { isEnabled } = useFeatureFlags();
  const [isExpanded, setIsExpanded] = React.useState(true);
  const navigate = useNavigate();

  const { data: forecast, isLoading: forecastLoading } = useLatestForecast('month');
  const { data: leadsWithPredictions, isLoading: leadsLoading } = useLeadsWithPredictions(10);
  const generateForecasts = useGenerateForecasts();

  if (!isEnabled('aiCrmPhase4')) return null;

  const handleRecalculate = async () => {
    await generateForecasts.mutateAsync();
  };

  const isLoading = forecastLoading || leadsLoading;

  // Group leads by probability
  const hotLeads = leadsWithPredictions?.filter(l => (l.prediction?.predicted_close_probability || 0) >= 0.7) || [];
  const warmLeads = leadsWithPredictions?.filter(l => {
    const prob = l.prediction?.predicted_close_probability || 0;
    return prob >= 0.4 && prob < 0.7;
  }) || [];
  const coldLeads = leadsWithPredictions?.filter(l => (l.prediction?.predicted_close_probability || 0) < 0.4) || [];

  // Calculate totals
  const hotRevenue = hotLeads.reduce((sum, l) => sum + (l.prediction?.predicted_deal_value || 0) * (l.prediction?.predicted_close_probability || 0), 0);
  const warmRevenue = warmLeads.reduce((sum, l) => sum + (l.prediction?.predicted_deal_value || 0) * (l.prediction?.predicted_close_probability || 0), 0);
  const coldRevenue = coldLeads.reduce((sum, l) => sum + (l.prediction?.predicted_deal_value || 0) * (l.prediction?.predicted_close_probability || 0), 0);

  return (
    <Card className="border-border">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">📊 Pipeline Forecast</CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={generateForecasts.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${generateForecasts.isPending ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Revenue Forecast */}
                {forecast && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4" />
                        Predicted Revenue
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {formatCurrency(forecast.predicted_revenue)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Range: {formatCurrency(forecast.confidence_interval_low)} - {formatCurrency(forecast.confidence_interval_high)}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Target className="h-4 w-4" />
                        Predicted Closes
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {forecast.predicted_closes} deals
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Close Rate: {formatPercent(forecast.predicted_close_rate)}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        Last Updated
                      </div>
                      <div className="text-lg font-medium text-foreground">
                        {format(new Date(forecast.generated_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Breakdown by Probability */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-foreground">Breakdown by Probability</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                      <div className="flex items-center gap-2">
                        <span>🔴</span>
                        <span className="font-medium text-red-700 dark:text-red-400">Hot (&gt;70%)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-red-700 dark:text-red-400">{hotLeads.length} leads</span>
                        <span className="text-red-600 dark:text-red-400 ml-2">→ {formatCurrency(hotRevenue)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                      <div className="flex items-center gap-2">
                        <span>🟠</span>
                        <span className="font-medium text-orange-700 dark:text-orange-400">Warm (40-70%)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-orange-700 dark:text-orange-400">{warmLeads.length} leads</span>
                        <span className="text-orange-600 dark:text-orange-400 ml-2">→ {formatCurrency(warmRevenue)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <span>🟡</span>
                        <span className="font-medium text-gray-700 dark:text-gray-400">Long Shot (&lt;40%)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-700 dark:text-gray-400">{coldLeads.length} leads</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">→ {formatCurrency(coldRevenue)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Leads with Predictions */}
                {leadsWithPredictions && leadsWithPredictions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-foreground">Top Predicted Closes</h4>
                    <div className="space-y-2">
                      {leadsWithPredictions.slice(0, 5).map((lead) => (
                        <LeadPredictionCard key={lead.id} lead={lead} onView={() => navigate(`/leads/${lead.id}`)} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function LeadPredictionCard({ lead, onView }: { lead: LeadWithPrediction; onView: () => void }) {
  const probability = lead.prediction?.predicted_close_probability || 0;
  const level = getProbabilityLevel(probability);
  const factors = lead.prediction?.prediction_factors;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className={`${level.bgColor} ${level.color} border ${level.borderColor} cursor-help`}>
                {formatPercent(probability)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1 text-sm">
                <p className="font-medium">Why this probability?</p>
                {factors && (
                  <ul className="space-y-1 text-xs">
                    {factors.demoViews && factors.demoViews > 0 && (
                      <li className="text-green-600">✅ Viewed demo {factors.demoViews}x (+{Math.round((factors.demoViewBonus || 0) * 100)}%)</li>
                    )}
                    {factors.emailReplies && factors.emailReplies > 0 && (
                      <li className="text-green-600">✅ Replied to {factors.emailReplies} emails</li>
                    )}
                    {factors.leadScore && factors.leadScore >= 70 && (
                      <li className="text-green-600">✅ High lead score: {factors.leadScore}</li>
                    )}
                    {factors.daysSinceLastInteraction && factors.daysSinceLastInteraction > 5 && (
                      <li className="text-yellow-600">⚠️ {factors.daysSinceLastInteraction} days since last touch</li>
                    )}
                    <li className="text-muted-foreground">Industry avg close rate: {Math.round((factors.industryCloseRate || 0.25) * 100)}%</li>
                  </ul>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div>
          <div className="font-medium text-foreground">
            {lead.first_name} {lead.last_name}
          </div>
          <div className="text-sm text-muted-foreground">
            {lead.company}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          {lead.prediction?.predicted_deal_value && (
            <div className="font-medium text-foreground">
              {formatCurrency(lead.prediction.predicted_deal_value)}
            </div>
          )}
          {lead.prediction?.predicted_close_date && (
            <div className="text-xs text-muted-foreground">
              ~{format(new Date(lead.prediction.predicted_close_date), 'MMM d')}
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon" onClick={onView}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
