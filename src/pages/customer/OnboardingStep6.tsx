import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Rocket, Code, Phone, Play, Mail, Copy, Check, PartyPopper, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

// Common US area codes for quick selection
const POPULAR_AREA_CODES = [
  { code: '212', label: 'New York, NY' },
  { code: '310', label: 'Los Angeles, CA' },
  { code: '312', label: 'Chicago, IL' },
  { code: '305', label: 'Miami, FL' },
  { code: '214', label: 'Dallas, TX' },
  { code: '404', label: 'Atlanta, GA' },
  { code: '602', label: 'Phoenix, AZ' },
  { code: '206', label: 'Seattle, WA' },
];

export default function OnboardingStep6() {
  const navigate = useNavigate();
  const { customerProfile, twilioNumber, completeOnboarding, provisionPhoneNumber, isLoading } = useCustomerOnboarding();
  
  const [isCopied, setIsCopied] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [provisionedNumber, setProvisionedNumber] = useState<string | null>(twilioNumber);

  // Sync provisionedNumber when twilioNumber resolves from async fetch
  useEffect(() => {
    if (twilioNumber) {
      setProvisionedNumber(twilioNumber);
    }
  }, [twilioNumber]);

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

  const handleProvisionPhone = async () => {
    if (!customerProfile) {
      toast.error('Customer profile not loaded');
      return;
    }

    // Validate area code if provided
    if (areaCode && (areaCode.length !== 3 || !/^\d{3}$/.test(areaCode))) {
      toast.error('Please enter a valid 3-digit area code');
      return;
    }

    setIsProvisioning(true);
    try {
      const result = await provisionPhoneNumber(areaCode || undefined);
      if (result.success && result.phoneNumber) {
        setProvisionedNumber(result.phoneNumber);
        toast.success(`Phone number ${result.phoneNumber} provisioned successfully!`);
      } else {
        toast.error(result.error || 'Failed to provision phone number');
      }
    } catch (error) {
      console.error('Provisioning error:', error);
      toast.error('Failed to provision phone number');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleTestCall = async () => {
    const numberToCall = provisionedNumber || twilioNumber;
    if (!numberToCall) {
      toast.error('No phone number assigned yet.');
      return;
    }
    
    setIsTestingCall(true);
    toast.info(`Call ${numberToCall} to test your AI assistant!`);
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

  const handleAreaCodeSelect = (code: string) => {
    setAreaCode(code);
  };

  const displayNumber = provisionedNumber || twilioNumber;

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
        {/* Phone Number Provisioning */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <Phone className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Your AI Phone Number</h3>
          </div>

          {/* TEMP: Force button to always show for testing */}
          {displayNumber && (
            <div className="flex items-center justify-between mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-2xl font-mono font-bold text-primary">
                {displayNumber}
              </p>
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
            </div>
          )}
          
          {/* Always show the button section */}
          <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose your preferred area code (optional) and provision your AI phone number.
              </p>
              
              {/* Area Code Selection */}
              <div className="space-y-2">
                <Label htmlFor="areaCode">Preferred Area Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="areaCode"
                    type="text"
                    placeholder="e.g., 212"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    maxLength={3}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground self-center">
                    or leave empty for any available
                  </span>
                </div>
              </div>

              {/* Quick Select Popular Area Codes */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Quick Select:</Label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_AREA_CODES.map((ac) => (
                    <Button
                      key={ac.code}
                      variant={areaCode === ac.code ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAreaCodeSelect(ac.code)}
                      className="text-xs"
                    >
                      {ac.code} - {ac.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Provision Button */}
              <Button
                onClick={handleProvisionPhone}
                disabled={isProvisioning}
                className="w-full gap-2"
              >
                {isProvisioning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Provisioning your phone number...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Get My AI Phone Number
                  </>
                )}
              </Button>
            </div>
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
              <Check className="h-4 w-4 text-green-500" />
              Voice & personality settings
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Knowledge sources from your website
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Lead capture & notifications
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Calendar & appointment settings
            </li>
            <li className="flex items-center gap-2">
              {displayNumber ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
              )}
              AI phone number {displayNumber ? `(${displayNumber})` : '(pending)'}
            </li>
          </ul>
        </div>

        {/* Preview AI Button */}
        {displayNumber && (
          <div className="p-4 rounded-lg bg-accent/50 border border-accent text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Want to test your AI before going live?
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/customer/preview')}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Preview Your AI
            </Button>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={handleActivate} 
            disabled={isActivating || !displayNumber}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {isActivating ? 'Activating...' : 'Finish & Activate'}
            <Rocket className="h-4 w-4" />
          </Button>
        </div>

        {!displayNumber && (
          <p className="text-xs text-center text-muted-foreground">
            Please provision your phone number before activating.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
