import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AffiliateSignupAccount() {
  const navigate = useNavigate();
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [sponsorId, setSponsorId] = useState<string | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Read from localStorage
    const plan = localStorage.getItem('selectedPlan');
    const ref = localStorage.getItem('referrer');
    
    if (!plan) {
      // No plan selected, redirect back
      navigate('/affiliate-signup');
      return;
    }
    
    setSelectedPlan(plan);
    setReferrer(ref);
    
    // Lookup sponsor ID if referrer exists
    if (ref) {
      lookupSponsor(ref);
    }
  }, [navigate]);

  const lookupSponsor = async (refUsername: string) => {
    const { data } = await supabase
      .from('affiliates')
      .select('id')
      .eq('username', refUsername.toLowerCase())
      .maybeSingle();
    
    if (data) {
      setSponsorId(data.id);
    }
  };

  const checkUsernameAvailability = async (value: string) => {
    if (value.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setIsCheckingUsername(true);
    const { data } = await supabase
      .from('affiliates')
      .select('id')
      .eq('username', value.toLowerCase())
      .maybeSingle();
    
    setUsernameAvailable(!data);
    setIsCheckingUsername(false);
  };

  const handleUsernameChange = (value: string) => {
    // Only allow lowercase letters, numbers, and hyphens
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setUsername(sanitized);
    
    // Debounce username check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(sanitized);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlan) {
      toast.error('No plan selected');
      return;
    }
    
    if (username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    
    if (usernameAvailable === false) {
      toast.error('Username is already taken');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/affiliate`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
          },
        },
      });
      
      if (authError) {
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('Failed to create account');
      }
      
      const userId = authData.user.id;
      
      // 2. Check if plan is free or paid
      const { data: planData } = await supabase
        .from('affiliate_plans')
        .select('monthly_price, id')
        .eq('code', selectedPlan)
        .single();
      
      if (!planData) {
        throw new Error('Invalid plan selected');
      }
      
      if (planData.monthly_price === 0) {
        // FREE PLAN: Create affiliate directly
        const { error: affiliateError } = await supabase
          .from('affiliates')
          .insert({
            user_id: userId,
            username: username.toLowerCase(),
            affiliate_plan_id: planData.id,
            parent_affiliate_id: sponsorId,
            demo_credits_balance: 5, // Free plan default
            demo_credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
        
        if (affiliateError) {
          console.error('Affiliate creation error:', affiliateError);
          throw new Error('Failed to create affiliate record');
        }
        
        // Update profile role to affiliate
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ global_role: 'affiliate' })
          .eq('user_id', userId);
        
        if (profileError) {
          console.error('Profile update error:', profileError);
        }
        
        // Populate genealogy
        const { data: newAffiliate } = await supabase
          .from('affiliates')
          .select('id')
          .eq('user_id', userId)
          .single();
        
        if (newAffiliate) {
          await supabase.rpc('populate_genealogy_for_affiliate', {
            p_affiliate_id: newAffiliate.id,
          });
        }
        
        // Clear localStorage
        localStorage.removeItem('selectedPlan');
        localStorage.removeItem('referrer');
        
        toast.success('Account created successfully!');
        navigate('/affiliate');
      } else {
        // PAID PLAN: Redirect to Stripe checkout
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          'affiliate-checkout',
          {
            body: {
              plan_code: selectedPlan,
              user_id: userId,
              email,
              username: username.toLowerCase(),
              sponsor_affiliate_id: sponsorId,
            },
          }
        );
        
        if (checkoutError || !checkoutData?.url) {
          console.error('Checkout error:', checkoutError, checkoutData);
          throw new Error(checkoutData?.error || 'Failed to create checkout session');
        }
        
        // Redirect to Stripe
        window.location.href = checkoutData.url;
      }
    } catch (error) {
      console.error('Signup error:', error);
      const message = error instanceof Error ? error.message : 'Signup failed';
      toast.error(message);
      setIsLoading(false);
    }
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/affiliate-signup')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Plans
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Selected plan: <span className="font-medium capitalize">{selectedPlan}</span>
              {referrer && (
                <span className="block mt-1">
                  Referred by: <span className="text-primary">{referrer}</span>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">
                  Username *
                  {isCheckingUsername && (
                    <Loader2 className="h-3 w-3 animate-spin inline ml-2" />
                  )}
                  {usernameAvailable === true && (
                    <span className="text-green-500 text-sm ml-2">Available</span>
                  )}
                  {usernameAvailable === false && (
                    <span className="text-destructive text-sm ml-2">Taken</span>
                  )}
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="yourname"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be your referral link: tryeverlaunch.com/{username || 'yourname'}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 6 characters
                </p>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || usernameAvailable === false}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : selectedPlan === 'free' ? (
                  'Create Free Account'
                ) : (
                  'Continue to Payment'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
