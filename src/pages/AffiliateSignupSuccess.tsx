import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

export default function AffiliateSignupSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your subscription...');

  useEffect(() => {
    if (sessionId) {
      verifySession();
    } else {
      setStatus('error');
      setMessage('Missing session ID');
    }
  }, [sessionId]);

  const verifySession = async () => {
    try {
      // Call edge function to verify and complete the subscription
      const { data, error } = await supabase.functions.invoke('affiliate-checkout-success', {
        body: { session_id: sessionId },
      });

      if (error) throw error;

      if (data?.success) {
        setStatus('success');
        setMessage('Your affiliate account has been activated!');
        // Redirect to dashboard after a short delay
        setTimeout(() => navigate('/affiliate'), 3000);
      } else {
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to verify subscription');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
          )}
          {status === 'success' && (
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          )}
          {status === 'error' && (
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
          )}
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Setting Up Your Account'}
            {status === 'success' && 'Welcome to EverLaunch!'}
            {status === 'error' && 'Something Went Wrong'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'success' && (
            <p className="text-sm text-muted-foreground">
              Redirecting to your dashboard...
            </p>
          )}
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button onClick={() => navigate('/affiliate-signup')} variant="outline">
                Try Again
              </Button>
              <p className="text-sm text-muted-foreground">
                If the problem persists, please contact support.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
