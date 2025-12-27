import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const RECOVERY_TOKENS_KEY = 'pw_recovery_tokens';

type StoredRecoveryTokens = {
  type: 'recovery';
  access_token: string;
  refresh_token: string;
};

function readStoredRecoveryTokens(): StoredRecoveryTokens | null {
  try {
    const raw = sessionStorage.getItem(RECOVERY_TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRecoveryTokens>;
    if (parsed?.type !== 'recovery') return null;
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return parsed as StoredRecoveryTokens;
  } catch {
    return null;
  }
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const storedTokens = useMemo(() => readStoredRecoveryTokens(), []);

  useEffect(() => {
    // IMPORTANT: Do NOT create a session here.
    // Just detect whether a recovery link is present so we can show the form.
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const tokenHash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');

    // Legacy recovery links can arrive as URL hash params.
    // We proactively moved them into sessionStorage in src/main.tsx.
    const hasRecoveryParams =
      !!code ||
      !!tokenHash ||
      type === 'recovery' ||
      !!storedTokens;

    setIsValidSession(hasRecoveryParams);
  }, [storedTokens]);

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
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const tokenHash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type');

      // 1) Create a temporary session ONLY at submit time
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else if (type === 'recovery' && tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: tokenHash,
        });
        if (verifyError) throw verifyError;
      } else if (storedTokens) {
        // Legacy implicit flow: we prevented auto-session creation by clearing the hash early.
        // So we recreate the session manually here.
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: storedTokens.access_token,
          refresh_token: storedTokens.refresh_token,
        });
        if (setSessionError) throw setSessionError;
      } else {
        throw new Error('Invalid or expired reset link. Please request a new one.');
      }

      // 2) Update the password
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // 3) Clear stored recovery tokens and sign out to prevent "auto login" after reset
      sessionStorage.removeItem(RECOVERY_TOKENS_KEY);
      await supabase.auth.signOut();

      setIsSuccess(true);
      toast.success('Password updated successfully! Please sign in with your new password.');

      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 1500);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <Button className="w-full" onClick={() => navigate('/auth')}>
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
            <CardDescription>Redirecting you to sign in with your new password...</CardDescription>
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
          <CardDescription>Enter your new password below</CardDescription>
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
                autoComplete="new-password"
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
                autoComplete="new-password"
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
