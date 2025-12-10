import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'forgot'>('login');

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Redirect based on role
        const { data: profile } = await supabase
          .from('profiles')
          .select('global_role')
          .eq('user_id', user.id)
          .single();

        const role = profile?.global_role || 'customer';

        if (role === 'super_admin' || role === 'admin') {
          navigate('/');
        } else if (role === 'affiliate') {
          // Check if affiliate record actually exists
          const { data: affiliate } = await supabase
            .from('affiliates')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (affiliate) {
            navigate('/affiliate');
          } else {
            // Profile says affiliate but no record - send to complete signup
            navigate('/affiliate-signup');
          }
        } else if (role === 'customer') {
          navigate('/customer');
        } else {
          navigate('/');
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip redirects for password recovery - let ResetPassword.tsx handle it
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Defer the profile fetch to avoid deadlock
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('global_role')
            .eq('user_id', session.user.id)
            .single();

          const role = profile?.global_role || 'customer';

          if (role === 'super_admin' || role === 'admin') {
            navigate('/');
          } else if (role === 'affiliate') {
            // Check if affiliate record actually exists
            const { data: affiliate } = await supabase
              .from('affiliates')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (affiliate) {
              navigate('/affiliate');
            } else {
              navigate('/affiliate-signup');
            }
          } else if (role === 'customer') {
            navigate('/customer');
          } else {
            navigate('/');
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

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
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
