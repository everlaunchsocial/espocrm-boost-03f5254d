import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, UserPlus, Mail, Phone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function OnboardingStep4() {
  const navigate = useNavigate();
  const { customerProfile, updateProfile, isLoading } = useCustomerOnboarding();
  
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSmsNumber, setLeadSmsNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async (showToast = false) => {
    const success = await updateProfile({
      lead_capture_enabled: leadCaptureEnabled,
      lead_email: leadEmail,
      lead_sms_number: leadSmsNumber
    });

    if (success && showToast) {
      toast.success('Progress saved');
    }
    
    return success;
  };

  const handleBlur = () => {
    handleSave(false);
  };

  const handleToggleLeadCapture = async (checked: boolean) => {
    setLeadCaptureEnabled(checked);
    await updateProfile({ lead_capture_enabled: checked });
  };

  const handleNext = async () => {
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
    const success = await handleSave(false);
    setIsSaving(false);

    if (success) {
      await updateProfile({
        onboarding_stage: 'wizard_step_5',
        onboarding_current_step: 5
      });
      navigate('/customer/onboarding/wizard/5');
    }
  };

  const handleBack = () => {
    navigate('/customer/onboarding/wizard/3');
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Lead Capture & Routing
          </CardTitle>
          <CardDescription>
            Configure how you receive leads and notifications when your AI captures new prospects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Lead Capture */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <UserPlus className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <Label className="font-medium">Enable Lead Capture</Label>
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

          {leadCaptureEnabled && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <p className="text-sm text-muted-foreground">
                Where should we send new lead notifications?
              </p>

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
                  onChange={(e) => setLeadEmail(e.target.value)}
                  onBlur={handleBlur}
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
                  onChange={(e) => setLeadSmsNumber(e.target.value)}
                  onBlur={handleBlur}
                />
                <p className="text-xs text-muted-foreground">
                  Receive text message alerts for new leads (optional)
                </p>
              </div>

              {leadCaptureEnabled && !leadEmail && !leadSmsNumber && (
                <Alert variant="default" className="border-warning/50 bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-sm">
                    Please provide at least one contact method for lead notifications.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {!leadCaptureEnabled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Lead capture is disabled. Your AI will still help visitors but won't collect their contact information.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={isSaving} className="gap-2">
              {isSaving ? 'Saving...' : 'Next: Calendar'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
