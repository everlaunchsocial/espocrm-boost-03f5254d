import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowUp, Check, Sparkles, Zap, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlanDetails {
  code: string;
  name: string;
  price: number;
  features: string[];
  icon: React.ReactNode;
}

const plans: PlanDetails[] = [
  {
    code: 'basic',
    name: 'Basic',
    price: 29,
    features: ['20 demos/month', 'Email support', 'Standard analytics'],
    icon: <Zap className="h-5 w-5" />,
  },
  {
    code: 'pro',
    name: 'Pro',
    price: 99,
    features: ['50 demos/month', 'Priority support', 'Advanced analytics', 'Custom branding'],
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    code: 'agency',
    name: 'Agency',
    price: 299,
    features: ['Unlimited demos', 'White-label', 'Dedicated account manager', 'API access'],
    icon: <Crown className="h-5 w-5" />,
  },
];

const planHierarchy: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  agency: 3,
};

interface UpgradePlanSectionProps {
  currentPlanCode: string | null;
  onUpgradeComplete?: () => void;
}

export default function UpgradePlanSection({ currentPlanCode, onUpgradeComplete }: UpgradePlanSectionProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);

  const currentLevel = planHierarchy[currentPlanCode || 'free'] ?? 0;

  const handleUpgradeClick = (plan: PlanDetails) => {
    setSelectedPlan(plan);
    setConfirmDialogOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;

    setIsUpgrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to upgrade');
        return;
      }

      const response = await supabase.functions.invoke('affiliate-upgrade', {
        body: { newPlanCode: selectedPlan.code },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to upgrade');
      }

      const data = response.data;

      if (data.success) {
        // Check if we need to redirect to Stripe checkout
        if (data.requiresCheckout && data.checkoutUrl) {
          toast.info('Redirecting to payment...');
          window.location.href = data.checkoutUrl;
          return;
        }

        // Existing subscription was upgraded successfully
        toast.success(data.message || `Upgraded to ${selectedPlan.name}!`);
        setConfirmDialogOpen(false);
        onUpgradeComplete?.();
      } else {
        throw new Error(data.error || 'Upgrade failed');
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Failed to upgrade plan');
    } finally {
      setIsUpgrading(false);
    }
  };

  const currentPlan = plans.find(p => p.code === currentPlanCode);
  const upgradablePlans = plans.filter(p => planHierarchy[p.code] > currentLevel);

  if (upgradablePlans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Your Plan
          </CardTitle>
          <CardDescription>You're on the highest tier available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
            {currentPlan?.icon || <Crown className="h-6 w-6 text-primary" />}
            <div>
              <p className="font-semibold text-lg">{currentPlan?.name || 'Agency'}</p>
              <p className="text-sm text-muted-foreground">You have access to all features</p>
            </div>
            <Badge variant="secondary" className="ml-auto">Current Plan</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUp className="h-5 w-5" />
            Upgrade Your Plan
          </CardTitle>
          <CardDescription>
            {currentPlan 
              ? `You're currently on ${currentPlan.name} ($${currentPlan.price}/mo)`
              : "You're currently on the Free plan"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const planLevel = planHierarchy[plan.code];
              const isCurrent = plan.code === currentPlanCode;
              const isUpgrade = planLevel > currentLevel;
              const isDowngrade = planLevel < currentLevel;

              return (
                <div
                  key={plan.code}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary/5'
                      : isUpgrade
                      ? 'border-border hover:border-primary/50'
                      : 'border-muted opacity-50'
                  }`}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2 right-2" variant="default">
                      Current
                    </Badge>
                  )}
                  
                  <div className="flex items-center gap-2 mb-3">
                    {plan.icon}
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                  </div>
                  
                  <p className="text-2xl font-bold mb-4">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {isUpgrade && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgradeClick(plan)}
                      disabled={isUpgrading}
                    >
                      Upgrade to {plan.name}
                    </Button>
                  )}
                  
                  {isDowngrade && (
                    <Button variant="ghost" className="w-full" disabled>
                      Contact support to downgrade
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Upgrade to {selectedPlan?.name}</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                You're upgrading from{' '}
                <strong>{currentPlan?.name || 'Free'}</strong> to{' '}
                <strong>{selectedPlan?.name}</strong>.
              </p>
              <p>
                Your card will be charged a prorated amount for the remainder of this billing
                cycle, then <strong>${selectedPlan?.price}/month</strong> going forward.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isUpgrading}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmUpgrade} disabled={isUpgrading}>
              {isUpgrading ? 'Processing...' : `Upgrade to ${selectedPlan?.name}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
