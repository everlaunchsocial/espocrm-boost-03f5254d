import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Rocket, Code, Phone, Play, Mail, Copy, Check, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingStep6() {
  const navigate = useNavigate();
  const { customerProfile, twilioNumber, completeOnboarding, isLoading } = useCustomerOnboarding();
  
  const [isCopied, setIsCopied] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isTestingCall, setIsTestingCall] = useState(false);

  const embedScript = `<!-- EverLaunch AI Widget -->
<script src="https://widget.everlaunch.ai/embed.js" 
  data-customer-id="${customerProfile?.id || 'YOUR_CUSTOMER_ID'}"
  defer>
</script>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedScript);
    setIsCopied(true);
    toast.success('Embed code copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleTestCall = async () => {
    if (!twilioNumber) {
      toast.error('No phone number assigned yet. Please contact support.');
      return;
    }
    
    setIsTestingCall(true);
    // In production, this would trigger a test call via Vapi/Twilio
    toast.info(`Test call would be placed to your AI at ${twilioNumber}`);
    setTimeout(() => setIsTestingCall(false), 2000);
  };

  const handleEmailDeveloper = () => {
    const subject = encodeURIComponent('EverLaunch AI Widget Installation');
    const body = encodeURIComponent(`Hi,

Please add the following code to our website to install the EverLaunch AI chat widget.

Add this code just before the closing </body> tag:

${embedScript}

If you have any questions, let me know.

Thanks!`);
    
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast.success('Email draft opened');
  };

  const handleActivate = async () => {
    setIsActivating(true);
    await completeOnboarding();
    setIsActivating(false);
  };

  const handleBack = () => {
    navigate('/customer/onboarding/wizard/5');
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  }

  return (
    <Card className="animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <PartyPopper className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Rocket className="h-6 w-6 text-primary" />
            Ready to Deploy!
          </CardTitle>
          <CardDescription className="text-base">
            Your AI assistant for <span className="font-semibold">{customerProfile?.business_name || 'your business'}</span> is configured and ready to go.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone Number */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Your AI Phone Number</h3>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-mono font-bold text-primary">
                {twilioNumber || 'Pending Assignment'}
              </p>
              {twilioNumber && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestCall}
                  disabled={isTestingCall}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isTestingCall ? 'Calling...' : 'Test Call'}
                </Button>
              )}
            </div>
            {!twilioNumber && (
              <p className="text-sm text-muted-foreground mt-2">
                Click "Finish & Activate" below, then check your dashboard to view the status of your AI phone number.
              </p>
            )}
          </div>

          {/* Website Embed Code */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Code className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Website Embed Code</h3>
            </div>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
                {embedScript}
              </pre>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyEmbed}
                className="absolute top-2 right-2 gap-1"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Add this code to your website's HTML, just before the closing <code className="px-1 py-0.5 bg-muted rounded">&lt;/body&gt;</code> tag.
            </p>
            <Button variant="outline" onClick={handleEmailDeveloper} className="w-full gap-2">
              <Mail className="h-4 w-4" />
              Email to Web Developer
            </Button>
          </div>

          {/* Summary */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <h4 className="font-semibold mb-3">Your AI is configured with:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Voice & personality settings
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Knowledge sources from your website
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Lead capture & notifications
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Calendar & appointment settings
              </li>
            </ul>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleActivate} 
              disabled={isActivating}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isActivating ? 'Activating...' : 'Finish & Activate'}
              <Rocket className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
