import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Bell, AlertCircle, Link, ArrowLeft, Loader2, Webhook, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function CalendarSettings() {
  const navigate = useNavigate();
  const { 
    customerProfile, 
    calendarIntegration, 
    updateCalendarIntegration, 
    isLoading,
  } = useCustomerOnboarding();
  
  const [appointmentsEnabled, setAppointmentsEnabled] = useState(false);
  const [slotLength, setSlotLength] = useState(30);
  const [sendReminders, setSendReminders] = useState(true);
  const [reminderOffset, setReminderOffset] = useState(1440); // 24 hours in minutes
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

  // Redirect if onboarding not complete
  useEffect(() => {
    if (!isLoading && customerProfile && customerProfile.onboarding_stage !== 'wizard_complete') {
      navigate('/customer/onboarding/wizard/1');
    }
  }, [customerProfile, isLoading, navigate]);

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

  const handleSave = async () => {
    setIsSaving(true);
    
    const success = await updateCalendarIntegration({
      appointments_enabled: appointmentsEnabled,
      slot_length_minutes: slotLength,
      send_reminders: sendReminders,
      availability_json: availability,
      webhook_url: webhookUrl || null,
    });

    setIsSaving(false);

    if (success) {
      toast.success('Calendar & appointment settings saved');
    } else {
      toast.error('Failed to save settings');
    }
  };

  const handleToggleAppointments = (checked: boolean) => {
    setAppointmentsEnabled(checked);
  };

  const handleToggleReminders = (checked: boolean) => {
    setSendReminders(checked);
  };

  const handleSlotLengthChange = (value: string) => {
    setSlotLength(parseInt(value));
  };

  const handleReminderOffsetChange = (value: string) => {
    setReminderOffset(parseInt(value));
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
  };

  const handleConnectGoogle = () => {
    // In production, this would initiate OAuth flow
    toast.info('Google Calendar integration coming soon!');
  };

  const handleDisconnectGoogle = async () => {
    const success = await updateCalendarIntegration({
      access_token: null,
      refresh_token: null,
    });
    
    if (success) {
      setIsConnected(false);
      toast.success('Calendar disconnected. Your AI will stop booking appointments.');
    } else {
      toast.error('Failed to disconnect calendar');
    }
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

  const hasAnySyncOption = isConnected || !!webhookUrl;

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customer/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Calendar & Appointments</h1>
            <p className="text-muted-foreground">Manage how your AI books appointments</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Appointment Booking
            </CardTitle>
            <CardDescription>
              Control whether your AI can book appointments with callers and visitors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable Appointments Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <Label className="font-medium">Allow AI to book appointments on my calendar</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    When enabled, your AI will offer to schedule appointments for callers
                  </p>
                </div>
              </div>
              <Switch
                checked={appointmentsEnabled}
                onCheckedChange={handleToggleAppointments}
              />
            </div>

            {!appointmentsEnabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  When disabled, your AI will not offer to book appointments for callers or visitors.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Sync Options Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              Appointment Sync Options
            </CardTitle>
            <CardDescription>
              All appointments are saved in your EverLaunch portal. Optionally sync them externally.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Option 1: Google Calendar */}
            <div className="space-y-3 p-4 rounded-lg border border-border">
              <Label className="flex items-center gap-2 text-base font-medium">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4" />
                Google Calendar
              </Label>
              <p className="text-sm text-muted-foreground">
                Best for small businesses without a CRM. Appointments sync directly to your calendar.
              </p>
              {isConnected ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-success/30 bg-success/5">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                    <div>
                      <p className="font-medium text-sm">Connected to Google Calendar</p>
                      <p className="text-xs text-muted-foreground">Your calendar is synced</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDisconnectGoogle}>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleConnectGoogle}
                  className="w-full gap-2"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4" />
                  Connect Google Calendar
                </Button>
              )}
            </div>

            {/* Option 2: Webhook/Zapier */}
            <div className="space-y-3 p-4 rounded-lg border border-border">
              <Label className="flex items-center gap-2 text-base font-medium">
                <Webhook className="h-4 w-4 text-muted-foreground" />
                CRM / Scheduling Software (Zapier)
              </Label>
              <p className="text-sm text-muted-foreground">
                Best if you use ServiceTitan, Jobber, HouseCall Pro, or any other software. We'll push appointments there via Zapier.
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
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
                <div className="flex items-center gap-2 text-sm text-success">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  Webhook configured
                </div>
              )}
            </div>

            {appointmentsEnabled && !hasAnySyncOption && (
              <Alert className="border-warning/50 bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-sm">
                  Without a sync option, appointments will be saved in your EverLaunch portal but not synced externally.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Availability & Settings Section */}
        <Card className={cn(!appointmentsEnabled && "opacity-60")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Availability & Settings
            </CardTitle>
            <CardDescription>
              Set your available hours and appointment preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!appointmentsEnabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Enable appointment booking above to edit these settings.
                </AlertDescription>
              </Alert>
            )}

            {/* Weekly Availability */}
            <div className="space-y-3">
              <Label>Weekly Availability</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => appointmentsEnabled && toggleDayAvailability(day)}
                    disabled={!appointmentsEnabled}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
                      availability[day]?.length > 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                      !appointmentsEnabled && "cursor-not-allowed"
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

            {/* Appointment Duration */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Appointment Length
              </Label>
              <Select 
                value={slotLength.toString()} 
                onValueChange={handleSlotLengthChange}
                disabled={!appointmentsEnabled}
              >
                <SelectTrigger className="w-full max-w-xs">
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

            {/* Reminders Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <Label className="font-medium">Send appointment reminder to customer</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Email reminders before scheduled appointments
                    </p>
                  </div>
                </div>
                <Switch
                  checked={sendReminders}
                  onCheckedChange={handleToggleReminders}
                  disabled={!appointmentsEnabled}
                />
              </div>

              {sendReminders && (
                <div className="space-y-2 pl-4">
                  <Label>Reminder Timing</Label>
                  <Select 
                    value={reminderOffset.toString()} 
                    onValueChange={handleReminderOffsetChange}
                    disabled={!appointmentsEnabled}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1440">24 hours before</SelectItem>
                      <SelectItem value="120">2 hours before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
