import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Settings, Bell, Shield, Database, AlertCircle, Mic, Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { useVoiceSummaryPreferences } from '@/hooks/useVoiceSummaryPreferences';
import { useState, useEffect } from 'react';

export default function AdminSettings() {
  const { isAdmin, isLoading } = useUserRole();
  const navigate = useNavigate();
  const { 
    preferences, 
    isLoading: prefsLoading, 
    updatePreferences, 
    isUpdating 
  } = useVoiceSummaryPreferences();

  const [enableVoiceSummary, setEnableVoiceSummary] = useState(true);
  const [deliveryTime, setDeliveryTime] = useState('09:00');
  const [includeFollowups, setIncludeFollowups] = useState(true);

  // Sync local state with preferences
  useEffect(() => {
    if (preferences) {
      setEnableVoiceSummary(preferences.enable_voice_summary ?? true);
      // Convert time string (HH:MM:SS) to input format (HH:MM)
      const time = preferences.summary_delivery_time?.substring(0, 5) ?? '09:00';
      setDeliveryTime(time);
      setIncludeFollowups(preferences.include_followup_reminders ?? true);
    }
  }, [preferences]);

  const handleSaveVoicePreferences = () => {
    updatePreferences({
      enable_voice_summary: enableVoiceSummary,
      summary_delivery_time: `${deliveryTime}:00`, // Add seconds
      include_followup_reminders: includeFollowups,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium">Access Denied</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          You must be an admin to access this page.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">System configuration and preferences</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Voice Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Summary
            </CardTitle>
            <CardDescription>
              Configure your daily voice executive summary preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable-voice-summary">Enable daily voice summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a voice summary of your daily activity
                    </p>
                  </div>
                  <Switch 
                    id="enable-voice-summary"
                    checked={enableVoiceSummary}
                    onCheckedChange={setEnableVoiceSummary}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="delivery-time">Delivery time</Label>
                    <p className="text-sm text-muted-foreground">
                      When to receive your daily summary
                    </p>
                  </div>
                  <Input
                    id="delivery-time"
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-32"
                    disabled={!enableVoiceSummary}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include-followups">Include follow-up reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Add pending follow-ups to your summary
                    </p>
                  </div>
                  <Switch 
                    id="include-followups"
                    checked={includeFollowups}
                    onCheckedChange={setIncludeFollowups}
                    disabled={!enableVoiceSummary}
                  />
                </div>

                <Button 
                  onClick={handleSaveVoicePreferences} 
                  disabled={isUpdating}
                  className="mt-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Preferences'
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts for important events
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>New Affiliate Signups</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new affiliates join
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Commission Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Alerts for large commission transactions
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Security and access settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Auto-logout after inactivity
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System
            </CardTitle>
            <CardDescription>
              System maintenance and data management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline">Export All Data</Button>
            <p className="text-sm text-muted-foreground">
              Download a complete backup of all system data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
