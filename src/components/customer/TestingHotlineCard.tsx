import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Copy, CheckCircle, AlertTriangle, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TestingHotlineCardProps {
  customerId?: string;
  testingCode?: string | null;
}

export function TestingHotlineCard({ customerId, testingCode }: TestingHotlineCardProps) {
  const [masterNumber, setMasterNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Fetch master testing phone number from system_settings
  useEffect(() => {
    async function fetchMasterNumber() {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'master_testing_phone_number')
          .maybeSingle();

        if (data?.value) {
          setMasterNumber(data.value);
        }
      } catch (err) {
        console.error('Error fetching master number:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMasterNumber();
  }, []);

  const copyToClipboard = (text: string, type: 'code' | 'number') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      toast.success('Business code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedNumber(true);
      toast.success('Phone number copied!');
      setTimeout(() => setCopiedNumber(false), 2000);
    }
  };

  // Don't render if master number isn't configured yet
  if (!isLoading && !masterNumber) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Headphones className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-green-800 dark:text-green-200">
                Testing Hotline
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-400">
                Test without using your plan minutes
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            Free Testing
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Important Alert */}
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
            <strong>Important:</strong> Do not call your production phone number for testing. 
            Use this testing hotline instead to avoid consuming your plan minutes.
          </AlertDescription>
        </Alert>

        {/* Master Number Display */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm text-muted-foreground mb-2">Call this number:</p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xl font-bold text-foreground">
              {masterNumber}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(masterNumber!, 'number')}
              className="hover:bg-green-100 dark:hover:bg-green-900"
            >
              {copiedNumber ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Business Code Display */}
        {testingCode && (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm text-muted-foreground mb-2">Your 4-digit business code:</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-3xl font-bold tracking-widest text-primary">
                {testingCode}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(testingCode, 'code')}
                className="hover:bg-green-100 dark:hover:bg-green-900"
              >
                {copiedCode ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium text-foreground">How it works:</p>
          <ol className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold shrink-0">1</span>
              <span>Call the testing hotline above</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold shrink-0">2</span>
              <span>Enter your 4-digit business code when prompted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold shrink-0">3</span>
              <span>You'll be connected to your AI — calls are FREE!</span>
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
