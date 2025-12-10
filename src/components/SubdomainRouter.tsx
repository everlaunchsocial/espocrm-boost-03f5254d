import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isRootReplicatedDomain, getAffiliateUsernameFromPath } from '@/utils/subdomainRouting';
import CustomerLandingPage from '@/pages/customer/CustomerLandingPage';
import CustomerCheckoutPage from '@/pages/customer/CustomerCheckoutPage';
import DemoRequestPage from '@/pages/customer/DemoRequestPage';
import CustomerBuySuccess from '@/pages/customer/CustomerBuySuccess';

interface SubdomainRouterProps {
  children: ReactNode;
}

// Reserved paths that should not be treated as affiliate usernames
const RESERVED_PATHS = [
  'auth', 'affiliate', 'affiliate-signup', 'admin', 'customer', 
  'buy', 'demo-request', 'checkout', 'product', 'biz', 'sales',
  'demo', 'demos', 'api', 'reset-password', 'unauthorized', 'partner', 'rep'
];

/**
 * Wrapper component that intercepts requests on tryeverlaunch.com and routes to customer pages
 * Path-based affiliate routing:
 * e.g., tryeverlaunch.com -> renders CustomerLandingPage without affiliate attribution
 * e.g., tryeverlaunch.com/jimmy -> renders CustomerLandingPage with affiliate attribution
 * e.g., tryeverlaunch.com/jimmy/buy -> renders CustomerCheckoutPage with affiliate attribution
 */
export function SubdomainRouter({ children }: SubdomainRouterProps) {
  const location = useLocation();
  const [isReplicatedDomain, setIsReplicatedDomain] = useState(false);

  useEffect(() => {
    setIsReplicatedDomain(isRootReplicatedDomain());
  }, []);

  // Only handle routing on the replicated domain (tryeverlaunch.com)
  if (!isReplicatedDomain) {
    return <>{children}</>;
  }

  const path = location.pathname;
  const pathSegments = path.split('/').filter(Boolean);
  
  // Root path: show landing page without affiliate
  if (pathSegments.length === 0) {
    return <CustomerLandingPage />;
  }

  const firstSegment = pathSegments[0].toLowerCase();
  
  // Check if first segment is a reserved path - pass through to normal routing
  if (RESERVED_PATHS.includes(firstSegment)) {
    return <>{children}</>;
  }

  // First segment is an affiliate username
  const affiliateUsername = getAffiliateUsernameFromPath(path);
  
  if (affiliateUsername) {
    const subPath = pathSegments.length > 1 ? `/${pathSegments.slice(1).join('/')}` : '/';
    
    if (subPath === '/buy') {
      return <CustomerCheckoutPage />;
    }
    if (subPath === '/demo-request') {
      return <DemoRequestPage />;
    }
    if (subPath === '/customer/buy-success' || subPath === '/buy-success') {
      return <CustomerBuySuccess />;
    }
    // Default: show landing page with affiliate
    return <CustomerLandingPage />;
  }

  // Fallback: pass through to normal routing
  return <>{children}</>;
}
