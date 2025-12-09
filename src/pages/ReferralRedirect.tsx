import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Handles /:username routes - checks if username is a valid affiliate
 * If valid: redirects to /affiliate-signup?ref={username}
 * If not: renders 404
 */
export default function ReferralRedirect() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isValidAffiliate, setIsValidAffiliate] = useState(false);

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
          setIsValidAffiliate(false);
        } else {
          setIsValidAffiliate(true);
          // Redirect to affiliate signup with ref parameter
          navigate(`/affiliate-signup?ref=${username}`, { replace: true });
          return;
        }
      } catch (err) {
        console.error('Error checking affiliate:', err);
        setIsValidAffiliate(false);
      }
      
      setChecking(false);
    }

    checkAffiliate();
  }, [username, navigate]);

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

  // If valid affiliate, redirect will happen in useEffect
  // If not valid, show 404
  if (!isValidAffiliate) {
    return <Navigate to="/not-found" replace />;
  }

  return null;
}
