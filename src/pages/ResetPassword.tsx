import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // This page must always render the reset form when reached via a valid recovery link.
    // Support both legacy hash tokens and the newer query-param flows.

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
    });

    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const searchType = url.searchParams.get('type');
        const searchCode = url.searchParams.get('code');
        const tokenHash = url.searchParams.get('token_hash');

        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const hashType = hashParams.get('type');
        const accessToken = hashParams.get('access_token');

        const type = searchType ?? hashType;

        // Newer PKCE-style flow
        if (searchCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(searchCode);
          if (error) throw error;
          setIsValidSession(true);
          return;
        }

        // token_hash recovery flow
        if (type === 'recovery' && tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          });
          if (error) throw error;
          setIsValidSession(true);
          return;
        }

        // Legacy hash flow
        if (type === 'recovery' && accessToken) {
          setIsValidSession(true);
          return;
        }

        // Fallback: only treat as valid if we have a session AND the URL indicates recovery
        const { data: { session } } = await supabase.auth.getSession();
        const hasRecoveryHint =
          type === 'recovery' ||
          url.search.includes('type=recovery') ||
          window.location.hash.includes('type=recovery');

        setIsValidSession(!!session && hasRecoveryHint);
      } catch {
        setIsValidSession(false);
      }
    };

    init();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      // SECURITY: Sign out after password update to force fresh login
      // This ensures the user must authenticate with their new password
      await supabase.auth.signOut();
      
      setIsSuccess(true);
      toast.success('Password updated successfully! Please sign in with your new password.');
      
      // Redirect to login page after brief delay
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  // Still checking session validity
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Invalid or expired reset link
  if (isValidSession === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Reset Link Expired</CardTitle>
            <CardDescription>
              Invalid or expired reset link. Please request a new password reset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>Password Updated!</CardTitle>
            <CardDescription>
              Redirecting you to sign in with your new password...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
