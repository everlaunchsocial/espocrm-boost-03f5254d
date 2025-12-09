import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Zap, Crown, Building2, Sparkles, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface AffiliatePlan {
  id: string;
  name: string;
  code: string;
  monthly_price: number;
  demo_credits_per_month: number | null;
  stripe_price_id: string | null;
}

interface SponsorInfo {
  id: string;
  username: string;
}

const planIcons: Record<string, React.ReactNode> = {
  free: <Sparkles className="h-6 w-6" />,
  basic: <Zap className="h-6 w-6" />,
  pro: <Crown className="h-6 w-6" />,
  agency: <Building2 className="h-6 w-6" />,
};

export default function AffiliateSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refUsername = searchParams.get('ref');
  
  const [plans, setPlans] = useState<AffiliatePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sponsor, setSponsor] = useState<SponsorInfo | null>(null);

  useEffect(() => {
    loadPlans();
    if (refUsername) {
      loadSponsor(refUsername);
    }
  }, [refUsername]);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('affiliate_plans')
      .select('*')
      .eq('is_active', true)
      .order('monthly_price', { ascending: true });

    if (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load plans');
    } else {
      setPlans(data || []);
    }
    setIsLoading(false);
  };

  const loadSponsor = async (refUser: string) => {
    const { data, error } = await supabase
      .from('affiliates')
      .select('id, username')
      .eq('username', refUser.toLowerCase())
      .maybeSingle();

    if (data && !error) {
      setSponsor({ id: data.id, username: data.username });
    }
  };

  const handlePlanSelect = (planCode: string) => {
    // Store selected plan in localStorage
    localStorage.setItem('selectedPlan', planCode);
    
    // Store referrer if present
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referrer', ref);
    }
    
    // Navigate to account creation page
    navigate('/affiliate-signup/account');
  };

  const formatCredits = (credits: number | null) => {
    if (credits === null || credits === -1) return 'Unlimited';
    return `${credits} demos/month`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Become an EverLaunch Affiliate
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Earn 30% commissions selling AI receptionists to local businesses. Choose your plan to get started.
          </p>
          
          {sponsor && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Referred by <strong className="text-primary">{sponsor.username}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className="relative transition-all hover:shadow-md"
            >
              {plan.code === 'pro' && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {planIcons[plan.code]}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">${plan.monthly_price}</span>
                  {plan.monthly_price > 0 && <span className="text-muted-foreground">/month</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-2 px-3 bg-muted rounded-lg">
                  <span className="font-medium">{formatCredits(plan.demo_credits_per_month)}</span>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>30% commission on sales</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Personalized demo links</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Lead tracking dashboard</span>
                  </li>
                  {(plan.code === 'pro' || plan.code === 'agency') && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Priority support</span>
                    </li>
                  )}
                  {plan.code === 'agency' && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>White-label options</span>
                    </li>
                  )}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.code === 'pro' ? 'default' : 'outline'}
                  onClick={() => handlePlanSelect(plan.code)}
                >
                  Next
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
