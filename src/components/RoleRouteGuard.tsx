import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthRole, AppRole, getRedirectPathForRole } from '@/hooks/useAuthRole';
import { useTestMode } from '@/hooks/useTestMode';

/**
 * Route guard that redirects users to the correct portal based on their role.
 * Prevents cross-portal access (e.g., affiliate accessing customer routes).
 * 
 * BYPASS: When test mode is enabled, all route guards are skipped to allow
 * automation tools like TestDriver.ai to navigate freely.
 */
export function RoleRouteGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isLoading, userId } = useAuthRole();
  const { enabled: testModeEnabled } = useTestMode();

  useEffect(() => {
    // BYPASS: Skip all route guards in test mode
    if (testModeEnabled) {
      console.log('[RoleRouteGuard] Test mode enabled - bypassing route guards');
      return;
    }

    // Don't redirect while loading or if not logged in
    if (isLoading || !userId || !role) {
      return;
    }

    const path = location.pathname;
    
    // Check if user is impersonating (super_admin viewing as affiliate)
    const isImpersonating = localStorage.getItem('impersonating_affiliate_id');
    
    // Skip role guard for super_admin when impersonating
    if (role === 'super_admin' && isImpersonating) {
      return;
    }

    // Define protected route prefixes
    const customerRoutes = ['/customer'];
    const affiliateRoutes = ['/affiliate'];
    const adminRoutes = ['/dashboard', '/admin', '/calendar', '/email', '/contacts', '/accounts', '/leads', '/deals', '/estimates', '/invoices', '/tasks', '/campaigns', '/competitors', '/email-templates', '/media-library', '/documents', '/reports', '/executive-dashboard', '/integrations', '/billing', '/admin-panel', '/voice-demo', '/demos', '/prospect-search'];
    
    // Public routes that don't need protection
    const publicRoutes = ['/auth', '/affiliate-signup', '/reset-password', '/demo/', '/v/', '/sales', '/checkout', '/biz', '/partner', '/unauthorized', '/not-found', '/privacy', '/logout', '/product', '/buy', '/demo-request', '/rep/', '/test-mode-entry'];
    
    // Check if current path is public
    const isPublicRoute = publicRoutes.some(r => path.startsWith(r)) || path === '/';
    if (isPublicRoute && path !== '/') {
      return;
    }

    // Route protection logic
    const isOnCustomerRoute = customerRoutes.some(r => path.startsWith(r));
    const isOnAffiliateRoute = affiliateRoutes.some(r => path.startsWith(r));
    const isOnAdminRoute = adminRoutes.some(r => path.startsWith(r)) || path === '/';

    // Affiliate trying to access customer routes
    if (role === 'affiliate' && isOnCustomerRoute) {
      console.log('[RoleRouteGuard] Affiliate redirected from customer route to /affiliate');
      navigate('/affiliate', { replace: true });
      return;
    }

    // Customer trying to access affiliate routes
    if (role === 'customer' && isOnAffiliateRoute) {
      console.log('[RoleRouteGuard] Customer redirected from affiliate route to /customer');
      navigate('/customer', { replace: true });
      return;
    }

    // Customer trying to access admin routes
    if (role === 'customer' && isOnAdminRoute) {
      console.log('[RoleRouteGuard] Customer redirected from admin route to /customer');
      navigate('/customer', { replace: true });
      return;
    }

    // Affiliate trying to access admin routes (except specific allowed ones)
    if (role === 'affiliate' && isOnAdminRoute) {
      console.log('[RoleRouteGuard] Affiliate redirected from admin route to /affiliate');
      navigate('/affiliate', { replace: true });
      return;
    }

  }, [role, isLoading, userId, location.pathname, navigate, testModeEnabled]);

  // This component doesn't render anything
  return null;
}
