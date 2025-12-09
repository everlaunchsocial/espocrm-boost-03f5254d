import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    loadPlans();
    if (refUsername) {
      loadSponsor(refUsername);
    }
  }, [refUsername]);

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const { data, error } = await supabase
        .from('affiliates')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      
      setUsernameAvailable(!data && !error);
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

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
    // Use RPC to bypass RLS for public sponsor lookup
    const { data, error } = await supabase.rpc('get_affiliate_id_by_username', {
      p_username: refUser.toLowerCase()
    });

    if (data && !error) {
      setSponsor({ id: data, username: refUser });
    } else {
      console.error('[loadSponsor] Failed to load sponsor:', error);
    }
  };

  const validateForm = (): boolean => {
    if (!username || username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return false;
    }
    if (usernameAvailable === false) {
      toast.error('Username is already taken');
      return false;
    }
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return false;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (!firstName.trim()) {
      toast.error('First name is required');
      return false;
    }
    if (!lastName.trim()) {
      toast.error('Last name is required');
      return false;
    }
    return true;
  };

  const logSignupEvent = async (eventName: string, step: string, planCode?: string) => {
    try {
      await supabase.from('signup_events').insert({
        email: email || null,
        username: username || null,
        plan: planCode || null,
        referrer: sponsor?.username || null,
        event_name: eventName,
        step: step,
      });
    } catch (error) {
      console.error('Failed to log signup event:', error);
    }
  };

  const handlePlanSelect = async (planCode: string) => {
    if (!validateForm()) return;
    
    setSelectedPlanCode(planCode);
    setIsSubmitting(true);

    // Log signup started event
    await logSignupEvent('signup_started', 'account_form', planCode);

    try {
      const selectedPlan = plans.find(p => p.code === planCode);
      if (!selectedPlan) {
        toast.error('Invalid plan selected');
        setIsSubmitting(false);
        return;
      }

      // Create the Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast.error(authError.message);
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        toast.error('Failed to create account');
        setIsSubmitting(false);
        return;
      }

      const userId = authData.user.id;

      // For FREE plan, create affiliate directly
      if (selectedPlan.monthly_price === 0) {
        // Update profile to affiliate role
        await supabase
          .from('profiles')
          .update({ global_role: 'affiliate' })
          .eq('user_id', userId);

        // Create affiliate record
        const { error: affiliateError } = await supabase
          .from('affiliates')
          .insert({
            user_id: userId,
            username: username.toLowerCase(),
            affiliate_plan_id: selectedPlan.id,
            parent_affiliate_id: sponsor?.id || null,
            demo_credits_balance: selectedPlan.demo_credits_per_month || 0,
          });

        if (affiliateError) {
          console.error('Affiliate creation error:', affiliateError);
          toast.error('Failed to create affiliate account');
          setIsSubmitting(false);
          return;
        }

        // Log account created event
        await logSignupEvent('account_created', 'complete', planCode);

        toast.success('Account created successfully!');
        navigate('/affiliate');
        return;
      }

      // For PAID plans, redirect to Stripe checkout
      // Log stripe redirect event
      await logSignupEvent('stripe_redirect', 'stripe_checkout', planCode);

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('affiliate-checkout', {
        body: {
          planCode: planCode,
          email: email,
          userId: userId,
          username: username.toLowerCase(),
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          sponsorId: sponsor?.id || null,
        }
      });

      if (checkoutError) {
        console.error('Checkout error:', checkoutError);
        toast.error('Failed to start checkout');
        setIsSubmitting(false);
        return;
      }

      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      } else {
        toast.error('No checkout URL received');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An error occurred during signup');
      setIsSubmitting(false);
    }
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Become an EverLaunch Affiliate
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Earn 30% commissions selling AI receptionists to local businesses.
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

        {/* Account Creation Form */}
        <Card className="max-w-xl mx-auto mb-10">
          <CardHeader>
            <CardTitle className="text-center">Create Your Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  placeholder="johndoe"
                  disabled={isSubmitting}
                />
                {checkingUsername && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
              {usernameAvailable === false && (
                <p className="text-sm text-destructive">Username is already taken</p>
              )}
              <p className="text-xs text-muted-foreground">Your referral link: tryeverlaunch.com/{username || 'username'}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing Cards */}
        <h2 className="text-2xl font-bold text-center mb-6">Choose Your Plan</h2>
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
                  disabled={isSubmitting}
                >
                  {isSubmitting && selectedPlanCode === plan.code ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {plan.monthly_price === 0 ? 'Start Free' : 'Get Started'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
