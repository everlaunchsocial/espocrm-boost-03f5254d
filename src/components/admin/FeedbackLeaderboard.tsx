import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, Trophy, TrendingDown } from 'lucide-react';
import { useFeedbackLeaderboard } from '@/hooks/useFeedbackLeaderboard';
import { useUserRole } from '@/hooks/useUserRole';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function FeedbackLeaderboard() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [daysBack, setDaysBack] = useState(30);
  const [minRatings, setMinRatings] = useState(1);

  const { data: entries = [], isLoading } = useFeedbackLeaderboard({
    daysBack,
    minRatings,
  });

  // Only show to admins
  if (roleLoading) return null;
  if (!isAdmin) return null;

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getRowClass = (percentHelpful: number) => {
    if (percentHelpful >= 80) return 'bg-success/10';
    if (percentHelpful <= 40) return 'bg-destructive/10';
    return '';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Feedback Leaderboard
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Last</span>
              <Select value={daysBack.toString()} onValueChange={(v) => setDaysBack(Number(v))}>
                <SelectTrigger className="h-7 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Min ratings</span>
              <Select value={minRatings.toString()} onValueChange={(v) => setMinRatings(Number(v))}>
                <SelectTrigger className="h-7 w-[60px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                  <SelectItem value="5">5+</SelectItem>
                  <SelectItem value="10">10+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <TrendingDown className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No feedback data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ratings will appear here as users provide feedback
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Suggestion</TableHead>
                  <TableHead className="text-center w-[80px]">
                    <div className="flex items-center justify-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5 text-success" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-[80px]">
                    <div className="flex items-center justify-center gap-1">
                      <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-[100px]">% Helpful</TableHead>
                  <TableHead className="text-center w-[80px]">Total</TableHead>
                  <TableHead className="text-right w-[120px]">Last Rated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => (
                  <TableRow key={index} className={getRowClass(entry.percentHelpful)}>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm cursor-help">
                              {truncateText(entry.suggestionText)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-sm">{entry.suggestionText}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-success font-medium">{entry.helpfulCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-destructive font-medium">{entry.notHelpfulCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={entry.percentHelpful >= 80 ? 'default' : entry.percentHelpful <= 40 ? 'destructive' : 'secondary'}
                        className={cn(
                          'font-medium',
                          entry.percentHelpful >= 80 && 'bg-success hover:bg-success/90'
                        )}
                      >
                        {entry.percentHelpful}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {entry.totalRatings}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.lastRatedAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
