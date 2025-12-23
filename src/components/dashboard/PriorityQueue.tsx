import { useState } from 'react';
import { usePriorityLeads, useRecalculateScores, getScoreLevel, ScoreFactorsType } from '@/hooks/useLeadScores';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Phone, Mail, Eye, ChevronDown, ChevronUp, RefreshCw, Target, Loader2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export function PriorityQueue() {
  const { isEnabled } = useFeatureFlags();
  const [isOpen, setIsOpen] = useState(true);
  
  const { data: priorityLeads = [], isLoading, refetch } = usePriorityLeads(10);
  const recalculateMutation = useRecalculateScores();

  if (!isEnabled('aiCrmPhase4')) {
    return null;
  }

  const handleRecalculate = async () => {
    await recalculateMutation.mutateAsync();
    refetch();
  };

  return (
    <Card className="border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                🎯 Priority Leads ({priorityLeads.length})
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculateMutation.isPending}
            >
              {recalculateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Recalculate</span>
            </Button>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : priorityLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No scored leads yet.</p>
                <p className="text-sm">Click "Recalculate" to generate lead scores.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {priorityLeads.map((lead) => {
                  const score = lead.lead_scores[0];
                  const scoreInfo = getScoreLevel(score?.overall_score || 0);
                  const factors = score?.score_factors as ScoreFactorsType | null;

                  return (
                    <div
                      key={lead.id}
                      className={`p-4 rounded-lg border ${
                        scoreInfo.level === 'hot'
                          ? 'border-destructive/50 bg-destructive/5'
                          : scoreInfo.level === 'warm'
                          ? 'border-warning/50 bg-warning/5'
                          : scoreInfo.level === 'lukewarm'
                          ? 'border-yellow-500/50 bg-yellow-50'
                          : 'border-border bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              to={`/leads?id=${lead.id}`}
                              className="font-medium text-foreground hover:text-primary truncate"
                            >
                              {lead.first_name} {lead.last_name}
                            </Link>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${scoreInfo.bgClass} ${scoreInfo.colorClass}`}
                                  >
                                    {scoreInfo.emoji} {score?.overall_score || 0}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-2">
                                    <p className="font-medium">Score Breakdown</p>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex justify-between">
                                        <span>Engagement:</span>
                                        <span>{score?.engagement_score || 0}/100</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Urgency:</span>
                                        <span>{score?.urgency_score || 0}/100</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Fit:</span>
                                        <span>{score?.fit_score || 0}/100</span>
                                      </div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          
                          {lead.company && (
                            <p className="text-sm text-muted-foreground truncate">
                              {lead.company}
                            </p>
                          )}

                          {/* Score breakdown bars */}
                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-20">Engagement</span>
                              <Progress value={score?.engagement_score || 0} className="h-1.5 flex-1" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-20">Urgency</span>
                              <Progress value={score?.urgency_score || 0} className="h-1.5 flex-1" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-20">Fit</span>
                              <Progress value={score?.fit_score || 0} className="h-1.5 flex-1" />
                            </div>
                          </div>

                          {/* Why this score tooltip */}
                          {factors && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    Why this score?
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-sm">
                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <p className="font-medium mb-1">Engagement factors:</p>
                                      <ul className="list-disc list-inside text-muted-foreground">
                                        <li>{factors.engagement.demo_views} demo views</li>
                                        <li>{factors.engagement.email_opens} email opens</li>
                                        <li>{factors.engagement.replies > 0 ? 'Has replied' : 'No replies yet'}</li>
                                        <li>{factors.engagement.days_since_interaction} days since interaction</li>
                                      </ul>
                                    </div>
                                    <div>
                                      <p className="font-medium mb-1">Urgency factors:</p>
                                      <ul className="list-disc list-inside text-muted-foreground">
                                        <li>{factors.urgency.days_in_status} days in {factors.urgency.status_type}</li>
                                        <li>{factors.urgency.follow_ups_ignored} follow-ups ignored</li>
                                      </ul>
                                    </div>
                                    <div>
                                      <p className="font-medium mb-1">Fit factors:</p>
                                      <ul className="list-disc list-inside text-muted-foreground">
                                        <li>{factors.fit.industry_match ? '✓' : '✗'} Industry match</li>
                                        <li>{factors.fit.has_website ? '✓' : '✗'} Has website</li>
                                        <li>{factors.fit.has_reviews ? '✓' : '✗'} Has reviews</li>
                                        {factors.fit.review_rating && (
                                          <li>Rating: {factors.fit.review_rating}/5</li>
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {score?.last_calculated && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Updated {formatDistanceToNow(new Date(score.last_calculated), { addSuffix: true })}
                            </p>
                          )}
                        </div>

                        {/* Quick actions */}
                        <div className="flex flex-col gap-1">
                          {lead.phone && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={`tel:${lead.phone}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {lead.email && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={`mailto:${lead.email}`}>
                                <Mail className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link to={`/leads?id=${lead.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
