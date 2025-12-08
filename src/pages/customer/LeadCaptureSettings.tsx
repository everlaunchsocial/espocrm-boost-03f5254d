import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, UserPlus, Mail, Phone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LeadCaptureSettings() {
  const navigate = useNavigate();
  const { customerProfile, updateProfile, isLoading } = useCustomerOnboarding();
  
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSmsNumber, setLeadSmsNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (customerProfile) {
      setLeadCaptureEnabled(customerProfile.lead_capture_enabled ?? false);
      setLeadEmail(customerProfile.lead_email || '');
      setLeadSmsNumber(customerProfile.lead_sms_number || '');
    }
  }, [customerProfile]);

  const validateEmail = (email: string) => {
    if (!email) return true;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    if (!phone) return true;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const handleToggleLeadCapture = async (checked: boolean) => {
    setLeadCaptureEnabled(checked);
    setHasChanges(true);
  };

  const handleEmailChange = (value: string) => {
    setLeadEmail(value);
    setHasChanges(true);
  };

  const handleSmsChange = (value: string) => {
    setLeadSmsNumber(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validation
    if (leadCaptureEnabled) {
      if (!leadEmail && !leadSmsNumber) {
        toast.error('Please provide at least an email or phone number for lead notifications');
        return;
      }
      if (leadEmail && !validateEmail(leadEmail)) {
        toast.error('Please enter a valid email address');
        return;
      }
      if (leadSmsNumber && !validatePhone(leadSmsNumber)) {
        toast.error('Please enter a valid phone number');
        return;
      }
    }

    setIsSaving(true);
    const success = await updateProfile({
      lead_capture_enabled: leadCaptureEnabled,
      lead_email: leadEmail || null,
      lead_sms_number: leadSmsNumber || null
    });
    setIsSaving(false);

    if (success) {
      setHasChanges(false);
      toast.success('Lead routing settings saved');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const showRoutingError = leadCaptureEnabled && !leadEmail && !leadSmsNumber;

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/customer/settings')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Lead Capture & Routing
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure how leads are captured and where notifications are sent
          </p>
        </div>

        <div className="space-y-6">
          {/* Lead Capture Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Capture</CardTitle>
              <CardDescription>
                Control whether your AI collects contact information from visitors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <UserPlus className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <Label className="font-medium">Capture leads at the end of calls and chats</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your AI will collect contact information from callers and website visitors
                    </p>
                  </div>
                </div>
                <Switch
                  checked={leadCaptureEnabled}
                  onCheckedChange={handleToggleLeadCapture}
                />
              </div>

              {!leadCaptureEnabled && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    If lead capture is disabled, your AI will not ask callers/visitors for their contact info.
                  </AlertDescription>
                </Alert>
              )}

              {leadCaptureEnabled && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">What your AI will collect:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Name (required)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Phone (required)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      Email (optional)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      Message/Notes (optional)
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Notification Routing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Routing</CardTitle>
              <CardDescription>
                Where should we send new lead notifications?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Notification */}
              <div className="space-y-2">
                <Label htmlFor="leadEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="leadEmail"
                  type="email"
                  placeholder="you@yourbusiness.com"
                  value={leadEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Receive instant email notifications for new leads
                </p>
              </div>

              {/* SMS Notification */}
              <div className="space-y-2">
                <Label htmlFor="leadSms" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  SMS Phone Number
                </Label>
                <Input
                  id="leadSms"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={leadSmsNumber}
                  onChange={(e) => handleSmsChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Receive text message alerts for new leads (optional)
                </p>
              </div>

              {showRoutingError && (
                <Alert variant="default" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    Please provide at least one contact method for lead notifications.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={isSaving || showRoutingError}
              className="min-w-[120px]"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
