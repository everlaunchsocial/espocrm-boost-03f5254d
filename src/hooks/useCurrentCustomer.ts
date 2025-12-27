import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentCustomer {
  id: string;
  user_id: string;
  business_name: string | null;
  contact_name: string | null;
  lead_email: string | null;
  phone: string | null;
}

// Helper to check if currently impersonating a customer
export function getCustomerImpersonationState() {
  const customerId = localStorage.getItem('impersonating_customer_id');
  const customerName = localStorage.getItem('impersonating_customer_name');
  return {
    isImpersonating: !!customerId,
    customerId,
    customerName,
  };
}

// Helper to clear customer impersonation
export function clearCustomerImpersonation() {
  localStorage.removeItem('impersonating_customer_id');
  localStorage.removeItem('impersonating_customer_name');
}

export function useCurrentCustomer() {
  const [customer, setCustomer] = useState<CurrentCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const fetchingRef = useRef(false);

  const fetchCustomer = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setCustomer(null);
        setIsLoading(false);
        return;
      }

      // Check if super_admin is impersonating a customer
      const impersonatingId = localStorage.getItem('impersonating_customer_id');
      
      if (impersonatingId) {
        // Verify user is super_admin before allowing impersonation
        const { data: roleData } = await supabase.rpc('get_my_global_role');
        
        if (roleData === 'super_admin') {
          // Fetch the impersonated customer's data
          const { data, error } = await supabase
            .from('customer_profiles')
            .select('id, user_id, business_name, contact_name, lead_email, phone')
            .eq('id', impersonatingId)
            .maybeSingle();

          if (error) {
            console.error('Error fetching impersonated customer:', error);
            clearCustomerImpersonation();
          } else if (data) {
            console.log('Impersonating customer:', data);
            setCustomer(data);
            setIsImpersonating(true);
            setIsLoading(false);
            return;
          }
        } else {
          // Not super_admin, clear impersonation
          clearCustomerImpersonation();
        }
      }

      // Normal flow: fetch logged-in user's customer record
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('id, user_id, business_name, contact_name, lead_email, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching customer:', error);
        setCustomer(null);
      } else if (data) {
        console.log('Customer loaded:', data);
        setCustomer(data);
      } else {
        setCustomer(null);
      }
      setIsImpersonating(false);
    } catch (err) {
      console.error('Exception fetching customer:', err);
      setCustomer(null);
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();

    // Listen for storage changes to detect impersonation changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'impersonating_customer_id') {
        fetchCustomer();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { 
    customer, 
    isLoading,
    customerId: customer?.id ?? null,
    isImpersonating,
    refetch: fetchCustomer,
  };
}
