import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Users, AlertCircle, Chrome } from 'lucide-react';
import { useAuthRole, getRedirectPathForRole } from '@/hooks/useAuthRole';
import { Separator } from '@/components/ui/separator';

// Helper to clear all impersonation data
function clearAllImpersonation() {
  localStorage.removeItem('impersonating_affiliate_id');
  localStorage.removeItem('impersonating_affiliate_username');
  localStorage.removeItem('impersonating_customer_id');
  localStorage.removeItem('impersonating_customer_name');
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const { role, isLoading: isRoleLoading, userId, error: roleError, refetch } = useAuthRole();
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'forgot'>('login');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // If a password recovery link lands here (email templates / provider config),
    // immediately forward to the reset form while preserving tokens.
    const url = new URL(window.location.href);
    const type = url.searchParams.get('type');
    const tokenHash = url.searchParams.get('token_hash');
    const code = url.searchParams.get('code');
    const isRecoveryInHash = window.location.hash.includes('type=recovery');

    if (type === 'recovery' || tokenHash || code || isRecoveryInHash) {
      navigate(`/reset-password${window.location.search}${window.location.hash}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    // If user is logged in and we have their role, redirect them
    if (!isRoleLoading && userId && role) {
      // If there's a redirect param, use it (e.g., from welcome email)
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
        return;
      }
      
      // For affiliates, verify affiliate record exists
      if (role === 'affiliate') {
        supabase
          .from('affiliates')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()
          .then(({ data: affiliate }) => {
            if (affiliate) {
              navigate('/affiliate', { replace: true });
            } else {
              // Profile says affiliate but no record - send to complete signup
              navigate('/affiliate-signup', { replace: true });
            }
          });
      } else {
        navigate(getRedirectPathForRole(role), { replace: true });
      }
    }
  }, [isRoleLoading, userId, role, navigate, redirectTo]);

  // Handle role error with retry
  useEffect(() => {
    if (roleError && userId && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        refetch();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [roleError, userId, retryCount, refetch]);

  // Clear impersonation on initial auth page load (fresh session start)
  useEffect(() => {
    clearAllImpersonation();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
      // Clear impersonation on sign in
      if (event === 'SIGNED_IN') {
        clearAllImpersonation();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setRetryCount(0);

    try {
      if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Password reset email sent! Check your inbox.');
        setAuthMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Signed in successfully!');
        // The useAuthRole hook will pick up the session change and trigger redirect
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Google sign in failed');
      setIsProcessing(false);
    }
  };

  // Show loading state while checking auth
  if (isRoleLoading && userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Determining account type...</p>
      </div>
    );
  }

  // Show error state if role lookup failed after retries
  if (roleError && userId && retryCount >= 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Account Setup Issue</CardTitle>
            <CardDescription>
              We couldn't determine your account type. This may be a temporary issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => {
                setRetryCount(0);
                refetch();
              }}
            >
              Try Again
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/auth');
              }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">E</span>
          </div>
          <CardTitle className="text-2xl">
            {authMode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {authMode === 'forgot'
              ? 'Enter your email to receive a password reset link'
              : 'Sign in to your EverLaunch account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {authMode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-sm text-primary hover:underline"
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
            )}

            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {authMode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
            </Button>

            {authMode === 'forgot' && (
              <div className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </form>

          {authMode === 'login' && (
            <>
              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or continue with
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isProcessing}
              >
                <Chrome className="h-4 w-4 mr-2" />
                Sign in with Google
              </Button>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-border space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account yet?
            </p>
            <Button 
              variant="outline" 
              className="w-full" 
              asChild
            >
              <Link to="/affiliate-signup" className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                Become an Affiliate
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
