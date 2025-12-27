import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StripeInvoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: string;
  pdfUrl: string | null;
}

export interface CustomerBillingInfo {
  customer: {
    id: string;
    paymentReceivedAt: string | null;
  };
  plan: {
    id: string;
    code: string;
    name: string;
    monthly_price: number;
    minutes_included: number;
    overage_rate: number;
  } | null;
  subscription: {
    hasActiveSubscription: boolean;
    subscriptionStatus: string | null;
    paymentMethodLast4: string | null;
    paymentMethodBrand: string | null;
    paymentMethodExpMonth: number | null;
    paymentMethodExpYear: number | null;
    nextBillingDate: string | null;
    nextBillingAmount: number | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    customerId: string | null;
  };
  invoices: StripeInvoice[];
}

export function useCustomerBillingInfo() {
  return useQuery({
    queryKey: ['customer-billing-info'],
    queryFn: async (): Promise<CustomerBillingInfo | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('get-customer-billing-info', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching customer billing info:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch billing info');
      }

      return data;
    },
  });
}

export function useCreateCustomerPortalSession() {
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-customer-portal-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error creating portal session:', error);
        throw error;
      }

      if (!data.success || !data.url) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      return data.url;
    },
    onSuccess: (url) => {
      window.open(url, '_blank');
    },
    onError: (error) => {
      toast.error('Failed to open billing portal. Please try again.');
      console.error('Portal session error:', error);
    },
  });
}
