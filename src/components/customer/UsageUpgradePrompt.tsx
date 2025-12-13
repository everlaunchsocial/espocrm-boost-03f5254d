import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, X } from 'lucide-react';

interface UsageUpgradePromptProps {
  minutesUsed: number;
  minutesIncluded: number;
  planName: string;
  onDismiss?: () => void;
}

export function UsageUpgradePrompt({ 
  minutesUsed, 
  minutesIncluded, 
  planName,
  onDismiss 
}: UsageUpgradePromptProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const percentUsed = minutesIncluded > 0 ? (minutesUsed / minutesIncluded) * 100 : 0;
  const isAt80 = percentUsed >= 80 && percentUsed < 95;
  const isAt95 = percentUsed >= 95 && percentUsed < 100;
  const isOver100 = percentUsed >= 100;

  // Don't show if under 80% or dismissed
  if (percentUsed < 80 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    navigate('/customer/billing');
  };

  const getVariant = () => {
    if (isOver100) return { bg: 'bg-destructive/10', border: 'border-destructive', text: 'text-destructive' };
    if (isAt95) return { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-600' };
    return { bg: 'bg-yellow-500/10', border: 'border-yellow-500', text: 'text-yellow-600' };
  };

  const variant = getVariant();

  return (
    <Card className={`${variant.bg} ${variant.border} border-2 relative`}>
      {isAt80 && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <CardHeader className="pb-2">
        <CardTitle className={`text-lg flex items-center gap-2 ${variant.text}`}>
          {isOver100 ? (
            <>
              <AlertTriangle className="h-5 w-5" />
              You've Exceeded Your Plan Limit
            </>
          ) : isAt95 ? (
            <>
              <AlertTriangle className="h-5 w-5" />
              Almost at Your Limit
            </>
          ) : (
            <>
              <TrendingUp className="h-5 w-5" />
              Approaching Your Plan Limit
            </>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Minutes Used</span>
            <span className="font-medium">{Math.round(minutesUsed)} / {minutesIncluded} min</span>
          </div>
          <Progress 
            value={Math.min(percentUsed, 100)} 
            className={`h-3 ${isOver100 ? '[&>div]:bg-destructive' : isAt95 ? '[&>div]:bg-orange-500' : '[&>div]:bg-yellow-500'}`}
          />
          <p className="text-sm text-muted-foreground">
            {isOver100 ? (
              `You're ${Math.round(minutesUsed - minutesIncluded)} minutes over your ${planName} plan. Overage charges will apply.`
            ) : isAt95 ? (
              `Only ${Math.round(minutesIncluded - minutesUsed)} minutes remaining on your ${planName} plan. Upgrade to avoid overage charges.`
            ) : (
              `You've used ${Math.round(percentUsed)}% of your ${planName} plan minutes.`
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleUpgrade} className="flex-1">
            {isOver100 ? 'Upgrade Now' : 'View Upgrade Options'}
          </Button>
          {isAt80 && (
            <Button variant="outline" onClick={handleDismiss}>
              Remind Me Later
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
