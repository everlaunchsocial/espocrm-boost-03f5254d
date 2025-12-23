import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { isRootReplicatedDomain, getAffiliateUsernameFromPath } from '@/utils/subdomainRouting';
import CustomerLandingPage from '@/pages/customer/CustomerLandingPage';
import CustomerCheckoutPage from '@/pages/customer/CustomerCheckoutPage';
import DemoRequestPage from '@/pages/customer/DemoRequestPage';
import CustomerBuySuccess from '@/pages/customer/CustomerBuySuccess';
import VerticalLandingPage from '@/pages/verticals/VerticalLandingPage';

interface SubdomainRouterProps {
  children: ReactNode;
}

// Reserved paths that should not be treated as affiliate usernames
const RESERVED_PATHS = [
  'auth', 'affiliate', 'affiliate-signup', 'admin', 'customer', 
  'buy', 'demo-request', 'checkout', 'product', 'biz', 'sales',
  'demo', 'demos', 'api', 'reset-password', 'unauthorized', 'partner', 'rep',
  'dashboard', 'calendar', 'email', 'contacts', 'accounts', 'leads', 'deals',
  'estimates', 'invoices', 'tasks', 'media-library', 'voice-demo', 'training', 'v',
  'not-found', 'logout', 'prospect-search', 'competitors', 'campaigns', 'email-templates',
  'documents', 'reports', 'executive-dashboard', 'integrations', 'billing', 'admin-panel',
  'privacy'
];

// Supported vertical landing page slugs
const VERTICAL_SLUGS = ['dentist', 'home-improvement', 'hvac', 'legal', 'real-estate', 'pest-control', 'network-marketing'];

/**
 * Wrapper component that intercepts requests on tryeverlaunch.com and routes to customer pages
 */
export function SubdomainRouter({ children }: SubdomainRouterProps) {
  const location = useLocation();
  const isReplicatedDomain = isRootReplicatedDomain();

  if (!isReplicatedDomain) {
    return <>{children}</>;
  }

  const path = location.pathname;
  const pathSegments = path.split('/').filter(Boolean);
  
  if (pathSegments.length === 0) {
    return <CustomerLandingPage />;
  }

  const firstSegment = pathSegments[0].toLowerCase();
  
  if (RESERVED_PATHS.includes(firstSegment)) {
    return <>{children}</>;
  }

  const affiliateUsername = getAffiliateUsernameFromPath(path);
  
  if (affiliateUsername) {
    const subPath = pathSegments.length > 1 ? pathSegments.slice(1).join('/') : '';
    
    // Check for vertical landing pages: /:username/sales/:vertical
    if (subPath.startsWith('sales/')) {
      const verticalSlug = subPath.replace('sales/', '');
      if (VERTICAL_SLUGS.includes(verticalSlug)) {
        return <VerticalLandingPage affiliateUsername={affiliateUsername} verticalSlug={verticalSlug} />;
      }
    }
    
    if (subPath === 'buy') {
      return <CustomerCheckoutPage />;
    }
    if (subPath === 'demo-request') {
      return <DemoRequestPage />;
    }
    if (subPath === 'customer/buy-success' || subPath === 'buy-success') {
      return <CustomerBuySuccess />;
    }
    return <CustomerLandingPage />;
  }

  return <>{children}</>;
}
