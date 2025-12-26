import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTestMode } from '@/hooks/useTestMode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Lock, TestTube } from 'lucide-react';

export default function TestModeEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enableTestMode, enabled, disableTestMode } = useTestMode();
  const [manualKey, setManualKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Check for key in URL params
    const key = searchParams.get('key');
    const redirect = searchParams.get('redirect') || '/';

    if (key) {
      const success = enableTestMode(key);
      if (success) {
        setStatus('success');
        // Redirect after short delay
        setTimeout(() => {
          navigate(redirect, { replace: true });
        }, 1500);
      } else {
        setStatus('error');
      }
    }
  }, [searchParams, enableTestMode, navigate]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = enableTestMode(manualKey);
    setStatus(success ? 'success' : 'error');
    
    if (success) {
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    }
  };

  const handleDisable = () => {
    disableTestMode();
    setStatus('idle');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <TestTube className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Test Mode Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'success' ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-lg font-medium text-green-600">Test Mode Activated!</p>
              <p className="text-muted-foreground">Redirecting to app...</p>
            </div>
          ) : status === 'error' ? (
            <div className="text-center space-y-4">
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <p className="text-lg font-medium text-destructive">Invalid Test Key</p>
              <p className="text-muted-foreground">The provided key is not valid.</p>
              <Button variant="outline" onClick={() => setStatus('idle')}>
                Try Again
              </Button>
            </div>
          ) : enabled ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-lg font-medium">Test Mode is Active</p>
              <p className="text-sm text-muted-foreground">
                Automation tools can now access the app freely.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate('/')}>
                  Go to App
                </Button>
                <Button variant="destructive" onClick={handleDisable}>
                  Disable Test Mode
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Mode Key</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Enter test mode key..."
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    className="pl-10"
                    data-testid="test-mode-key-input"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" data-testid="activate-test-mode">
                Activate Test Mode
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Test mode allows automation tools to bypass authentication guards
                and access all routes for testing purposes.
              </p>
            </form>
          )}

          {/* URL Example for automation tools */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Automation URL:</strong><br />
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                /test-mode-entry?key=YOUR_KEY&redirect=/path
              </code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
