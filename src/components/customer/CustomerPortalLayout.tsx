import { ReactNode, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { SupportChatWidget } from '@/components/SupportChatWidget';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  CreditCard, 
  HelpCircle,
  LogOut,
  Menu,
  Eye,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const navItems = [
  { path: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customer/preview', label: 'Preview AI', icon: Eye },
  { path: '/customer/settings', label: 'Settings', icon: Settings },
  { path: '/customer/leads', label: 'Leads', icon: Users },
  { path: '/customer/billing', label: 'Billing', icon: CreditCard },
  { path: '/customer/support', label: 'Support', icon: HelpCircle },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        // Check if current path matches or is a sub-route of the nav item
        const isActive = location.pathname === item.path || 
          (item.path !== '/customer/dashboard' && location.pathname.startsWith(item.path));
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function CustomerPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isLoading: roleLoading, isCustomer } = useUserRole();
  const { isLoading: onboardingLoading, customerProfile, isOnboardingComplete } = useCustomerOnboarding();

  const isLoading = roleLoading || onboardingLoading;

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;

    // Non-customers cannot access customer portal
    if (!isCustomer) {
      return; // Will show "no access" message
    }

    // If onboarding not complete, redirect to wizard
    if (customerProfile && !isOnboardingComplete) {
      const step = customerProfile.onboarding_current_step || 1;
      navigate(`/customer/onboarding/wizard/${step}`);
      return;
    }

    // If at /customer root, redirect to dashboard
    if (location.pathname === '/customer') {
      navigate('/customer/dashboard');
    }
  }, [isLoading, isCustomer, customerProfile, isOnboardingComplete, location.pathname, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-64 border-r border-border bg-card p-4">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Non-customer access denied
  if (!isCustomer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Access Denied
          </h1>
          <p className="text-muted-foreground mb-6">
            You don't have access to the customer portal. This area is only available to customers with an active subscription.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
            <Button onClick={() => navigate('/')}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col">
        {/* Logo / Brand */}
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">
            EverLaunch AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer Portal
          </p>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <NavLinks />
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-border">
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground truncate">
              {customerProfile?.business_name || 'Your Business'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {customerProfile?.contact_name || 'Customer'}
            </p>
            {customerProfile?.id && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(customerProfile.id);
                  toast.success('Customer ID copied');
                }}
                className="flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Click to copy full ID"
              >
                <span className="font-mono">ID: {customerProfile.id.slice(0, 8)}...</span>
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-card z-50 flex items-center justify-between px-4">
        <h1 className="text-lg font-bold text-foreground">EverLaunch AI</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="p-4 border-b border-border">
              <h1 className="text-xl font-bold text-foreground">
                EverLaunch AI
              </h1>
              <p className="text-sm text-muted-foreground">
                Customer Portal
              </p>
            </div>
            <div className="p-4">
              <NavLinks />
            </div>
            <div className="p-4 border-t border-border mt-auto">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-0 mt-14 md:mt-0">
        <Outlet />
      </main>

      {/* Support Chat Widget */}
      <SupportChatWidget userRole="customer" />
    </div>
  );
}
