import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isReplicatedSubdomain, isRootReplicatedDomain, getAffiliateUsernameFromSubdomain } from '@/utils/subdomainRouting';
import CustomerLandingPage from '@/pages/customer/CustomerLandingPage';
import CustomerCheckoutPage from '@/pages/customer/CustomerCheckoutPage';
import DemoRequestPage from '@/pages/customer/DemoRequestPage';
import CustomerBuySuccess from '@/pages/customer/CustomerBuySuccess';

interface SubdomainRouterProps {
  children: ReactNode;
}

/**
 * Wrapper component that intercepts subdomain/root domain requests and routes to customer pages
 * e.g., tryeverlaunch.com -> renders CustomerLandingPage without affiliate attribution
 * e.g., jimmy.tryeverlaunch.com -> renders CustomerLandingPage with affiliate attribution
 * e.g., jimmy.tryeverlaunch.com/buy -> renders CustomerCheckoutPage with affiliate attribution
 */
export function SubdomainRouter({ children }: SubdomainRouterProps) {
  const location = useLocation();
  const [routeType, setRouteType] = useState<'none' | 'root' | 'subdomain'>('none');
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (isRootReplicatedDomain()) {
      setRouteType('root');
      setUsername(null); // No affiliate for root domain
    } else if (isReplicatedSubdomain()) {
      setRouteType('subdomain');
      setUsername(getAffiliateUsernameFromSubdomain());
    }
  }, []);

  // Handle root domain (tryeverlaunch.com) - show customer pages without affiliate attribution
  if (routeType === 'root') {
    const path = location.pathname;

    if (path === '/buy') {
      return <CustomerCheckoutPage />;
    }
    if (path === '/demo-request') {
      return <DemoRequestPage />;
    }
    if (path === '/customer/buy-success') {
      return <CustomerBuySuccess />;
    }
    // Default: show landing page without affiliate
    if (path === '/' || path === '') {
      return <CustomerLandingPage />;
    }
  }

  // Handle subdomain (jimmy.tryeverlaunch.com) - show customer pages with affiliate attribution
  if (routeType === 'subdomain' && username) {
    const path = location.pathname;

    if (path === '/buy') {
      return <CustomerCheckoutPage />;
    }
    if (path === '/demo-request') {
      return <DemoRequestPage />;
    }
    if (path === '/customer/buy-success') {
      return <CustomerBuySuccess />;
    }
    // Default: show landing page with affiliate
    if (path === '/' || path === '') {
      return <CustomerLandingPage />;
    }
  }

  // Otherwise, render the normal app routes
  return <>{children}</>;
}
