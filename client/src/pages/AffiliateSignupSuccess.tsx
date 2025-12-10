import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle, RefreshCw } from 'lucide-react';

export default function AffiliateSignupSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your subscription...');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (sessionId) {
      verifySession();
    } else {
      // No session ID - check if user is already an affiliate and redirect
      checkExistingAffiliate();
    }
  }, [sessionId]);

  const checkExistingAffiliate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('error');
        setMessage('Please log in to continue');
        return;
      }

      // Check if user already has an affiliate record
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (affiliate) {
        // Already an affiliate - just go to dashboard
        setStatus('success');
        setMessage('Your affiliate account is ready!');
        setTimeout(() => navigate('/affiliate'), 2000);
      } else {
        setStatus('error');
        setMessage('Missing session ID. If you completed payment, please try refreshing.');
      }
    } catch (error) {
      console.error('Check affiliate error:', error);
      setStatus('error');
      setMessage('Unable to verify your account status');
    }
  };

  const verifySession = async () => {
    setRetrying(true);
    try {
      console.log('Verifying session:', sessionId);
      
      // Call edge function to verify and complete the subscription
      const { data, error } = await supabase.functions.invoke('affiliate-checkout-success', {
        body: { session_id: sessionId },
      });

      console.log('Verification response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Verification failed');
      }

      if (data?.success) {
        setStatus('success');
        setMessage('Your affiliate account has been activated!');
        // Clean up localStorage
        localStorage.removeItem('affiliate_sponsor_id');
        // Redirect to dashboard after a short delay
        setTimeout(() => navigate('/affiliate'), 3000);
      } else {
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to verify subscription. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  const handleRetry = () => {
    if (sessionId) {
      setStatus('loading');
      setMessage('Retrying verification...');
      verifySession();
    } else {
      checkExistingAffiliate();
    }
  };

  const handleGoToDashboard = () => {
    navigate('/affiliate');
  };

  const handleContactSupport = () => {
    // Open email to support
    window.location.href = 'mailto:support@everlaunch.ai?subject=Affiliate Signup Issue&body=Session ID: ' + (sessionId || 'N/A');
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
            <>
              <p className="text-sm text-muted-foreground">
                Redirecting to your dashboard...
              </p>
              <Button onClick={handleGoToDashboard} className="w-full">
                Go to Dashboard Now
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={handleRetry} 
                variant="default" 
                className="w-full"
                disabled={retrying}
              >
                {retrying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Try Again
              </Button>
              
              <Button 
                onClick={handleGoToDashboard} 
                variant="outline" 
                className="w-full"
              >
                Go to Dashboard
              </Button>
              
              <p className="text-sm text-muted-foreground pt-2">
                If you completed payment and still see this error, your account may already be set up.
                Try going to the dashboard or contact support.
              </p>
              
              <Button 
                onClick={handleContactSupport} 
                variant="ghost" 
                className="w-full text-sm"
              >
                Contact Support
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
