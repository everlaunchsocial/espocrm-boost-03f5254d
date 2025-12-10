import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isReplicatedSubdomain, getAffiliateUsernameFromSubdomain } from '@/utils/subdomainRouting';
import CustomerLandingPage from '@/pages/customer/CustomerLandingPage';
import CustomerCheckoutPage from '@/pages/customer/CustomerCheckoutPage';
import DemoRequestPage from '@/pages/customer/DemoRequestPage';
import CustomerBuySuccess from '@/pages/customer/CustomerBuySuccess';

interface SubdomainRouterProps {
  children: ReactNode;
}

/**
 * Wrapper component that intercepts subdomain requests and routes to customer pages
 * e.g., jimmy.tryeverlaunch.com -> renders CustomerLandingPage with affiliate attribution
 * e.g., jimmy.tryeverlaunch.com/buy -> renders CustomerCheckoutPage with affiliate attribution
 */
export function SubdomainRouter({ children }: SubdomainRouterProps) {
  const location = useLocation();
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (isReplicatedSubdomain()) {
      const affiliateUsername = getAffiliateUsernameFromSubdomain();
      setIsSubdomain(true);
      setUsername(affiliateUsername);
    }
  }, []);

  // If we're on a subdomain, handle routing for customer pages
  if (isSubdomain && username) {
    const path = location.pathname;

    // Route to appropriate page based on path
    if (path === '/buy') {
      return <CustomerCheckoutPage />;
    }
    if (path === '/demo-request') {
      return <DemoRequestPage />;
    }
    if (path === '/customer/buy-success') {
      return <CustomerBuySuccess />;
    }
    // Default: show landing page
    if (path === '/' || path === '') {
      return <CustomerLandingPage />;
    }
  }

  // Otherwise, render the normal app routes
  return <>{children}</>;
}
