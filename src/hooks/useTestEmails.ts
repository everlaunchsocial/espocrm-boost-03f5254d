import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTestMode } from "./useTestMode";

interface EmailLink {
  all: string[];
  categorized: {
    onboarding: string[];
    verification: string[];
    login: string[];
    tracking: string[];
    other: string[];
  };
}

interface TestEmail {
  id: string;
  subject: string;
  from: string;
  to: string;
  sentAt: string;
  status: string;
  trackingId: string;
  bodyHtml: string;
  bodyText: string;
  links: EmailLink;
}

interface TestEmailsResponse {
  success: boolean;
  email: string;
  count: number;
  timeRange: {
    from: string;
    to: string;
  };
  emails: TestEmail[];
}

export function useTestEmails(email: string | null, minutesAgo = 30) {
  const { enabled, testKey } = useTestMode();
  
  return useQuery({
    queryKey: ['test-emails', email, minutesAgo],
    queryFn: async (): Promise<TestEmailsResponse | null> => {
      if (!email || !enabled || !testKey) {
        return null;
      }

      const { data, error } = await supabase.functions.invoke('get-test-emails', {
        headers: {
          'x-test-key': testKey,
        },
        body: null,
      });

      // Since we need query params, we'll construct the URL manually
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-test-emails?email=${encodeURIComponent(email)}&minutes=${minutesAgo}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-test-key': testKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch test emails');
      }

      return response.json();
    },
    enabled: !!email && enabled && !!testKey,
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
    staleTime: 2000,
  });
}

// Hook to get a specific link type from the most recent email
export function useOnboardingLink(email: string | null) {
  const { data } = useTestEmails(email);
  
  if (!data?.emails?.length) return null;
  
  const latestEmail = data.emails[0];
  const onboardingLinks = latestEmail.links.categorized.onboarding;
  
  return onboardingLinks.length > 0 ? onboardingLinks[0] : null;
}
