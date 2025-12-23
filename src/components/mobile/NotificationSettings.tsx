import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  useNotificationPreferences, 
  usePushSubscription,
  NOTIFICATION_TYPES,
} from '@/hooks/useMobileOptimization';
import { toast } from 'sonner';

export function NotificationSettings() {
  const { preferences, getPreference, updatePreference } = useNotificationPreferences();
  const { isSupported, permission, requestPermission, subscribe } = usePushSubscription();

  const handleEnablePush = async () => {
    if (permission === 'granted') {
      await subscribe.mutateAsync();
      toast.success('Push notifications enabled');
    } else {
      const granted = await requestPermission();
      if (granted) {
        await subscribe.mutateAsync();
        toast.success('Push notifications enabled');
      } else {
        toast.error('Permission denied for notifications');
      }
    }
  };

  const groupedTypes = NOTIFICATION_TYPES.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof NOTIFICATION_TYPES>);

  return (
    <div className="space-y-6">
      {/* Push notification setup */}
      {isSupported && permission !== 'granted' && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Enable Push Notifications</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Stay on top of your leads with real-time notifications
              </p>
              <Button size="sm" className="mt-3" onClick={handleEnablePush}>
                Enable Notifications
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Notification preferences by category */}
      {Object.entries(groupedTypes).map(([category, types]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {category}
          </h3>
          <Card className="divide-y divide-border">
            {types.map((type) => {
              const pref = getPreference(type.type);
              return (
                <div key={type.type} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">{type.label}</span>
                    <Switch
                      checked={pref.enabled}
                      onCheckedChange={(enabled) => 
                        updatePreference.mutate({ 
                          notificationType: type.type, 
                          updates: { enabled } 
                        })
                      }
                    />
                  </div>
                  {pref.enabled && (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={pref.push_enabled}
                          onChange={(e) => 
                            updatePreference.mutate({ 
                              notificationType: type.type, 
                              updates: { push_enabled: e.target.checked } 
                            })
                          }
                          className="h-3.5 w-3.5 rounded border-input"
                        />
                        <Smartphone className="h-3 w-3" />
                        Push
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={pref.email_enabled}
                          onChange={(e) => 
                            updatePreference.mutate({ 
                              notificationType: type.type, 
                              updates: { email_enabled: e.target.checked } 
                            })
                          }
                          className="h-3.5 w-3.5 rounded border-input"
                        />
                        <Mail className="h-3 w-3" />
                        Email
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={pref.sms_enabled}
                          onChange={(e) => 
                            updatePreference.mutate({ 
                              notificationType: type.type, 
                              updates: { sms_enabled: e.target.checked } 
                            })
                          }
                          className="h-3.5 w-3.5 rounded border-input"
                        />
                        <MessageSquare className="h-3 w-3" />
                        SMS
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </div>
      ))}
    </div>
  );
}
