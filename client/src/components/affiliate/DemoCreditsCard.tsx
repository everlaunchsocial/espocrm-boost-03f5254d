import { useAffiliateCredits } from '@/hooks/useAffiliateCredits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DemoCreditsCardProps {
  compact?: boolean;
}

export function DemoCreditsCard({ compact = false }: DemoCreditsCardProps) {
  const { data: credits, isLoading } = useAffiliateCredits();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : undefined}>
          <CardTitle className={compact ? 'text-sm font-medium' : undefined}>
            Demo Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (!credits) return null;

  const { creditsBalance, creditsPerMonth, isUnlimited, daysUntilReset, planName } = credits;
  const progressValue = isUnlimited ? 100 : creditsPerMonth && creditsPerMonth > 0 
    ? ((creditsBalance ?? 0) / creditsPerMonth) * 100 
    : 0;
  const isLow = !isUnlimited && (creditsBalance ?? 0) <= 2;
  const isEmpty = !isUnlimited && (creditsBalance ?? 0) === 0;

  if (compact) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Demo Credits</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isUnlimited ? '∞' : creditsBalance ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {isUnlimited 
              ? 'Unlimited demos' 
              : `of ${creditsPerMonth} remaining`
            }
          </p>
          {!isUnlimited && (
            <Progress value={progressValue} className="mt-2 h-1" />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isEmpty ? 'border-destructive/50' : isLow ? 'border-yellow-500/50' : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Demo Credits
          </CardTitle>
          {planName && (
            <span className="text-sm font-medium text-muted-foreground">
              {planName} Plan
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold">
            {isUnlimited ? '∞' : creditsBalance ?? 0}
          </span>
          {!isUnlimited && (
            <span className="text-muted-foreground mb-1">
              / {creditsPerMonth} this month
            </span>
          )}
        </div>

        {!isUnlimited && (
          <>
            <Progress value={progressValue} className="h-2" />
            
            {daysUntilReset !== null && (
              <p className="text-sm text-muted-foreground">
                Credits reset in {daysUntilReset} day{daysUntilReset === 1 ? '' : 's'}
              </p>
            )}
          </>
        )}

        {isEmpty && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">No credits remaining</p>
              <p className="text-xs text-muted-foreground">
                Upgrade your plan to create more demos
              </p>
            </div>
          </div>
        )}

        {isLow && !isEmpty && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-600">Credits running low</p>
              <p className="text-xs text-muted-foreground">
                Consider upgrading to continue creating demos
              </p>
            </div>
          </div>
        )}

        {!isUnlimited && (isLow || isEmpty) && (
          <Button asChild className="w-full" variant={isEmpty ? 'default' : 'outline'}>
            <Link to="/affiliate-signup">
              Upgrade Plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
