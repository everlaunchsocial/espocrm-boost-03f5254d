import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

type ImpersonationType = 'affiliate' | 'customer' | null;

interface ImpersonationState {
  type: ImpersonationType;
  id: string | null;
  name: string | null;
}

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useUserRole();
  const [impersonation, setImpersonation] = useState<ImpersonationState>({
    type: null,
    id: null,
    name: null,
  });

  // Read from localStorage - called on mount and on every route change
  const syncFromStorage = useCallback(() => {
    // Check for affiliate impersonation
    const affiliateId = localStorage.getItem('impersonating_affiliate_id');
    const affiliateUsername = localStorage.getItem('impersonating_affiliate_username');
    
    if (affiliateId && affiliateUsername) {
      setImpersonation({
        type: 'affiliate',
        id: affiliateId,
        name: affiliateUsername,
      });
      return;
    }

    // Check for customer impersonation
    const customerId = localStorage.getItem('impersonating_customer_id');
    const customerName = localStorage.getItem('impersonating_customer_name');
    
    if (customerId && customerName) {
      setImpersonation({
        type: 'customer',
        id: customerId,
        name: customerName,
      });
      return;
    }

    // No impersonation
    setImpersonation({ type: null, id: null, name: null });
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
  if (!impersonation.type || role !== 'super_admin') {
    return null;
  }

  const handleExitView = async () => {
    // Log impersonation end
    if (impersonation.id && impersonation.name) {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        await supabase.from('impersonation_logs').insert({
          admin_user_id: user?.id,
          impersonated_affiliate_id: impersonation.type === 'affiliate' ? impersonation.id : null,
          impersonated_username: impersonation.name,
          action: 'end',
          user_agent: navigator.userAgent,
        });
      } catch (err) {
        console.error('Failed to log impersonation end:', err);
      }
    }

    // Clear based on type
    if (impersonation.type === 'affiliate') {
      localStorage.removeItem('impersonating_affiliate_id');
      localStorage.removeItem('impersonating_affiliate_username');
      navigate('/admin/affiliates');
    } else if (impersonation.type === 'customer') {
      localStorage.removeItem('impersonating_customer_id');
      localStorage.removeItem('impersonating_customer_name');
      navigate('/admin/customers');
    }

    setImpersonation({ type: null, id: null, name: null });
  };

  const label = impersonation.type === 'affiliate' ? 'Affiliate' : 'Customer';
  const bgColor = impersonation.type === 'affiliate' ? 'bg-orange-500' : 'bg-blue-500';
  const hoverColor = impersonation.type === 'affiliate' ? 'hover:bg-orange-600' : 'hover:bg-blue-600';

  return (
    <div className={`fixed top-0 left-0 right-0 z-[100] ${bgColor} text-white py-2 px-4 flex items-center justify-center gap-4 shadow-lg`}>
      <span className="font-medium">
        Viewing as {label}: <strong>{impersonation.name}</strong>
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExitView}
        className={`text-white ${hoverColor} hover:text-white gap-1`}
      >
        <X className="h-4 w-4" />
        Exit View
      </Button>
    </div>
  );
}
