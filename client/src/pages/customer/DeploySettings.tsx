import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Code, Phone, Copy, Mail, PhoneCall, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function DeploySettings() {
  const navigate = useNavigate();
  const { 
    customerProfile, 
    chatSettings,
    twilioNumber,
    isLoading,
    updateProfile,
  } = useCustomerOnboarding();

  const [savingEmbed, setSavingEmbed] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  // Redirect if onboarding not complete
  useEffect(() => {
    if (!isLoading && customerProfile && customerProfile.onboarding_stage !== 'wizard_complete') {
      navigate('/customer/onboarding/wizard/1');
    }
  }, [customerProfile, isLoading, navigate]);

  const accountId = customerProfile?.id || '';
  const widgetId = 'default'; // Could be from chat_settings if that field exists

  const embedCode = `<script src="https://cdn.everlaunch.ai/embed.js"></script>
<script>
  EverLaunchAI.embed({
    accountId: "${accountId}",
    widgetId: "${widgetId}"
  });
</script>`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      toast.success('Embed code copied to clipboard');
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleEmailDeveloper = () => {
    const subject = encodeURIComponent('EverLaunch AI embed code');
    const body = encodeURIComponent(`Hi,

Please add the following code to our website, just before the closing </body> tag:

${embedCode}

This will enable our AI assistant on the website.

Thanks!`);
    
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopyNumber = async () => {
    if (twilioNumber) {
      try {
        await navigator.clipboard.writeText(twilioNumber);
        toast.success('Phone number copied to clipboard');
      } catch {
        toast.error('Failed to copy number');
      }
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Simple US phone formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!accountId) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/customer/settings')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Deploy & Install</h1>
              <p className="text-muted-foreground">Add your AI to your website and phone</p>
            </div>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              We couldn't find your account identifier. Please contact support so we can help you install your AI.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customer/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Deploy & Install</h1>
            <p className="text-muted-foreground">Add your AI assistant to your website and phone</p>
          </div>
        </div>

        {/* Website Embed Code Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Add your AI assistant to your website
            </CardTitle>
            <CardDescription>
              Paste this code into your website just before the closing &lt;/body&gt; tag
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm font-mono">
                <code>{embedCode}</code>
              </pre>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCopyCode} variant="default" className="gap-2">
                <Copy className="h-4 w-4" />
                Copy Code
              </Button>
              <Button onClick={handleEmailDeveloper} variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                Email to My Web Developer
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Once installed, your AI chat widget will appear in the bottom-right corner of your website.
            </p>

            {/* Embed confirmation checkbox */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
              <Checkbox
                id="embed-installed"
                checked={!!customerProfile?.embed_installed_at}
                disabled={savingEmbed}
                onCheckedChange={async (checked) => {
                  setSavingEmbed(true);
                  const success = await updateProfile({
                    embed_installed_at: checked ? new Date().toISOString() : null
                  } as any);
                  setSavingEmbed(false);
                  if (success && checked) {
                    toast.success('Marked embed as installed');
                  }
                }}
              />
              <div className="flex-1">
                <label htmlFor="embed-installed" className="text-sm font-medium cursor-pointer">
                  I've installed this code on my website
                </label>
                {customerProfile?.embed_installed_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Marked as installed on {format(new Date(customerProfile.embed_installed_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Phone Number Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Your AI phone number
            </CardTitle>
            <CardDescription>
              Customers can call this number to speak with your AI assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {twilioNumber ? (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-mono">
                        {formatPhoneNumber(twilioNumber)}
                      </p>
                      <div className="flex items-center gap-1.5 text-sm text-success">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Status: Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleCopyNumber} variant="outline" className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Number
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => toast.info('Use your mobile phone to call this number to test your AI assistant')}
                  >
                    <PhoneCall className="h-4 w-4" />
                    Test Call Instructions
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Call this number from your phone to hear your AI assistant in action. Share this number on your website, business cards, and marketing materials.
                </p>

                {/* Phone test confirmation checkbox */}
                <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
                  <Checkbox
                    id="phone-tested"
                    checked={!!customerProfile?.phone_tested_at}
                    disabled={savingPhone}
                    onCheckedChange={async (checked) => {
                      setSavingPhone(true);
                      const success = await updateProfile({
                        phone_tested_at: checked ? new Date().toISOString() : null
                      } as any);
                      setSavingPhone(false);
                      if (success && checked) {
                        toast.success('Marked phone as tested');
                      }
                    }}
                  />
                  <div className="flex-1">
                    <label htmlFor="phone-tested" className="text-sm font-medium cursor-pointer">
                      I've test-called my AI phone number
                    </label>
                    {customerProfile?.phone_tested_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Marked as tested on {format(new Date(customerProfile.phone_tested_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  We haven't assigned a phone number to your account yet. This usually happens within a few minutes after onboarding. If this persists, please contact support.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
