import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Calendar, Clock, Bell, AlertCircle, Link, Webhook, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00'
];

export default function OnboardingStep5() {
  const navigate = useNavigate();
  const { 
    customerProfile, 
    calendarIntegration, 
    updateProfile, 
    updateCalendarIntegration, 
    isLoading 
  } = useCustomerOnboarding();
  
  const [appointmentsEnabled, setAppointmentsEnabled] = useState(false);
  const [slotLength, setSlotLength] = useState(30);
  const [sendReminders, setSendReminders] = useState(true);
  const [availability, setAvailability] = useState<Record<string, string[]>>({
    monday: ['09:00', '17:00'],
    tuesday: ['09:00', '17:00'],
    wednesday: ['09:00', '17:00'],
    thursday: ['09:00', '17:00'],
    friday: ['09:00', '17:00'],
    saturday: [],
    sunday: [],
  });
  const [isConnected, setIsConnected] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (calendarIntegration) {
      setAppointmentsEnabled(calendarIntegration.appointments_enabled ?? false);
      setSlotLength(calendarIntegration.slot_length_minutes || 30);
      setSendReminders(calendarIntegration.send_reminders ?? true);
      if (calendarIntegration.availability_json) {
        setAvailability(calendarIntegration.availability_json as Record<string, string[]>);
      }
      setIsConnected(!!calendarIntegration.access_token);
      setWebhookUrl(calendarIntegration.webhook_url || '');
    }
  }, [calendarIntegration]);

  const handleSave = async (showToast = false) => {
    const success = await updateCalendarIntegration({
      appointments_enabled: appointmentsEnabled,
      slot_length_minutes: slotLength,
      send_reminders: sendReminders,
      availability_json: availability,
      webhook_url: webhookUrl || null,
    });

    if (success && showToast) {
      toast.success('Progress saved');
    }
    
    return success;
  };

  const handleToggleAppointments = async (checked: boolean) => {
    setAppointmentsEnabled(checked);
    await updateCalendarIntegration({ appointments_enabled: checked });
  };

  const handleToggleReminders = async (checked: boolean) => {
    setSendReminders(checked);
    await updateCalendarIntegration({ send_reminders: checked });
  };

  const handleSlotLengthChange = async (value: string) => {
    const length = parseInt(value);
    setSlotLength(length);
    await updateCalendarIntegration({ slot_length_minutes: length });
  };

  const toggleDayAvailability = (day: string) => {
    setAvailability(prev => {
      const updated = { ...prev };
      if (updated[day].length > 0) {
        updated[day] = [];
      } else {
        updated[day] = ['09:00', '17:00'];
      }
      return updated;
    });
    handleSave(false);
  };

  const handleConnectGoogle = () => {
    // In production, this would initiate OAuth flow
    toast.info('Google Calendar integration coming soon!');
  };

  const handleWebhookChange = (value: string) => {
    setWebhookUrl(value);
  };

  const handleWebhookBlur = async () => {
    await updateCalendarIntegration({ webhook_url: webhookUrl || null });
    if (webhookUrl) {
      toast.success('Webhook URL saved');
    }
  };

  const handleNext = async () => {
    setIsSaving(true);
    const success = await handleSave(false);
    setIsSaving(false);

    if (success) {
      await updateProfile({
        onboarding_stage: 'wizard_step_6',
        onboarding_current_step: 6
      });
      navigate('/customer/onboarding/wizard/6');
    }
  };

  const handleBack = () => {
    navigate('/customer/onboarding/wizard/4');
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

  const hasAnySyncOption = isConnected || !!webhookUrl;

  return (
    <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Calendar & Appointments
          </CardTitle>
          <CardDescription>
            Let your AI assistant book appointments directly on your calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Appointments */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <Label className="font-medium">Enable Appointment Booking</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Allow your AI to schedule appointments with callers
                </p>
              </div>
            </div>
            <Switch
              checked={appointmentsEnabled}
              onCheckedChange={handleToggleAppointments}
            />
          </div>

          {appointmentsEnabled && (
            <div className="space-y-6 pl-4 border-l-2 border-primary/20">
              {/* Sync Options Info */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  All appointments are saved in your EverLaunch portal. Optionally sync them to your calendar or CRM below.
                </AlertDescription>
              </Alert>

              {/* Option 1: Google Calendar Connection */}
              <div className="space-y-2 p-4 rounded-lg border border-border">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  Option 1: Google Calendar
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Best for small businesses without a CRM. Appointments sync directly to your calendar.
                </p>
                <Button
                  variant={isConnected ? "secondary" : "outline"}
                  onClick={handleConnectGoogle}
                  className="w-full gap-2"
                >
                  {isConnected ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-success" />
                      Google Calendar Connected
                    </>
                  ) : (
                    <>
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4" />
                      Connect Google Calendar
                    </>
                  )}
                </Button>
              </div>

              {/* Option 2: Webhook/Zapier */}
              <div className="space-y-2 p-4 rounded-lg border border-border">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <Webhook className="h-4 w-4 text-muted-foreground" />
                  Option 2: CRM / Scheduling Software (Zapier)
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Best if you use ServiceTitan, Jobber, HouseCall Pro, or any other software. We'll push appointments there via Zapier.
                </p>
                <div className="space-y-2">
                  <Input
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    value={webhookUrl}
                    onChange={(e) => handleWebhookChange(e.target.value)}
                    onBlur={handleWebhookBlur}
                    className="font-mono text-sm"
                  />
                  <a 
                    href="https://zapier.com/app/zaps/create" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    How to set up Zapier webhook
                  </a>
                </div>
                {webhookUrl && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-success">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    Webhook configured
                  </div>
                )}
              </div>

              {!hasAnySyncOption && (
                <Alert variant="default" className="border-warning/50 bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-sm">
                    Without a sync option, appointments will be saved in your EverLaunch portal but not synced externally.
                  </AlertDescription>
                </Alert>
              )}

              {/* Slot Length */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Appointment Duration
                </Label>
                <Select value={slotLength.toString()} onValueChange={handleSlotLengthChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Availability */}
              <div className="space-y-2">
                <Label>Available Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDayAvailability(day)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
                        availability[day]?.length > 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click to toggle availability. Default hours: 9 AM - 5 PM.
                </p>
              </div>

              {/* Reminders */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <Label className="font-medium">Send Reminders</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Email reminders before appointments
                    </p>
                  </div>
                </div>
                <Switch
                  checked={sendReminders}
                  onCheckedChange={handleToggleReminders}
                />
              </div>
            </div>
          )}

          {!appointmentsEnabled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Appointment booking is disabled. Your AI will assist visitors but won't schedule meetings.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={isSaving} className="gap-2">
              {isSaving ? 'Saving...' : 'Next: Deploy'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
