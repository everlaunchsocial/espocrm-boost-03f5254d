import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [sponsor, setSponsor] = useState<SponsorInfo | null>(null);

  useEffect(() => {
    loadPlans();
    checkAuthAndRedirect();
    if (refUsername) {
      loadSponsor(refUsername);
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if already an affiliate - if so, redirect to dashboard
        const { data: existingAffiliate } = await supabase
          .from('affiliates')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (existingAffiliate) {
          navigate('/affiliate');
          return;
        }
        
        // If there's a pending plan selection, continue with it
        if (selectedPlan) {
          handlePlanSelection(selectedPlan);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthAndRedirect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // Check if already an affiliate - redirect to dashboard
      const { data: existingAffiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingAffiliate) {
        navigate('/affiliate');
        return;
      }
    }
  };

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
      // Store in localStorage to persist across auth redirects
      localStorage.setItem('affiliate_sponsor_id', data.id);
      console.log('Sponsor found and stored:', data.username, data.id);
    } else {
      console.log('No sponsor found for ref:', refUser);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      if (authMode === 'signup') {
        if (!firstName.trim() || !lastName.trim()) {
          toast.error('Please enter your first and last name');
          setIsProcessing(false);
          return;
        }
        
        if (!username.trim()) {
          toast.error('Please enter a username');
          setIsProcessing(false);
          return;
        }

        // Check if username is available
        const { data: existingAffiliate } = await supabase
          .from('affiliates')
          .select('id')
          .eq('username', username.toLowerCase())
          .maybeSingle();

        if (existingAffiliate) {
          toast.error('This username is already taken');
          setIsProcessing(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/affiliate`,
            data: {
              username: username.toLowerCase(),
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: phone.trim(),
              sponsor_affiliate_id: sponsor?.id || null,
            },
          },
        });

        if (error) throw error;
        toast.success('Account created! Please check your email to confirm.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlanSelection = async (planCode: string) => {
    setSelectedPlan(planCode);

    if (!user) {
      setShowAuth(true);
      return;
    }

    const plan = plans.find(p => p.code === planCode);
    if (!plan) return;

    setIsProcessing(true);

    try {
      if (planCode === 'free') {
        // Free tier - create affiliate directly
        await createFreeAffiliate(plan);
      } else {
        // Paid tier - redirect to Stripe checkout
        await startStripeCheckout(plan);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  const createFreeAffiliate = async (plan: AffiliatePlan) => {
    // Check if affiliate already exists
    const { data: existingAffiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get sponsor ID from multiple sources (localStorage persists across auth redirects)
    const storedSponsorId = localStorage.getItem('affiliate_sponsor_id');
    const sponsorId = sponsor?.id || storedSponsorId || user.user_metadata?.sponsor_affiliate_id || null;
    console.log('Creating free affiliate with sponsor:', sponsorId, { sponsor: sponsor?.id, stored: storedSponsorId, meta: user.user_metadata?.sponsor_affiliate_id });

    if (existingAffiliate) {
      // Update existing affiliate to free plan
      const { error } = await supabase
        .from('affiliates')
        .update({
          affiliate_plan_id: plan.id,
          demo_credits_balance: plan.demo_credits_per_month,
          demo_credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          parent_affiliate_id: sponsorId,
        })
        .eq('id', existingAffiliate.id);

      if (error) throw error;

      // Populate genealogy
      await supabase.rpc('populate_genealogy_for_affiliate', { p_affiliate_id: existingAffiliate.id });
    } else {
      // Create new affiliate
      const usernameFromMeta = user.user_metadata?.username || email.split('@')[0];
      
      const { data: newAffiliate, error } = await supabase
        .from('affiliates')
        .insert({
          user_id: user.id,
          username: usernameFromMeta.toLowerCase().replace(/[^a-z0-9]/g, ''),
          affiliate_plan_id: plan.id,
          demo_credits_balance: plan.demo_credits_per_month,
          demo_credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          parent_affiliate_id: sponsorId,
        })
        .select()
        .single();

      if (error) throw error;

      // Update profile to affiliate role (trigger creates it as 'customer')
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ global_role: 'affiliate' })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Failed to update profile role:', profileError);
        // Try upsert as fallback
        await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            global_role: 'affiliate',
          }, { onConflict: 'user_id' });
      }

      // Populate genealogy
      if (newAffiliate) {
        await supabase.rpc('populate_genealogy_for_affiliate', { p_affiliate_id: newAffiliate.id });
      }
    }

    // Clean up localStorage after successful creation
    localStorage.removeItem('affiliate_sponsor_id');
    
    toast.success('Welcome to EverLaunch! Redirecting to your dashboard...');
    setTimeout(() => navigate('/affiliate'), 1500);
  };

  const startStripeCheckout = async (plan: AffiliatePlan) => {
    // Get sponsor ID from multiple sources (localStorage persists across auth redirects)
    const storedSponsorId = localStorage.getItem('affiliate_sponsor_id');
    const sponsorId = sponsor?.id || storedSponsorId || user.user_metadata?.sponsor_affiliate_id || null;
    console.log('Starting Stripe checkout with sponsor:', sponsorId);

    const { data, error } = await supabase.functions.invoke('affiliate-checkout', {
      body: {
        plan_code: plan.code,
        user_id: user.id,
        email: user.email,
        username: user.user_metadata?.username || email.split('@')[0],
        sponsor_affiliate_id: sponsorId,
      },
    });

    if (error) {
      // Check if it's because Stripe isn't configured yet
      if (error.message?.includes('not configured') || error.message?.includes('Stripe')) {
        toast.error('Stripe checkout is not configured yet. Please contact support or choose the free plan.');
        return;
      }
      throw error;
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL returned');
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

        {showAuth && !user && (
          <Card className="max-w-md mx-auto mb-12">
            <CardHeader>
              <CardTitle>{authMode === 'signup' ? 'Create Your Account' : 'Sign In'}</CardTitle>
              <CardDescription>
                {authMode === 'signup' 
                  ? 'Enter your details to create an affiliate account'
                  : 'Sign in to your existing account'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <>
                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Smith"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="yourname"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Your public URL: <span className="font-medium text-foreground">{username || 'yourname'}.tryeverlaunch.com</span>
                      </p>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email (personal or other)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!email) {
                            toast.error('Please enter your email first');
                            return;
                          }
                          setIsProcessing(true);
                          try {
                            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                              redirectTo: `${window.location.origin}/reset-password`,
                            });
                            if (error) throw error;
                            toast.success('Password reset email sent! Check your inbox.');
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to send reset email');
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isProcessing}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {authMode === 'signup' ? 'Create Account' : 'Sign In'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
                    className="text-primary hover:underline"
                  >
                    {authMode === 'signup' ? 'Sign in' : 'Sign up'}
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all ${
                selectedPlan === plan.code 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:shadow-md'
              }`}
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
                  onClick={() => handlePlanSelection(plan.code)}
                  disabled={isProcessing && selectedPlan === plan.code}
                >
                  {isProcessing && selectedPlan === plan.code ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {plan.code === 'free' ? 'Get Started Free' : 'Choose Plan'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {user && (
          <p className="text-center mt-8 text-muted-foreground">
            Signed in as {user.email}
          </p>
        )}
      </div>
    </div>
  );
}
