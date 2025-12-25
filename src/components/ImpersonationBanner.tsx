import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useUserRole();
  const [impersonatingUsername, setImpersonatingUsername] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  // Read from localStorage - called on mount and on every route change
  const syncFromStorage = useCallback(() => {
    const username = localStorage.getItem('impersonating_affiliate_username');
    const id = localStorage.getItem('impersonating_affiliate_id');
    setImpersonatingUsername(username);
    setImpersonatingId(id);
  }, []);

  // Sync on mount
  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  // Re-sync on every route change to ensure banner persists
  useEffect(() => {
    syncFromStorage();
  }, [location.pathname, syncFromStorage]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncFromStorage]);

  // Only show banner if impersonating AND user is super_admin
  if (!impersonatingUsername || role !== 'super_admin') {
    return null;
  }

  const handleExitView = async () => {
    // Log impersonation end
    if (impersonatingId && impersonatingUsername) {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        await supabase.from('impersonation_logs').insert({
          admin_user_id: user?.id,
          impersonated_affiliate_id: impersonatingId,
          impersonated_username: impersonatingUsername,
          action: 'end',
          user_agent: navigator.userAgent,
        });
      } catch (err) {
        console.error('Failed to log impersonation end:', err);
      }
    }

    localStorage.removeItem('impersonating_affiliate_id');
    localStorage.removeItem('impersonating_affiliate_username');
    setImpersonatingUsername(null);
    setImpersonatingId(null);
    navigate('/admin/affiliates');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white py-2 px-4 flex items-center justify-center gap-4 shadow-lg">
      <span className="font-medium">
        Viewing as: <strong>{impersonatingUsername}</strong>
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExitView}
        className="text-white hover:bg-orange-600 hover:text-white gap-1"
      >
        <X className="h-4 w-4" />
        Exit View
      </Button>
    </div>
  );
}
