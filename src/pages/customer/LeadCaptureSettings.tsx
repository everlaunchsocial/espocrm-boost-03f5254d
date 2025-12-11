import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserPlus, Mail, Phone, AlertCircle, CheckCircle2, Clock, Plus, X, TestTube, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface BusinessHours {
  monday: { enabled: boolean; open: string; close: string };
  tuesday: { enabled: boolean; open: string; close: string };
  wednesday: { enabled: boolean; open: string; close: string };
  thursday: { enabled: boolean; open: string; close: string };
  friday: { enabled: boolean; open: string; close: string };
  saturday: { enabled: boolean; open: string; close: string };
  sunday: { enabled: boolean; open: string; close: string };
}

interface LeadSourcesEnabled {
  voice: boolean;
  chat: boolean;
  form: boolean;
  callback: boolean;
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { enabled: true, open: '09:00', close: '17:00' },
  tuesday: { enabled: true, open: '09:00', close: '17:00' },
  wednesday: { enabled: true, open: '09:00', close: '17:00' },
  thursday: { enabled: true, open: '09:00', close: '17:00' },
  friday: { enabled: true, open: '09:00', close: '17:00' },
  saturday: { enabled: false, open: '09:00', close: '17:00' },
  sunday: { enabled: false, open: '09:00', close: '17:00' },
};

