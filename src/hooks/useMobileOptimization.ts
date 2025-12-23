import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Offline status hook
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Offline queue interface
interface OfflineAction {
  id: string;
  action_type: string;
  payload: Record<string, unknown>;
  status: string;
  created_at_client: string;
  synced_at: string | null;
  error_message: string | null;
  retry_count: number;
}

// Offline queue hook
export function useOfflineQueue() {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const { data: pendingActions = [] } = useQuery({
    queryKey: ['offline-queue'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('offline_queue')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at_client', { ascending: true });
      
      if (error) throw error;
      return data as OfflineAction[];
    },
  });

  const queueAction = useMutation({
    mutationFn: async ({ actionType, payload }: { actionType: string; payload: Record<string, unknown> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('offline_queue')
        .insert([{
          user_id: user.id,
          action_type: actionType,
          payload: payload as unknown as Json,
          created_at_client: new Date().toISOString(),
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-queue'] });
    },
  });

  const syncAction = useCallback(async (action: OfflineAction) => {
    try {
      const payload = action.payload as Record<string, unknown>;
      // Execute the action based on type
      switch (action.action_type) {
        case 'create_lead':
          await supabase.from('leads').insert([{
            first_name: String(payload.first_name || ''),
            last_name: String(payload.last_name || ''),
            email: payload.email as string,
            company: payload.company as string,
          }]);
          break;
        case 'update_lead':
          const { id, ...updates } = payload;
          await supabase.from('leads').update(updates).eq('id', String(id));
          break;
        case 'add_note':
          await supabase.from('lead_team_notes').insert([{
            lead_id: String(payload.lead_id),
            note_text: String(payload.note_text),
            created_by: String(payload.created_by),
          }]);
          break;
        case 'log_call':
          await supabase.from('call_logs').insert([{
            entity_type: String(payload.entity_type || 'lead'),
            transcript: String(payload.transcript || ''),
            lead_id: payload.lead_id as string,
          }]);
          break;
        default:
          throw new Error(`Unknown action type: ${action.action_type}`);
      }

      // Mark as synced
      await supabase
        .from('offline_queue')
        .update({ status: 'synced', synced_at: new Date().toISOString() })
        .eq('id', action.id);
      
      return true;
    } catch (error) {
      // Mark as failed
      await supabase
        .from('offline_queue')
        .update({ 
          status: 'failed', 
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: action.retry_count + 1,
        })
        .eq('id', action.id);
      
      return false;
    }
  }, []);

  const syncAllPending = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0) return;

    for (const action of pendingActions) {
      await syncAction(action);
    }
    
    queryClient.invalidateQueries({ queryKey: ['offline-queue'] });
  }, [isOnline, pendingActions, syncAction, queryClient]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncAllPending();
    }
  }, [isOnline, pendingActions.length, syncAllPending]);

  return { 
    pendingActions, 
    pendingCount: pendingActions.length,
    queueAction, 
    syncAllPending,
    isOnline,
  };
}

// Notification preferences
interface NotificationPreference {
  id: string;
  notification_type: string;
  enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
}

export const NOTIFICATION_TYPES = [
  { type: 'mention', label: 'Someone mentions you', category: 'Collaboration' },
  { type: 'team_note', label: 'Team note added to your leads', category: 'Collaboration' },
  { type: 'task_due', label: 'Task due in 1 hour', category: 'Tasks' },
  { type: 'task_overdue', label: 'Task overdue', category: 'Tasks' },
  { type: 'demo_viewed', label: 'Demo viewed', category: 'Lead Activity' },
  { type: 'email_opened', label: 'Email opened', category: 'Lead Activity' },
  { type: 'high_priority_update', label: 'High-priority lead update', category: 'Lead Activity' },
  { type: 'deal_closed', label: 'Deal closed by team', category: 'Team Updates' },
  { type: 'daily_digest', label: 'Daily summary (8am)', category: 'Digest' },
  { type: 'weekly_report', label: 'Weekly report (Monday 8am)', category: 'Digest' },
];

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as NotificationPreference[];
    },
  });

  const updatePreference = useMutation({
    mutationFn: async ({ 
      notificationType, 
      updates 
    }: { 
      notificationType: string; 
      updates: Partial<NotificationPreference>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          notification_type: notificationType,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,notification_type',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const getPreference = (type: string) => {
    return preferences.find(p => p.notification_type === type) || {
      notification_type: type,
      enabled: true,
      push_enabled: true,
      email_enabled: false,
      sms_enabled: false,
    };
  };

  return { preferences, isLoading, updatePreference, getPreference };
}

// Push subscription hook
export function usePushSubscription() {
  const queryClient = useQueryClient();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, [isSupported]);

  const subscribe = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) throw new Error('Permission denied');
      }

      // For now, store a placeholder - real push subscription needs service worker setup
      const { error } = await supabase
        .from('push_subscriptions')
        .insert([{
          user_id: user.id,
          endpoint: 'web-push-placeholder',
          keys: {},
          device_type: 'web',
          device_name: navigator.userAgent.slice(0, 50),
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
    },
  });

  return { isSupported, permission, requestPermission, subscribe };
}

// Pull-to-refresh hook
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  
  const threshold = 80;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY === 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    setPullDistance(Math.min(distance, threshold * 1.5));
  }, [startY, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setStartY(0);
    setPullDistance(0);
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isRefreshing, pullDistance, threshold };
}

// Device detection
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { deviceType, isTouchDevice, isMobile: deviceType === 'mobile' };
}
