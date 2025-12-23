import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  ExternalLink,
  Shield,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  HelpCircle,
  Copy,
  RefreshCw,
  Award,
  XCircle
} from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { 
  useCompetitorsWithStats, 
  useWinLossSummary, 
  useBattleCard,
  getCategoryLabel,
  CompetitorWithStats,
  BattleCardContent
} from '@/hooks/useCompetitiveIntel';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function Competitors() {
  const { isEnabled } = useFeatureFlags();
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);

  const { data: competitors, isLoading: competitorsLoading } = useCompetitorsWithStats();
  const { data: winLossSummary, isLoading: summaryLoading } = useWinLossSummary(30);

  if (!isEnabled('aiCrmPhase4')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">This feature is not enabled.</p>
      </div>
    );
  }

  const isLoading = competitorsLoading || summaryLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">🎯 Competitive Intelligence</h1>
        <p className="text-muted-foreground mt-1">Track competitors, analyze wins/losses, and access battle cards.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Competitors List */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Competitors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {competitors?.map((competitor, index) => (
                  <CompetitorRow 
                    key={competitor.id} 
                    competitor={competitor} 
                    rank={index + 1}
                    onViewBattleCard={() => setSelectedCompetitorId(competitor.id)}
                  />
                ))}
                {(!competitors || competitors.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No competitors tracked yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Win/Loss Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Win/Loss Summary
                </CardTitle>
                <p className="text-sm text-muted-foreground">Last 30 days</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-2xl font-bold text-green-600">{winLossSummary?.totalWins || 0}</div>
                    <div className="text-xs text-green-600">Wins</div>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div className="text-2xl font-bold text-red-600">{winLossSummary?.totalLosses || 0}</div>
                    <div className="text-xs text-red-600">Losses</div>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <div className="text-2xl font-bold text-primary">{winLossSummary?.winRate || 0}%</div>
                    <div className="text-xs text-primary">Win Rate</div>
                  </div>
                </div>

                {winLossSummary && Object.keys(winLossSummary.lossByReason).length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Losses by Reason</h4>
                    <div className="space-y-2">
                      {Object.entries(winLossSummary.lossByReason)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 4)
                        .map(([reason, count]) => (
                          <div key={reason} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground truncate">{reason}</span>
                            <Badge variant="outline" className="text-red-600">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {winLossSummary && Object.keys(winLossSummary.winByReason).length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Wins by Reason</h4>
                    <div className="space-y-2">
                      {Object.entries(winLossSummary.winByReason)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 4)
                        .map(([reason, count]) => (
                          <div key={reason} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground truncate">{reason}</span>
                            <Badge variant="outline" className="text-green-600">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Battle Card Modal */}
      <BattleCardModal 
        competitorId={selectedCompetitorId} 
        onClose={() => setSelectedCompetitorId(null)} 
      />
    </div>
  );
}

function CompetitorRow({ 
  competitor, 
  rank,
  onViewBattleCard 
}: { 
  competitor: CompetitorWithStats; 
  rank: number;
  onViewBattleCard: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-lg font-bold text-muted-foreground w-6">{rank}.</div>
        <div>
          <div className="font-medium text-foreground flex items-center gap-2">
            {competitor.name}
            {competitor.website && (
              <a href={competitor.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Mentioned: {competitor.mention_count} times
            {competitor.last_mentioned && (
              <span> • Last: {formatDistanceToNow(new Date(competitor.last_mentioned), { addSuffix: true })}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="flex items-center gap-1">
            {competitor.win_rate >= 50 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={`font-medium ${competitor.win_rate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
              {competitor.win_rate}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground">Win rate vs</div>
        </div>
        <Button variant="outline" size="sm" onClick={onViewBattleCard}>
          View Battle Card
        </Button>
      </div>
    </div>
  );
}

function BattleCardModal({ competitorId, onClose }: { competitorId: string | null; onClose: () => void }) {
  const { data: battleCard, isLoading } = useBattleCard(competitorId || undefined);

  const handleCopy = () => {
    if (!battleCard) return;
    
    const content = formatBattleCardAsText(battleCard.competitor?.name || '', battleCard.card_content);
    navigator.clipboard.writeText(content);
    toast.success('Battle card copied to clipboard');
  };

  return (
    <Dialog open={!!competitorId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ⚔️ Battle Card: {battleCard?.competitor?.name || 'Loading...'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : battleCard ? (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Overview */}
              {battleCard.card_content.competitor_overview && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">📝 OVERVIEW</h3>
                  <p className="text-foreground">{battleCard.card_content.competitor_overview}</p>
                </div>
              )}

              {/* Our Advantages */}
              {battleCard.card_content.our_advantages && battleCard.card_content.our_advantages.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-green-600 mb-2 flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    OUR ADVANTAGES
                  </h3>
                  <div className="space-y-3">
                    {battleCard.card_content.our_advantages.map((adv, i) => (
                      <div key={i} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                        <div className="font-medium text-green-700 dark:text-green-400">{adv.point}</div>
                        {adv.proof && <div className="text-sm text-green-600 mt-1">→ {adv.proof}</div>}
                        {adv.how_to_position && (
                          <div className="text-sm text-green-600 mt-1 flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {adv.how_to_position}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Their Advantages */}
              {battleCard.card_content.their_advantages && battleCard.card_content.their_advantages.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-yellow-600 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    THEIR ADVANTAGES
                  </h3>
                  <div className="space-y-3">
                    {battleCard.card_content.their_advantages.map((adv, i) => (
                      <div key={i} className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
                        <div className="font-medium text-yellow-700 dark:text-yellow-400">{adv.point}</div>
                        {adv.counter && (
                          <div className="text-sm text-yellow-600 mt-1 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            Counter: {adv.counter}
                          </div>
                        )}
                        {adv.when_to_concede && (
                          <div className="text-sm text-yellow-600/70 mt-1">When to concede: {adv.when_to_concede}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Landmines */}
              {battleCard.card_content.landmines && battleCard.card_content.landmines.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-red-600 mb-2 flex items-center gap-1">
                    💣 LANDMINES (DON'T MENTION)
                  </h3>
                  <ul className="space-y-2">
                    {battleCard.card_content.landmines.map((landmine, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-600">
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {landmine}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Differentiators */}
              {battleCard.card_content.key_differentiators && battleCard.card_content.key_differentiators.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-primary mb-2">🎯 KEY DIFFERENTIATORS</h3>
                  <ul className="space-y-1">
                    {battleCard.card_content.key_differentiators.map((diff, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary">•</span>
                        {diff}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trap Questions */}
              {battleCard.card_content.trap_questions && battleCard.card_content.trap_questions.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-orange-600 mb-2 flex items-center gap-1">
                    🔥 TRAP QUESTIONS (Ask These)
                  </h3>
                  <ol className="space-y-2">
                    {battleCard.card_content.trap_questions.map((question, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="font-medium text-orange-600">{i + 1}.</span>
                        <span className="italic">"{question}"</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-muted-foreground pt-4 border-t border-border">
                Last updated: {format(new Date(battleCard.last_updated), 'MMM d, yyyy h:mm a')}
                {battleCard.auto_generated && <span className="ml-2">• AI Generated</span>}
                <span className="ml-2">• Version {battleCard.version}</span>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No battle card found for this competitor.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleCopy} disabled={!battleCard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Card
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatBattleCardAsText(name: string, content: BattleCardContent): string {
  let text = `⚔️ Battle Card: ${name}\n\n`;

  if (content.competitor_overview) {
    text += `📝 OVERVIEW\n${content.competitor_overview}\n\n`;
  }

  if (content.our_advantages?.length) {
    text += `✅ OUR ADVANTAGES\n`;
    content.our_advantages.forEach((adv, i) => {
      text += `${i + 1}. ${adv.point}\n`;
      if (adv.how_to_position) text += `   🎯 ${adv.how_to_position}\n`;
    });
    text += '\n';
  }

  if (content.their_advantages?.length) {
    text += `⚠️ THEIR ADVANTAGES\n`;
    content.their_advantages.forEach((adv, i) => {
      text += `${i + 1}. ${adv.point}\n`;
      if (adv.counter) text += `   💡 Counter: ${adv.counter}\n`;
    });
    text += '\n';
  }

  if (content.landmines?.length) {
    text += `💣 LANDMINES\n`;
    content.landmines.forEach(l => text += `• ${l}\n`);
    text += '\n';
  }

  if (content.trap_questions?.length) {
    text += `🔥 TRAP QUESTIONS\n`;
    content.trap_questions.forEach((q, i) => text += `${i + 1}. "${q}"\n`);
  }

  return text;
}
