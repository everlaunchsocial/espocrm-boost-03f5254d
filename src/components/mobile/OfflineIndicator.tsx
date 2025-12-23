import { useState, useEffect } from 'react';
import { WifiOff, CloudOff, RefreshCw, Check, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOfflineQueue, useOnlineStatus } from '@/hooks/useMobileOptimization';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { pendingCount, syncAllPending } = useOfflineQueue();
  const [dismissed, setDismissed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (!isOnline) setDismissed(false);
  }, [isOnline]);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncAllPending();
    setIsSyncing(false);
  };

  // Show offline banner
  if (!isOnline && !dismissed) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-destructive/90 text-destructive-foreground px-4 py-2 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            You're offline. Changes will sync when connection is restored.
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive-foreground hover:bg-destructive/80"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Show pending actions indicator
  if (isOnline && pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-warning/90 text-warning-foreground px-4 py-2 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <CloudOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            {pendingCount} action{pendingCount > 1 ? 's' : ''} pending sync
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Sync Now
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}

// Compact sync status badge for use in headers
export function SyncStatusBadge() {
  const isOnline = useOnlineStatus();
  const { pendingCount } = useOfflineQueue();

  if (!isOnline) {
    return (
      <Badge variant="destructive" className="gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  }

  if (pendingCount > 0) {
    return (
      <Badge variant="secondary" className="gap-1">
        <RefreshCw className="h-3 w-3 animate-spin" />
        {pendingCount} pending
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Check className="h-3 w-3" />
      Synced
    </Badge>
  );
}

// Toast-style sync notification
export function SyncToast({ 
  status, 
  message,
  onDismiss,
}: { 
  status: 'syncing' | 'success' | 'error'; 
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, onDismiss]);

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 z-50",
      status === 'syncing' && "bg-muted",
      status === 'success' && "bg-primary text-primary-foreground",
      status === 'error' && "bg-destructive text-destructive-foreground"
    )}>
      {status === 'syncing' && <RefreshCw className="h-4 w-4 animate-spin" />}
      {status === 'success' && <Check className="h-4 w-4" />}
      {status === 'error' && <AlertTriangle className="h-4 w-4" />}
      <span className="text-sm flex-1">{message}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