const DEFAULT_LEAD_SOURCES: LeadSourcesEnabled = {
  voice: true,
  chat: true,
  form: true,
  callback: true,
};

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default function LeadCaptureSettings() {
  const navigate = useNavigate();
  const { customerProfile, updateProfile, isLoading } = useCustomerOnboarding();
  
  // Section 1: Lead Sources
  const [leadSourcesEnabled, setLeadSourcesEnabled] = useState<LeadSourcesEnabled>(DEFAULT_LEAD_SOURCES);
  
  // Section 2: Notification Preferences
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [leadSmsNumber, setLeadSmsNumber] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(true);
  
  // Section 3: Business Hours
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [timezone, setTimezone] = useState('America/New_York');
  const [afterHoursBehavior, setAfterHoursBehavior] = useState('notify');
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    if (customerProfile) {
      setLeadCaptureEnabled(customerProfile.lead_capture_enabled ?? false);
      setLeadEmail(customerProfile.lead_email || '');
      setLeadSmsNumber(customerProfile.lead_sms_number || '');
      
      // Load extended fields from customer profile (cast to any to access new fields)
      const profile = customerProfile as any;
      setAdditionalEmails(profile.additional_notification_emails || []);
      setAdditionalPhones(profile.additional_notification_phones || []);
      setSmsNotificationsEnabled(profile.sms_notifications_enabled ?? true);
      setBusinessHours(profile.business_hours || DEFAULT_BUSINESS_HOURS);
      setTimezone(profile.customer_timezone || 'America/New_York');
      setAfterHoursBehavior(profile.after_hours_behavior || 'notify');
      setLeadSourcesEnabled(profile.lead_sources_enabled || DEFAULT_LEAD_SOURCES);
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

  const handleAddEmail = () => {
    if (!newEmail.trim()) return;
    if (!validateEmail(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (additionalEmails.includes(newEmail.trim())) {
      toast.error('This email is already added');
      return;
    }
    setAdditionalEmails([...additionalEmails, newEmail.trim()]);
    setNewEmail('');
    setHasChanges(true);
  };

  const handleRemoveEmail = (email: string) => {
    setAdditionalEmails(additionalEmails.filter(e => e !== email));
    setHasChanges(true);
  };

  const handleAddPhone = () => {
    if (!newPhone.trim()) return;
    if (!validatePhone(newPhone)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (additionalPhones.includes(newPhone.trim())) {
      toast.error('This phone number is already added');
      return;
    }
    setAdditionalPhones([...additionalPhones, newPhone.trim()]);
    setNewPhone('');
    setHasChanges(true);
  };

  const handleRemovePhone = (phone: string) => {
    setAdditionalPhones(additionalPhones.filter(p => p !== phone));
    setHasChanges(true);
  };

  // Auto-save helper
  const autoSave = async (updates: Record<string, any>) => {
    const success = await updateProfile(updates as any);
    if (success) {
      toast.success('Settings saved');
    }
  };

  const handleSourceToggle = async (source: keyof LeadSourcesEnabled) => {
    const newSources = { ...leadSourcesEnabled, [source]: !leadSourcesEnabled[source] };
    setLeadSourcesEnabled(newSources);
    await autoSave({ lead_sources_enabled: newSources });
  };

  const handleLeadCaptureToggle = async (checked: boolean) => {
    setLeadCaptureEnabled(checked);
    await autoSave({ lead_capture_enabled: checked });
  };

  const handleSmsToggle = async (checked: boolean) => {
    setSmsNotificationsEnabled(checked);
    await autoSave({ sms_notifications_enabled: checked });
  };

  const handleBusinessHoursChange = (day: keyof BusinessHours, field: 'enabled' | 'open' | 'close', value: boolean | string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
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
      lead_sms_number: leadSmsNumber || null,
      additional_notification_emails: additionalEmails,
      additional_notification_phones: additionalPhones,
      sms_notifications_enabled: smsNotificationsEnabled,
      business_hours: businessHours,
      customer_timezone: timezone,
      after_hours_behavior: afterHoursBehavior,
      lead_sources_enabled: leadSourcesEnabled,
    } as any);
    setIsSaving(false);

    if (success) {
      setHasChanges(false);
      toast.success('Lead routing settings saved');
    }
  };

  const handleTestNotification = async () => {
    if (!customerProfile?.id) {
      toast.error('Customer profile not found');
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-lead-and-notify', {
        body: {
          customer_id: customerProfile.id,
          lead_data: {
            first_name: 'Test',
            last_name: 'Lead',
            phone: '(555) 123-4567',
            email: 'test@example.com',
            source: 'test',
            message: 'This is a test notification to verify your lead routing settings are working correctly.',
          },
          is_test: true,
        },
      });

      if (error) throw error;
      toast.success('Test notification sent! Check your email and SMS.');
    } catch (err: any) {
      console.error('Test notification error:', err);
      toast.error(err.message || 'Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-3xl mx-auto animate-pulse space-y-4">
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
      <div className="max-w-3xl mx-auto">
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
            Configure how leads are captured, where notifications are sent, and business hours
          </p>
        </div>

        <div className="space-y-6">
          {/* Section 1: Lead Capture Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Capture Sources</CardTitle>
              <CardDescription>
                Choose which channels can capture lead information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <Label className="font-medium">Voice AI Calls</Label>
                    <p className="text-xs text-muted-foreground">Phone calls to your AI number</p>
                  </div>
                  <Switch
                    checked={leadSourcesEnabled.voice}
                    onCheckedChange={() => handleSourceToggle('voice')}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <Label className="font-medium">Web Chat</Label>
                    <p className="text-xs text-muted-foreground">Chat widget on your website</p>
                  </div>
                  <Switch
                    checked={leadSourcesEnabled.chat}
                    onCheckedChange={() => handleSourceToggle('chat')}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <Label className="font-medium">Contact Forms</Label>
                    <p className="text-xs text-muted-foreground">Form submissions on your site</p>
                  </div>
                  <Switch
                    checked={leadSourcesEnabled.form}
                    onCheckedChange={() => handleSourceToggle('form')}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <Label className="font-medium">Callback Requests</Label>
                    <p className="text-xs text-muted-foreground">Scheduled callback requests</p>
                  </div>
                  <Switch
                    checked={leadSourcesEnabled.callback}
                    onCheckedChange={() => handleSourceToggle('callback')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>
                Where should we send new lead notifications?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-start gap-3">
                  <UserPlus className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <Label className="font-medium">Enable Lead Capture</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your AI will collect contact information from callers and visitors
                    </p>
                  </div>
                </div>
                <Switch
                  checked={leadCaptureEnabled}
                  onCheckedChange={handleLeadCaptureToggle}
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
                <>
                  {/* Email Notifications */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email Notifications
                    </Label>
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="Primary email address"
                        value={leadEmail}
                        onChange={(e) => {
                          setLeadEmail(e.target.value);
                          setHasChanges(true);
                        }}
                      />
                      {/* Additional emails */}
                      {additionalEmails.map((email, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input value={email} disabled className="flex-1" />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveEmail(email)}
                            className="h-9 w-9 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {/* Add email input */}
                      <div className="flex items-center gap-2">
                        <Input
                          type="email"
                          placeholder="Add another email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleAddEmail}
                          className="h-9 w-9"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* SMS Notifications */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        SMS Notifications
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Enable SMS</span>
                        <Switch
                          checked={smsNotificationsEnabled}
                          onCheckedChange={handleSmsToggle}
                        />
                      </div>
                    </div>
                    {smsNotificationsEnabled && (
                      <div className="space-y-2">
                        <Input
                          type="tel"
                          placeholder="Primary phone number"
                          value={leadSmsNumber}
                          onChange={(e) => {
                            setLeadSmsNumber(e.target.value);
                            setHasChanges(true);
                          }}
                        />
                        {/* Additional phones */}
                        {additionalPhones.map((phone, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input value={phone} disabled className="flex-1" />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePhone(phone)}
                              className="h-9 w-9 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {/* Add phone input */}
                        <div className="flex items-center gap-2">
                          <Input
                            type="tel"
                            placeholder="Add another phone"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPhone()}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleAddPhone}
                            className="h-9 w-9"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {showRoutingError && (
                    <Alert variant="default" className="border-destructive/50 bg-destructive/10">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <AlertDescription className="text-destructive">
                        Please provide at least one contact method for lead notifications.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* What your AI will collect */}
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
                </>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Business Hours
              </CardTitle>
              <CardDescription>
                Set when your business is open for real-time notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timezone */}
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={(v) => { setTimezone(v); setHasChanges(true); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hours per day */}
              <div className="space-y-3">
                <Label>Operating Hours</Label>
                <div className="space-y-2">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center gap-3 p-2 rounded border border-border">
                      <div className="w-24">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={businessHours[day].enabled}
                            onCheckedChange={(v) => handleBusinessHoursChange(day, 'enabled', v)}
                          />
                          <span className="text-sm capitalize">{day}</span>
                        </div>
                      </div>
                      {businessHours[day].enabled ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={businessHours[day].open}
                            onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.value)}
                            className="w-28"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={businessHours[day].close}
                            onChange={(e) => handleBusinessHoursChange(day, 'close', e.target.value)}
                            className="w-28"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* After hours behavior */}
              <div className="space-y-2">
                <Label>After Hours Behavior</Label>
                <Select value={afterHoursBehavior} onValueChange={(v) => { setAfterHoursBehavior(v); setHasChanges(true); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notify">Send notifications immediately</SelectItem>
                    <SelectItem value="delay">Hold notifications until business hours</SelectItem>
                    <SelectItem value="voicemail">Take message, notify in morning</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how lead notifications are handled outside business hours
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Test Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TestTube className="h-5 w-5 text-primary" />
                Test Your Setup
              </CardTitle>
              <CardDescription>
                Send a test notification to verify your lead routing is working
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleTestNotification}
                disabled={isTesting || !leadCaptureEnabled || showRoutingError}
                variant="outline"
                className="gap-2"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Test...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4" />
                    Send Test Notification
                  </>
                )}
              </Button>
              {(!leadCaptureEnabled || showRoutingError) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Enable lead capture and add at least one notification method to test.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
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