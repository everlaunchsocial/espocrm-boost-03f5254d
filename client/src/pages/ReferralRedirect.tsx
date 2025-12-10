import { useParams, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { storeAffiliateAttribution } from '@/utils/affiliateAttribution';
import CustomerLandingPage from '@/pages/customer/CustomerLandingPage';

/**
 * Handles /:username routes - checks if username is a valid affiliate
 * If valid: shows CustomerLandingPage with affiliate attribution stored
 * If not: renders 404
 */
export default function ReferralRedirect() {
  const { username } = useParams<{ username: string }>();
  const [checking, setChecking] = useState(true);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAffiliate() {
      if (!username) {
        setChecking(false);
        return;
      }

      try {
        // Use the RPC function that bypasses RLS for public lookups
        const { data, error } = await supabase.rpc('get_affiliate_id_by_username', {
          p_username: username.toLowerCase()
        });

        if (error || !data) {
          setAffiliateId(null);
        } else {
          setAffiliateId(data);
          // Store affiliate attribution for customer purchases
          storeAffiliateAttribution(data);
        }
      } catch (err) {
        console.error('Error checking affiliate:', err);
        setAffiliateId(null);
      }
      
      setChecking(false);
    }

    checkAffiliate();
  }, [username]);

  // Still checking - show loading
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Valid affiliate - show customer sales page
  if (affiliateId) {
    return <CustomerLandingPage />;
  }

  // Invalid username - show 404
  return <Navigate to="/not-found" replace />;
}
